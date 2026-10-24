import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalPost,
  emptyMetrics,
  mergeImportedMedia,
  newMediaRecord,
  performanceContext
} from '../supabase/functions/_shared/media-helpers.ts';
import {
  authorizationUrl,
  normalizeInstagramMedia,
  normalizeTikTokVideo,
  refreshProviderToken
} from '../supabase/functions/_shared/social-providers.ts';
import {
  openToken,
  randomState,
  sealToken,
  stateDigest
} from '../supabase/functions/_shared/social-crypto.ts';
import { parseSocialCommand } from '../supabase/functions/_shared/social-handler.ts';
import {
  socialSetup,
  allowedReturnOrigin,
  validUploadPath
} from '../supabase/functions/_shared/social-service.ts';
import type {
  SocialAccount,
  SocialEnvironment,
  SocialToken
} from '../supabase/functions/_shared/social-types.ts';
import {
  filterMedia,
  defaultMediaFilters,
  formatMetric,
  mediaForItem,
  sameMediaLink
} from '../components/media/media.helpers.ts';
import { analyticsSummary } from '../components/views/analytics/analytics.helpers.ts';
import { seed } from '../lib/model.ts';

export const environment: SocialEnvironment = {
  supabaseUrl: 'https://project.supabase.co',
  appUrl: 'https://draftroom.example',
  encryptionKey: randomState(),
  instagramAppId: 'instagram-app',
  instagramAppSecret: 'private-instagram-secret',
  instagramVersion: 'v25.0',
  tiktokClientKey: 'tiktok-app',
  tiktokClientSecret: 'private-tiktok-secret'
};
const ownerId = '00000000-0000-4000-8000-000000000001';

export function connectedAccount(platform: 'Instagram' | 'TikTok' = 'TikTok'): SocialAccount {
  return {
    id: crypto.randomUUID(),
    owner_id: ownerId,
    platform,
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
    updated_at: new Date().toISOString()
  };
}

export function tokenFixture(): SocialToken {
  return {
    accessToken: 'private-access-token',
    refreshToken: 'private-refresh-token',
    externalId: 'creator',
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 86400_000 * 30).toISOString(),
    scopes: ['user.info.basic', 'video.list']
  };
}

export function tiktokVideo(id = '6718335390845095173') {
  return {
    id,
    title: 'A matcha morning',
    video_description: 'A slower start',
    create_time: 1792713600,
    share_url: `https://www.tiktok.com/@creator/video/${id}`,
    cover_image_url: 'https://cdn.example/cover.jpg',
    duration: 24,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    share_count: 0
  };
}

test('post links normalize without tracking parameters and reject lookalike or unsafe URLs', () => {
  assert.equal(
    canonicalPost('https://www.instagram.com/reel/ABCdef123/?igsh=tracking').url,
    'https://www.instagram.com/reel/ABCdef123/'
  );
  assert.equal(
    canonicalPost('https://www.tiktok.com/@creator/video/6718335390845095173?track=1').embed,
    'https://www.tiktok.com/player/v1/6718335390845095173?autoplay=0&rel=0'
  );
  for (const url of [
    'https://instagram.com.evil.example/reel/ABCdef123/',
    'http://www.instagram.com/reel/ABCdef123/',
    'https://user:password@www.instagram.com/reel/ABCdef123/',
    'https://127.0.0.1/reel/ABCdef123/',
    'https://vm.tiktok.com/short/'
  ])
    assert.throws(() => canonicalPost(url));
  assert.ok(
    sameMediaLink(
      'https://instagram.com/p/ABCdef123/',
      'https://www.instagram.com/reel/ABCdef123/?track=1'
    )
  );
});

test('OAuth requests carry expiring state, exact redirect and only read scopes without client secrets', () => {
  for (const platform of ['Instagram', 'TikTok'] as const) {
    const url = new URL(authorizationUrl(platform, 'a-random-state', environment));
    assert.equal(url.searchParams.get('state'), 'a-random-state');
    assert.equal(
      url.searchParams.get('redirect_uri'),
      'https://draftroom.example/social/callback/'
    );
    assert.ok(!url.href.includes('private-'));
    assert.ok(!url.searchParams.get('scope')?.includes('publish'));
  }
  assert.equal(
    allowedReturnOrigin('https://draftroom.example', environment),
    'https://draftroom.example'
  );
  assert.throws(() => allowedReturnOrigin('https://evil.example', environment));
  assert.throws(() =>
    allowedReturnOrigin('http://localhost:3000', {
      ...environment,
      appUrl: 'http://localhost:3000'
    })
  );
  assert.ok(
    socialSetup({ ...environment, tiktokClientSecret: '' })
      .find(setup => setup.platform === 'TikTok')
      ?.missing.includes('TIKTOK_CLIENT_SECRET')
  );
});

test('tokens are authenticated ciphertext bound to the owner and platform', async () => {
  const token = tokenFixture();
  const encrypted = await sealToken(token, environment.encryptionKey, ownerId, 'TikTok');
  assert.ok(!encrypted.includes(token.accessToken));
  assert.deepEqual(await openToken(encrypted, environment.encryptionKey, ownerId, 'TikTok'), token);
  await assert.rejects(openToken(encrypted, environment.encryptionKey, 'another-owner', 'TikTok'));
  await assert.rejects(openToken(encrypted, environment.encryptionKey, ownerId, 'Instagram'));
  await assert.rejects(openToken(encrypted, randomState(), ownerId, 'TikTok'));
  assert.equal(randomState().length, 43);
  assert.notEqual(await stateDigest('one'), await stateDigest('two'));
});

test('provider normalization preserves real zeros and unavailable fields remain unknown', () => {
  const video = normalizeTikTokVideo(tiktokVideo());
  assert.ok(video);
  assert.equal(video.metrics.views, 0);
  assert.equal(video.metrics.saves, null);
  assert.equal(video.metrics.reach, null);
  assert.equal(video.media_url, '');
  assert.equal(normalizeTikTokVideo({ ...tiktokVideo(), id: '<script>' }), null);
  const instagram = normalizeInstagramMedia({
    id: '12345',
    caption: 'Morning matcha\nA new ritual',
    media_type: 'VIDEO',
    media_url: 'https://cdn.example/clip.mp4',
    permalink: 'https://www.instagram.com/reel/ABCdef123/',
    like_count: 0,
    comments_count: 2,
    timestamp: '2026-10-23T12:00:00Z'
  });
  assert.ok(instagram);
  assert.equal(instagram.title, 'Morning matcha');
  assert.equal(instagram.metrics.likes, 0);
  assert.equal(instagram.metrics.views, null);
});

test('refreshing provider media keeps the record identity, linked idea and archive choice', () => {
  const incoming = normalizeTikTokVideo(tiktokVideo());
  assert.ok(incoming);
  const existing = {
    ...newMediaRecord(ownerId, { title: 'A saved link', source: 'link', linkedItemId: 'idea' }),
    archived_at: '2026-10-23T00:00:00Z'
  };
  const merged = mergeImportedMedia(existing, incoming, ownerId);
  assert.equal(merged.id, existing.id);
  assert.equal(merged.linked_item_id, 'idea');
  assert.equal(merged.archived_at, existing.archived_at);
  assert.equal(merged.source, 'api');
});

test('unexpired provider tokens do not refresh; expiring TikTok tokens rotate privately', async () => {
  const token = tokenFixture();
  let calls = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    calls++;
    assert.ok(String(init?.body).includes('grant_type=refresh_token'));
    return Response.json({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      open_id: 'creator',
      scope: 'user.info.basic,video.list',
      expires_in: 86400,
      refresh_expires_in: 2592000
    });
  };
  assert.equal(await refreshProviderToken('TikTok', token, environment, fetcher), token);
  assert.equal(calls, 0);
  const refreshed = await refreshProviderToken(
    'TikTok',
    { ...token, expiresAt: new Date(Date.now() - 1000).toISOString() },
    environment,
    fetcher
  );
  assert.equal(refreshed.accessToken, 'new-access');
  assert.equal(refreshed.refreshToken, 'new-refresh');
  assert.equal(calls, 1);
});

test('library filters, archives and metrics never mistake missing insight values for zero', () => {
  const video = normalizeTikTokVideo(tiktokVideo());
  assert.ok(video);
  const measured = mergeImportedMedia(undefined, video, ownerId);
  const linked = newMediaRecord(ownerId, { title: 'Uploaded matcha', source: 'upload' });
  const archived = { ...measured, id: crypto.randomUUID(), archived_at: '2026-10-23T00:00:00Z' };
  assert.deepEqual(
    filterMedia([measured, linked, archived], {
      ...defaultMediaFilters,
      query: 'matcha',
      scope: 'TikTok'
    }),
    [measured]
  );
  assert.deepEqual(filterMedia([measured, archived], { ...defaultMediaFilters, archived: true }), [
    archived
  ]);
  assert.equal(formatMetric(null), '—');
  assert.equal(formatMetric(0), '0');
  const summary = analyticsSummary([measured, linked, archived], 'all');
  assert.equal(summary.posts, 1);
  assert.equal(summary.totals.views, 0);
  assert.equal(summary.totals.saves, null);
});

test('assistant performance excludes manual guesses, private video locations and archived work', () => {
  const video = normalizeTikTokVideo(tiktokVideo());
  assert.ok(video);
  const measured = mergeImportedMedia(undefined, { ...video, caption: 'a'.repeat(2000) }, ownerId);
  const upload = {
    ...newMediaRecord(ownerId, { title: 'Private clip', source: 'upload' }),
    storage_path: `${ownerId}/private-clip.mp4`
  };
  const linked = { ...measured, id: crypto.randomUUID(), source: 'link' as const };
  const archived = { ...measured, id: crypto.randomUUID(), archived_at: '2026-10-23T00:00:00Z' };
  const context = performanceContext([measured, upload, linked, archived], [connectedAccount()]);
  assert.equal(context.posts.length, 1);
  assert.equal(context.posts[0].caption.length, 600);
  assert.equal(context.posts[0].metrics.views, 0);
  const serialized = JSON.stringify(context);
  assert.ok(!serialized.includes('private-clip'));
  assert.ok(!serialized.includes('cover_image_url'));
  assert.ok(!serialized.includes('accessToken'));
  const state = seed();
  measured.linked_item_id = state.items[0].id;
  assert.deepEqual(mediaForItem([measured], state.items[0]), [measured]);
  assert.deepEqual(emptyMetrics(), {
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    reach: null
  });
});

test('library commands reject fabricated metrics, invalid platforms and invalid upload ownership', () => {
  assert.throws(() => parseSocialCommand({ action: 'set_metrics', views: 999999 }));
  assert.throws(() => parseSocialCommand({ action: 'sync', platform: 'YouTube', older: false }));
  assert.throws(() =>
    parseSocialCommand({
      action: 'register_upload',
      path: 'x',
      title: 'x',
      duration: Number.NaN,
      linkedItemId: ''
    })
  );
  assert.ok(validUploadPath(ownerId, `${ownerId}/${crypto.randomUUID()}/clip.mp4`));
  assert.ok(!validUploadPath(ownerId, `another/${crypto.randomUUID()}/clip.mp4`));
  assert.ok(!validUploadPath(ownerId, `${ownerId}/../clip.mp4`));
});
