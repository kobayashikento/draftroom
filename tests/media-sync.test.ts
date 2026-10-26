import assert from 'node:assert/strict';
import test from 'node:test';
import type { SocialAccount } from '../supabase/functions/_shared/social-types.ts';
import {
  APP_OPEN_SYNC_BUFFER_MS,
  appOpenSyncDue,
  nextMediaSyncRequest
} from '../components/media/media-sync.helpers.ts';
import type { MediaSyncQueue } from '../components/media/media-sync.helpers.ts';

const now = Date.parse('2026-10-26T14:00:00Z');
function account(overrides: Partial<SocialAccount> = {}): SocialAccount {
  return {
    id: 'instagram-account',
    owner_id: 'owner',
    platform: 'Instagram',
    external_id: 'creator',
    username: 'creator',
    display_name: 'Creator',
    avatar_url: '',
    status: 'connected',
    last_synced_at: null,
    last_error: '',
    metric_note: '',
    cursor: null,
    has_more: false,
    sync_lock_until: null,
    updated_at: new Date(now).toISOString(),
    ...overrides
  };
}

test('app open syncs only after the last successful sync is more than one hour old', () => {
  const connected = account({ last_synced_at: new Date(now).toISOString() });
  assert.equal(appOpenSyncDue(connected, now), false);
  assert.equal(appOpenSyncDue(connected, now + APP_OPEN_SYNC_BUFFER_MS - 1), false);
  assert.equal(appOpenSyncDue(connected, now + APP_OPEN_SYNC_BUFFER_MS), false);
  assert.equal(appOpenSyncDue(connected, now + APP_OPEN_SYNC_BUFFER_MS + 1), true);
  assert.equal(appOpenSyncDue(connected, now - 1000), false, 'a future timestamp is not stale');
});

test('never-synced and unreadable dates are due, but disconnected accounts need user action', () => {
  assert.equal(appOpenSyncDue(account(), now), true);
  assert.equal(appOpenSyncDue(account({ last_synced_at: 'not-a-date' }), now), true);
  assert.equal(appOpenSyncDue(account({ status: 'disconnected' }), now), false);
  assert.equal(appOpenSyncDue(account({ status: 'reconnect_required' }), now), false);
});

test('accounts have independent buffers and pending requests run one at a time', () => {
  const pending: MediaSyncQueue = new Map([
    ['Instagram', 'open'],
    ['TikTok', 'open']
  ]);
  const instagram = account({ last_synced_at: new Date(now - 30 * 60 * 1000).toISOString() });
  const tiktok = account({ id: 'tiktok-account', platform: 'TikTok' });
  assert.deepEqual(nextMediaSyncRequest(pending, [instagram, tiktok], now), {
    platform: 'TikTok',
    reason: 'open'
  });
  assert.equal(nextMediaSyncRequest(pending, [instagram, tiktok], now), null);
  assert.equal(pending.size, 0);
});

test('a successful Posted or manual sync resets the buffer for an app-open request waiting behind it', () => {
  const pending: MediaSyncQueue = new Map([['Instagram', 'open']]);
  const connected = account({
    last_synced_at: new Date(now - 2 * APP_OPEN_SYNC_BUFFER_MS).toISOString()
  });
  assert.equal(appOpenSyncDue(connected, now), true);
  connected.last_synced_at = new Date(now).toISOString();
  assert.equal(nextMediaSyncRequest(pending, [connected], now), null);
  assert.equal(appOpenSyncDue(connected, now + 30 * 60 * 1000), false);
  assert.equal(appOpenSyncDue(connected, now + APP_OPEN_SYNC_BUFFER_MS + 1), true);
});

test('Posted changes bypass the app-open buffer while missing and disconnected accounts are skipped', () => {
  const pending: MediaSyncQueue = new Map([
    ['Instagram', 'posted'],
    ['TikTok', 'posted']
  ]);
  const connected = account({ last_synced_at: new Date(now).toISOString() });
  assert.deepEqual(nextMediaSyncRequest(pending, [connected], now), {
    platform: 'Instagram',
    reason: 'posted'
  });
  assert.equal(nextMediaSyncRequest(pending, [connected], now), null);
  pending.set('Instagram', 'posted');
  assert.equal(
    nextMediaSyncRequest(pending, [account({ status: 'reconnect_required' })], now),
    null
  );
});

test('a failed request is not continually retried during the same opening', () => {
  const pending: MediaSyncQueue = new Map([['Instagram', 'open']]);
  const connected = account({
    last_synced_at: new Date(now - 2 * APP_OPEN_SYNC_BUFFER_MS).toISOString()
  });
  assert.deepEqual(nextMediaSyncRequest(pending, [connected], now), {
    platform: 'Instagram',
    reason: 'open'
  });
  assert.equal(nextMediaSyncRequest(pending, [connected], now), null);
  assert.equal(
    appOpenSyncDue(connected, now),
    true,
    'failure leaves the successful sync date intact'
  );
  pending.set('Instagram', 'open');
  assert.deepEqual(
    nextMediaSyncRequest(pending, [connected], now),
    {
      platform: 'Instagram',
      reason: 'open'
    },
    'a later app opening can try again'
  );
});
