import type { SocialAccount } from './media.helpers.ts';

export type SyncTimestampProps = { value: string | null; syncing?: boolean };
export type SyncTimestamp = { iso: string; label: string };

export function syncTimestamp(value: string | null): SyncTimestamp | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  const date = new Date(value);
  return {
    iso: date.toISOString(),
    label: new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date)
  };
}

export function syncStatusAccounts(accounts: SocialAccount[]): SocialAccount[] {
  return accounts.filter(
    account => account.status !== 'disconnected' || syncTimestamp(account.last_synced_at)
  );
}

export function syncAccountNotice(account: SocialAccount): string {
  if (account.status === 'disconnected') return 'Disconnected';
  if (account.status === 'reconnect_required') return 'Reconnect to refresh';
  return account.last_error ? 'Sync needs attention' : '';
}
