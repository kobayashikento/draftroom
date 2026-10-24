'use client';
import type { WorkspaceSnapshot, WorkspaceUpdater } from '../../lib/types.ts';
import type { ReactNode } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';
type CloudWorkspaceProps = { client: SupabaseClient<Database>; session: Session; children: ReactNode };

import { useEffect, useRef, useState } from 'react';
import { seed } from '../../lib/model.ts';
import { getSupabaseConfig } from '../../lib/supabase.ts';
import {
  readLegacyWorkspace,
  workspaceCacheKey,
  downloadWorkspace,
} from '../../lib/workspace-data.ts';
import { createWorkspaceRepository } from '../../lib/workspace-repository.ts';
import { WorkspaceSync } from '../../lib/workspace-sync.ts';
import WorkspaceProblem from '../account/workspace-problem';
import SignOutConfirmation from '../account/sign-out-confirmation';
import WorkspaceContext from './workspace-context';

export default function CloudWorkspace({ client, session, children }: CloudWorkspaceProps) {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [signOutRequested, setSignOutRequested] = useState(false);
  const engine = useRef<WorkspaceSync | null>(null);

  useEffect(() => {
    let active = true;
    const sync = new WorkspaceSync({
      repository: createWorkspaceRepository(client, session.user.id),
      storage: localStorage,
      cacheKey: workspaceCacheKey(getSupabaseConfig()!.url, session.user.id),
      onChange: (value) => {
        if (active) setSnapshot(value);
      },
    });
    engine.current = sync;
    setSnapshot(null);
    setLoadError('');
    sync
      .start(() => readLegacyWorkspace(localStorage) || seed())
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    const refresh = () => {
      if (sync.data) void sync.refresh();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (sync.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
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
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) setLoadError('Could not sign out. Check your connection and try again.');
  }
  async function signOut() {
    if (engine.current?.dirty && !(await engine.current.flush())) setSignOutRequested(true);
    else await signOutNow();
  }
  const update: WorkspaceUpdater = (fn) => {
    const sync = engine.current;
    if (!sync?.data) return;
    const draft = structuredClone(sync.data);
    fn(draft);
    sync.change(draft);
  };
  if (loadError)
    return (
      <WorkspaceProblem
        message={loadError}
        retry={() => setAttempt((value) => value + 1)}
        signOut={signOutNow}
      />
    );
  const labels = {
    loading: 'Loading your workspace',
    pending: 'Changes waiting to sync',
    saving: 'Saving to cloud…',
    saved: 'Saved to cloud',
    error: 'Cloud sync needs attention',
    conflict: 'Choose a version to keep',
  };
  return (
    <WorkspaceContext
      state={snapshot?.data || null}
      update={update}
      storageStatus={labels[snapshot?.status || 'loading']}
      storageTone={snapshot?.status || 'loading'}
      cloud
      authUser={session.user}
      signOut={signOut}
      syncError={snapshot?.error}
      cacheError={snapshot?.cacheError}
      conflict={snapshot?.conflict}
      retrySync={() => engine.current!.refresh()}
      resolveConflict={(choice) => engine.current!.resolve(choice)}
    >
      {children}
      {signOutRequested && (
        <SignOutConfirmation
          onClose={() => setSignOutRequested(false)}
          onConfirm={signOutNow}
          cacheError={snapshot?.cacheError}
          exportData={() => engine.current?.data && downloadWorkspace(engine.current.data)}
        />
      )}
    </WorkspaceContext>
  );
}
