'use client';
import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {seed} from '../lib/model.js';
import {getSupabaseClient, getSupabaseConfig} from '../lib/supabase.js';
import {LEGACY_STORAGE_KEY, readLegacyWorkspace, workspaceCacheKey, downloadWorkspace} from '../lib/workspace-data.js';
import {createWorkspaceRepository} from '../lib/workspace-repository.js';
import {WorkspaceSync} from '../lib/workspace-sync.js';
import {AccountShell, SignIn, WorkspaceProblem, SignOutConfirmation} from './account';

const Context = createContext(null);
export const useWorkspace = () => useContext(Context);

function WorkspaceContext({children, state, update, storageStatus, storageTone, ...account}) {
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const updateItem = (id, fn) => update(draft => {
    const item = draft.items.find(item => item.id === id);
    if (item) { fn(item); item.updatedAt = new Date().toISOString(); }
  });
  const notify = text => { setMessage(text); clearTimeout(timer.current); timer.current = setTimeout(() => setMessage(''), 3500); };
  const open = (id, tab = 'Storyboard') => setModal({type: 'content', id, tab});
  return <Context.Provider value={{state, update, updateItem, storageStatus, storageTone, message, notify, modal, setModal, open, ...account}}>{children}</Context.Provider>;
}

function LocalWorkspace({children}) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [storageStatus, setStorageStatus] = useState('Loading draftroom');
  function load() {
    try { setState(readLegacyWorkspace(localStorage) || seed()); setError(''); }
    catch { setError('Your browser drafts could not be read. The saved data has been preserved.'); }
  }
  useEffect(load, []);
  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state)); setStorageStatus('Saved on this browser'); }
    catch { setStorageStatus('Not saved · export a backup'); }
  }, [state]);
  if (error) return <WorkspaceProblem message={error} retry={load}/>;
  const update = fn => setState(previous => { const draft = structuredClone(previous); fn(draft); return draft; });
  return <WorkspaceContext state={state} update={update} storageStatus={storageStatus} storageTone="local" cloud={false}>{children}</WorkspaceContext>;
}

function CloudWorkspace({client, session, children}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [signOutRequested, setSignOutRequested] = useState(false);
  const engine = useRef(null);

  useEffect(() => {
    let active = true;
    const sync = new WorkspaceSync({
      repository: createWorkspaceRepository(client, session.user.id),
      storage: localStorage,
      cacheKey: workspaceCacheKey(getSupabaseConfig().url, session.user.id),
      onChange: value => { if (active) setSnapshot(value); },
    });
    engine.current = sync;
    setSnapshot(null);
    setLoadError('');
    sync.start(() => readLegacyWorkspace(localStorage) || seed()).catch(error => {
      if (active) setLoadError(error.message);
    });
    const refresh = () => { if (sync.data) void sync.refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const warn = event => { if (sync.dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      sync.dispose();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [client, session.user.id, attempt]);

  async function signOutNow() {
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error) setLoadError('Could not sign out. Check your connection and try again.');
  }
  async function signOut() {
    if (engine.current?.dirty && !await engine.current.flush()) setSignOutRequested(true);
    else await signOutNow();
  }
  const update = fn => {
    const sync = engine.current;
    if (!sync?.data) return;
    const draft = structuredClone(sync.data);
    fn(draft);
    sync.change(draft);
  };
  if (loadError) return <WorkspaceProblem message={loadError} retry={() => setAttempt(value => value + 1)} signOut={signOutNow}/>;
  const labels = {loading: 'Loading your workspace', pending: 'Changes waiting to sync', saving: 'Saving to cloud…', saved: 'Saved to cloud', error: 'Cloud sync needs attention', conflict: 'Choose a version to keep'};
  return <WorkspaceContext state={snapshot?.data || null} update={update}
    storageStatus={labels[snapshot?.status || 'loading']} storageTone={snapshot?.status || 'loading'}
    cloud authUser={session.user} signOut={signOut} syncError={snapshot?.error} cacheError={snapshot?.cacheError}
    conflict={snapshot?.conflict} retrySync={() => engine.current.refresh()} resolveConflict={choice => engine.current.resolve(choice)}>
    {children}
    {signOutRequested && <SignOutConfirmation onClose={() => setSignOutRequested(false)} onConfirm={signOutNow}
      cacheError={snapshot?.cacheError} exportData={() => downloadWorkspace(engine.current.data)}/>}
  </WorkspaceContext>;
}

function AuthenticatedWorkspace({client, children}) {
  const [auth, setAuth] = useState({loading: true, session: null, error: ''});
  useEffect(() => {
    let active = true;
    let observed = false;
    // Keep this callback synchronous; Supabase performs session refresh under a lock.
    const {data: {subscription}} = client.auth.onAuthStateChange((_event, session) => {
      observed = true;
      if (active) setAuth({loading: false, session, error: ''});
    });
    client.auth.getSession().then(({data, error}) => {
      if (active && !observed) setAuth({loading: false, session: data.session, error: error ? 'Please sign in again to open your workspace.' : ''});
    }).catch(() => { if (active) setAuth({loading: false, session: null, error: 'Please sign in again to open your workspace.'}); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);
  if (auth.loading) return <AccountShell title="Opening draftroom…"/>;
  if (!auth.session) return <SignIn client={client} sessionError={auth.error}/>;
  return <CloudWorkspace key={auth.session.user.id} client={client} session={auth.session}>{children}</CloudWorkspace>;
}

export function WorkspaceProvider({children}) {
  let client;
  try { client = getSupabaseClient(); }
  catch (error) { return <WorkspaceProblem message={error.message} retry={() => window.location.reload()}/>; }
  return client ? <AuthenticatedWorkspace client={client}>{children}</AuthenticatedWorkspace> : <LocalWorkspace>{children}</LocalWorkspace>;
}
