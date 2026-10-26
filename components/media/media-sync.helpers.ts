import type { SocialAccount, SocialPlatform } from './media.helpers.ts';

export type MediaSyncReason = 'open' | 'posted';
export type MediaSyncQueue = Map<SocialPlatform, MediaSyncReason>;
export type MediaSyncRequest = { platform: SocialPlatform; reason: MediaSyncReason };
export type MediaSyncLibrary = {
  accounts: SocialAccount[];
  loading: boolean;
  refreshing: boolean;
  busy: string;
  error: string;
  sync: (platform: SocialPlatform) => Promise<void>;
};

export const APP_OPEN_SYNC_BUFFER_MS = 60 * 60 * 1000;

export function appOpenSyncDue(account: SocialAccount, now = Date.now()): boolean {
  if (account.status !== 'connected') return false;
  const lastSynced = account.last_synced_at ? Date.parse(account.last_synced_at) : NaN;
  return !Number.isFinite(lastSynced) || now - lastSynced > APP_OPEN_SYNC_BUFFER_MS;
}

export function nextMediaSyncRequest(
  pending: MediaSyncQueue,
  accounts: SocialAccount[],
  now = Date.now()
): MediaSyncRequest | null {
  for (const [platform, reason] of pending) {
    pending.delete(platform);
    const account = accounts.find(account => account.platform === platform);
    if (account?.status === 'connected' && (reason === 'posted' || appOpenSyncDue(account, now)))
      return { platform, reason };
  }
  return null;
}
