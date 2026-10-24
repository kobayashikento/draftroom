import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import type {
  Workspace,
  Item,
  WorkspaceUpdater,
  WorkspaceModal,
  EditorTab,
  WorkspaceRow,
  ConflictChoice,
  StorageStatus,
} from '../../lib/types.ts';
export type WorkspaceAccount = {
  cloud?: boolean;
  authUser?: User;
  signOut?: () => Promise<void>;
  syncError?: string;
  cacheError?: string;
  conflict?: WorkspaceRow | null;
  retrySync?: () => Promise<void>;
  resolveConflict?: (choice: ConflictChoice) => Promise<void>;
};
export type WorkspaceContextProps = WorkspaceAccount & {
  children: ReactNode;
  state: Workspace | null;
  update: WorkspaceUpdater;
  storageStatus: string;
  storageTone: StorageStatus | 'local';
};
export type WorkspaceContextValue = WorkspaceAccount & {
  state: Workspace | null;
  update: WorkspaceUpdater;
  updateItem: (id: string, change: (item: Item) => void) => void;
  storageStatus: string;
  storageTone: StorageStatus | 'local';
  message: string;
  notify: (text: string) => void;
  modal: WorkspaceModal | null;
  setModal: Dispatch<SetStateAction<WorkspaceModal | null>>;
  open: (id: string, tab?: EditorTab) => void;
};
