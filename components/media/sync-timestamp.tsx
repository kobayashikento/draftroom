import { RefreshCw } from 'lucide-react';
import { AppIcon } from '../icons';
import { syncTimestamp } from './sync-status.helpers.ts';
import type { SyncTimestampProps } from './sync-status.helpers.ts';

export default function SyncTimestamp({ value, syncing = false }: SyncTimestampProps) {
  const timestamp = syncTimestamp(value);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {syncing && (
        <span className="inline-flex items-center gap-1">
          <AppIcon icon={RefreshCw} className="motion-safe:animate-spin" />
          Syncing…
        </span>
      )}
      <span>
        {timestamp ? (
          <>
            Last synced <time dateTime={timestamp.iso}>{timestamp.label}</time>
          </>
        ) : (
          'Not synced yet'
        )}
      </span>
    </span>
  );
}
