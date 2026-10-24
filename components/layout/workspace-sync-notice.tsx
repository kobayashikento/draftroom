'use client';

import { useWorkspace } from '../workspace/workspace-context';
import SyncNotice from '../account/sync-notice';
import { downloadWorkspace } from '../../lib/workspace-data.ts';

export default function WorkspaceSyncNotice() {
  const { state, cloud, syncError, cacheError, conflict, retrySync, resolveConflict } =
    useWorkspace();
  return (
    <SyncNotice
      cloud={cloud}
      error={syncError}
      cacheError={cacheError}
      conflict={conflict}
      retry={retrySync}
      resolve={resolveConflict}
      exportData={() => downloadWorkspace(state)}
    />
  );
}
