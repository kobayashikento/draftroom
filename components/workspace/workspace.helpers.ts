import type {
  Item,
  Task,
  Workspace,
  WorkspaceUpdater,
  WorkspaceModal,
  EditorTab,
  WorkspaceRow,
  ConflictChoice,
  StorageStatus,
  CacheStorage,
  ItemChange,
  ItemUpdater,
  Publication
} from '../../lib/types.ts';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { seed } from '../../lib/model.ts';
import { readLegacyWorkspace, LEGACY_STORAGE_KEY } from '../../lib/workspace-data.ts';
import { completedTaskCount } from '../production/production.helpers.ts';

export type AuthState = { loading: boolean; session: Session | null; error: string };
export type ContentCardDetails = { series?: string; dates: Publication[]; done: number };

export const storageLabels: Record<StorageStatus, string> = {
  loading: 'Loading your workspace',
  pending: 'Changes waiting to sync',
  saving: 'Saving to cloud…',
  saved: 'Saved to cloud',
  error: 'Cloud sync needs attention',
  conflict: 'Choose a version to keep'
};

export function changeWorkspace(state: Workspace, change: (draft: Workspace) => void): Workspace {
  const draft = structuredClone(state);
  change(draft);
  return draft;
}

export function changeWorkspaceItem(
  state: Workspace,
  id: string,
  change: ItemChange,
  timestamp = new Date().toISOString()
): void {
  const item = state.items.find(item => item.id === id);
  if (!item) return;
  change(item);
  item.updatedAt = timestamp;
}

export function contentCardDetails(state: Workspace, item: Item): ContentCardDetails {
  return {
    series: state.series.find(series => series.id === item.seriesId)?.name,
    dates: item.publications.filter(plan => plan.date).sort((a, b) => a.date.localeCompare(b.date)),
    done: completedTaskCount(item)
  };
}

export function loadBrowserWorkspace(storage: CacheStorage): Workspace {
  return readLegacyWorkspace(storage) || seed();
}

export function saveBrowserWorkspace(storage: CacheStorage, state: Workspace): string {
  try {
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state));
    return 'Saved on this browser';
  } catch {
    return 'Not saved · export a backup';
  }
}

export type ArtworkProps = { item: Item };

export type AuthenticatedWorkspaceProps = { client: SupabaseClient<Database>; children: ReactNode };

export type CloudWorkspaceProps = {
  client: SupabaseClient<Database>;
  session: Session;
  children: ReactNode;
};

export type ContentCardProps = { item: Item };

export type LocalWorkspaceProps = { children: ReactNode };

export type StagePillProps = { item: Item };

export type TaskRowProps = { item: Item; task: Task; prioritizable?: boolean };

export type WorkspaceProviderProps = { children: ReactNode };

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
export type WorkspacePlanning = {
  week: string;
  setWeek: Dispatch<SetStateAction<string>>;
  platform: string;
  setPlatform: Dispatch<SetStateAction<string>>;
};

export type WorkspaceContextValue = WorkspaceAccount &
  WorkspacePlanning & {
    state: Workspace | null;
    update: WorkspaceUpdater;
    updateItem: ItemUpdater;
    storageStatus: string;
    storageTone: StorageStatus | 'local';
    message: string;
    notify: (text: string) => void;
    modal: WorkspaceModal | null;
    setModal: Dispatch<SetStateAction<WorkspaceModal | null>>;
    open: (id: string, tab?: EditorTab) => void;
  };
