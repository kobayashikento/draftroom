'use client';

import { changeWorkspaceItem } from './workspace.helpers.ts';
import type { WorkspaceContextProps, WorkspaceContextValue } from './workspace.helpers.ts';
import type { WorkspaceModal, Item, EditorTab } from '../../lib/types.ts';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const Context = createContext<WorkspaceContextValue | null>(null);
export function useWorkspaceContext() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace context is unavailable.');
  return value;
}
export function useWorkspace() {
  const value = useWorkspaceContext();
  const state = value.state;
  if (!state) throw new Error('Workspace is still loading.');
  return { ...value, state };
}

export default function WorkspaceContext({
  children,
  state,
  update,
  storageStatus,
  storageTone,
  ...account
}: WorkspaceContextProps) {
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<WorkspaceModal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const updateItem = (id: string, fn: (item: Item) => void) =>
    update(draft => changeWorkspaceItem(draft, id, fn));
  const notify = (text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 3500);
  };
  const open = (id: string, tab: EditorTab = 'Storyboard') =>
    setModal({ type: 'content', id, tab });
  return (
    <Context.Provider
      value={{
        state,
        update,
        updateItem,
        storageStatus,
        storageTone,
        message,
        notify,
        modal,
        setModal,
        open,
        ...account
      }}
    >
      {children}
    </Context.Provider>
  );
}
