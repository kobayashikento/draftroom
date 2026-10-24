'use client';

import {
  loadBrowserWorkspace,
  saveBrowserWorkspace,
  changeWorkspace
} from './workspace.helpers.ts';
import type { LocalWorkspaceProps } from './workspace.helpers.ts';
import type { Workspace, WorkspaceUpdater } from '../../lib/types.ts';
import { useEffect, useState } from 'react';
import WorkspaceProblem from '../account/workspace-problem';
import WorkspaceContext from './workspace-context';

export default function LocalWorkspace({ children }: LocalWorkspaceProps) {
  const [state, setState] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [storageStatus, setStorageStatus] = useState('Loading draftroom');
  function load() {
    try {
      setState(loadBrowserWorkspace(localStorage));
      setError('');
    } catch {
      setError('Your browser drafts could not be read. The saved data has been preserved.');
    }
  }
  useEffect(load, []);
  useEffect(() => {
    if (!state) return;
    setStorageStatus(saveBrowserWorkspace(localStorage, state));
  }, [state]);
  if (error) return <WorkspaceProblem message={error} retry={load} />;
  const update: WorkspaceUpdater = fn =>
    setState(previous => {
      if (!previous) return previous;
      return changeWorkspace(previous, fn);
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
