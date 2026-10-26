'use client';

import { PlatformIcon } from '../icons';
import { useMedia } from './media-context';
import { syncAccountNotice, syncStatusAccounts } from './sync-status.helpers.ts';
import SyncTimestamp from './sync-timestamp';

export default function SocialSyncStatus() {
  const library = useMedia();
  const accounts = syncStatusAccounts(library.accounts);
  if (library.loading || !accounts.length) return null;
  return (
    <div
      className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted"
      role="status"
      aria-label="Social data freshness"
    >
      {accounts.map(account => (
        <div key={account.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 font-medium">
            <PlatformIcon platform={account.platform} />
            {account.platform}
          </span>
          <SyncTimestamp
            value={account.last_synced_at}
            syncing={library.busy === `Syncing ${account.platform}`}
          />
          {syncAccountNotice(account) && <span>({syncAccountNotice(account)})</span>}
        </div>
      ))}
    </div>
  );
}
