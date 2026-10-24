'use client';
import type { Workspace, WorkspaceUpdater } from '../../lib/types.ts';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { seed } from '../../lib/model.ts';
import { LEGACY_STORAGE_KEY, readLegacyWorkspace } from '../../lib/workspace-data.ts';
import WorkspaceProblem from '../account/workspace-problem';
import WorkspaceContext from './workspace-context';

type LocalWorkspaceProps = { children: ReactNode };

export default function LocalWorkspace({ children }: LocalWorkspaceProps) {
  const [state, setState] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [storageStatus, setStorageStatus] = useState('Loading draftroom');
  function load() {
    try {
      setState(readLegacyWorkspace(localStorage) || seed());
      setError('');
    } catch {
      setError('Your browser drafts could not be read. The saved data has been preserved.');
    }
  }
  useEffect(load, []);
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state));
      setStorageStatus('Saved on this browser');
    } catch {
      setStorageStatus('Not saved · export a backup');
    }
  }, [state]);
  if (error) return <WorkspaceProblem message={error} retry={load} />;
  const update: WorkspaceUpdater = (fn) =>
    setState((previous) => {
      if (!previous) return previous;
      const draft = structuredClone(previous);
      fn(draft);
      return draft;
    });
  return (
    <WorkspaceContext
      state={state}
      update={update}
      storageStatus={storageStatus}
      storageTone="local"
      cloud={false}
    >
      {children}
    </WorkspaceContext>
  );
}
