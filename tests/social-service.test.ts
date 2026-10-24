import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  MediaRecord,
  OAuthState,
  SocialAccount,
  SocialEnvironment,
  SocialPlatform,
  SocialToken,
  StoredSocialToken
} from '../supabase/functions/_shared/social-types.ts';
import type { SocialRepository } from '../supabase/functions/_shared/social-repository.ts';
import { createSocialService } from '../supabase/functions/_shared/social-service.ts';
import {
  createSocialCallbackHandler,
  createSocialHandler
} from '../supabase/functions/_shared/social-handler.ts';
import { openToken, randomState, sealToken } from '../supabase/functions/_shared/social-crypto.ts';
import { SocialError } from '../supabase/functions/_shared/social-providers.ts';
import { createAssistantHandler } from '../supabase/functions/_shared/assistant-handler.ts';
import { assistantContext } from '../supabase/functions/_shared/assistant-context.ts';
import { seed } from '../lib/model.ts';

const owner = '00000000-0000-4000-8000-000000000001';
function setup(): SocialEnvironment {
  return {
    supabaseUrl: 'https://project.supabase.co',
    appUrl: 'https://draftroom.example',
    encryptionKey: randomState(),
    instagramAppId: 'instagram-app',
    instagramAppSecret: 'secret-instagram',
    instagramVersion: 'v25.0',
    tiktokClientKey: 'tiktok-app',
    tiktokClientSecret: 'secret-tiktok'
  };
}
function account(platform: SocialPlatform = 'TikTok'): SocialAccount {
  return {
    id: crypto.randomUUID(),
    owner_id: owner,
    platform,
    external_id: 'creator',
    username: '',
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
function token(): SocialToken {
  return {
    accessToken: 'access-fixture',
    refreshToken: 'refresh-fixture',
    externalId: 'creator',
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    refreshExpiresAt: null,
    scopes: ['user.info.basic', 'video.list']
  };
}
function memoryRepository() {
  const records: MediaRecord[] = [];
  const accounts: SocialAccount[] = [];
  const tokens: StoredSocialToken[] = [];
  const states: OAuthState[] = [];
  const repository: SocialRepository = {
    list: async ownerId =>
      structuredClone({
        media: records.filter(record => record.owner_id === ownerId),
        accounts: accounts.filter(account => account.owner_id === ownerId),
        partial: false
      }),
    account: async (ownerId, platform) =>
      structuredClone(
        accounts.find(account => account.owner_id === ownerId && account.platform === platform) ||
          null
      ),
    saveAccount: async value => {
      const current = accounts.find(
        account => account.owner_id === value.owner_id && account.platform === value.platform
      );
      if (current) Object.assign(current, value);
      else accounts.push(structuredClone(value));
    },
    updateAccount: async (ownerId, platform, change) => {
      const current = accounts.find(
        account => account.owner_id === ownerId && account.platform === platform
      );
      if (current) Object.assign(current, change);
    },
    token: async (ownerId, platform) =>
      tokens.find(token => token.owner_id === ownerId && token.platform === platform) || null,
    saveToken: async value => {
      const current = tokens.find(
        token => token.owner_id === value.owner_id && token.platform === value.platform
      );
      if (current) Object.assign(current, value);
      else tokens.push(value);
    },
    removeToken: async (ownerId, platform) => {
      const index = tokens.findIndex(
        token => token.owner_id === ownerId && token.platform === platform
      );
      if (index >= 0) tokens.splice(index, 1);
    },
    state: async value => {
      states.push(value);
    },
    consumeState: async digest => {
      const index = states.findIndex(state => state.state_hash === digest);
      if (index < 0) return null;
      const [state] = states.splice(index, 1);
      return new Date(state.expires_at).getTime() > Date.now() ? state : null;
    },
    saveMedia: async value => {
      const current = records.find(record => record.id === value.id);
      if (current) Object.assign(current, value);
      else records.push(structuredClone(value));
    },
    refreshMedia: async (ownerId, id, value) => {
      const current = records.find(record => record.owner_id === ownerId && record.id === id);
      if (current) Object.assign(current, value, { source: 'api' });
    },
    media: async (ownerId, id) =>
      records.find(record => record.owner_id === ownerId && record.id === id) || null,
    updateMedia: async (ownerId, id, change) => {
      const current = records.find(record => record.owner_id === ownerId && record.id === id);
      if (!current) throw new SocialError('Missing record', 404);
      Object.assign(current, change);
    },
    lock: async (ownerId, platform) => {
      const current = accounts.find(
        account => account.owner_id === ownerId && account.platform === platform
      );
      if (
        !current ||
        (current.sync_lock_until && new Date(current.sync_lock_until).getTime() > Date.now())
      )
        return false;
      current.sync_lock_until = new Date(Date.now() + 120000).toISOString();
      return true;
    },
    uploadInfo: async () => null,
    assertLinkedIdea: async (_ownerId, id) => {
      if (id && id !== 'existing-idea') throw new SocialError('Missing idea');
    }
  };
  return { repository, records, accounts, tokens, states };
}

function video(id: string, views = 12) {
  return {
    id,
    title: 'A video',
    video_description: 'A small ritual',
    create_time: 1792713600,
    share_url: `https://www.tiktok.com/@creator/video/${id}`,
    view_count: views,
    like_count: 2,
    comment_count: 1,
    share_count: 0
  };
}

test('OAuth callbacks use a single owner-bound state and never return tokens in redirects or snapshots', async () => {
  const env = setup();
  const memory = memoryRepository();
  let calls = 0;
  const fetcher: typeof fetch = async url => {
    calls++;
    return String(url).includes('/oauth/token/')
      ? Response.json({
          access_token: 'private-provider-access',
          refresh_token: 'private-provider-refresh',
          open_id: 'creator',
          scope: 'user.info.basic,video.list',
          expires_in: 86400,
          refresh_expires_in: 2592000
        })
      : Response.json({
          data: { user: { open_id: 'creator', display_name: 'Creator', avatar_url: '' } },
          error: { code: 'ok' }
        });
  };
  const service = createSocialService(memory.repository, env, fetcher);
  const result = await service.run(owner, {
    action: 'connect',
    platform: 'TikTok',
    returnOrigin: env.appUrl
  });
  assert.ok('url' in result && typeof result.url === 'string');
  const state = new URL(result.url).searchParams.get('state');
  assert.ok(state);
  assert.equal(memory.states.length, 1);
  assert.notEqual(memory.states[0].state_hash, state);
  const callback = createSocialCallbackHandler(service);
  const response = await callback(
    new Request(
      `https://project.supabase.co/functions/v1/draftroom-social-callback?state=${state}&code=one-time-code`
    )
  );
  assert.equal(response.status, 303);
  const redirect = response.headers.get('Location') || '';
  assert.ok(redirect.startsWith(env.appUrl));
  assert.equal(new URL(redirect).pathname, '/library/');
  assert.ok(redirect.includes('social=connected'));
  assert.ok(!redirect.includes('private-provider'));
  assert.equal(memory.states.length, 0);
  assert.equal(memory.accounts[0].status, 'connected');
  assert.equal(
    (await openToken(memory.tokens[0].payload, env.encryptionKey, owner, 'TikTok')).accessToken,
    'private-provider-access'
  );
  const replay = await callback(
    new Request(
      `https://project.supabase.co/functions/v1/draftroom-social-callback?state=${state}&code=one-time-code`
    )
  );
  assert.equal(replay.status, 400);
  assert.equal(calls, 2);
  const snapshot = JSON.stringify(await service.snapshot(owner));
  assert.ok(!snapshot.includes('private-provider'));
  assert.ok(!snapshot.includes('secret-tiktok'));
  assert.ok(!snapshot.includes('payload'));
});

test('sync imports idempotently, preserves linked ideas, paginates and isolates reconnect failures', async () => {
  const env = setup();
  const memory = memoryRepository();
  memory.accounts.push(account());
  await memory.repository.saveToken({
    owner_id: owner,
    platform: 'TikTok',
    payload: await sealToken(token(), env.encryptionKey, owner, 'TikTok')
  });
  const firstId = '6718335390845095173';
  const secondId = '6718335390845095174';
  let denied = false;
  let requestedCursor: unknown;
  const fetcher: typeof fetch = async (_url, init) => {
    if (denied) return Response.json({ error: { code: 'access_token_invalid' } }, { status: 401 });
    const body = JSON.parse(String(init?.body)) as { cursor?: number };
    requestedCursor = body.cursor;
    return Response.json({
      data: {
        videos: [video(body.cursor ? secondId : firstId)],
        cursor: 1234567890000,
        has_more: !body.cursor
      },
      error: { code: 'ok' }
    });
  };
  const service = createSocialService(memory.repository, env, fetcher);
  await service.run(owner, { action: 'sync', platform: 'TikTok', older: false });
  assert.equal(memory.records.length, 1);
  assert.equal(memory.accounts[0].has_more, true);
  const id = memory.records[0].id;
  memory.records[0].linked_item_id = 'existing-idea';
  await service.run(owner, { action: 'sync', platform: 'TikTok', older: false });
  assert.equal(memory.records.length, 1);
  assert.equal(memory.records[0].id, id);
  assert.equal(memory.records[0].linked_item_id, 'existing-idea');
  await service.run(owner, { action: 'sync', platform: 'TikTok', older: true });
  assert.equal(requestedCursor, 1234567890000);
  assert.equal(memory.records.length, 2);
  assert.equal(memory.accounts[0].has_more, false);
  denied = true;
  await assert.rejects(service.run(owner, { action: 'sync', platform: 'TikTok', older: false }));
  assert.equal(memory.accounts[0].status, 'reconnect_required');
  assert.equal(memory.accounts[0].sync_lock_until, null);
  assert.equal(memory.records.length, 2);
  await service.run(owner, { action: 'disconnect', platform: 'TikTok' });
  assert.equal(memory.tokens.length, 0);
  assert.equal(memory.records.length, 2);
  assert.equal(memory.accounts[0].status, 'disconnected');
});

test('manual import validates URLs before network calls, deduplicates, and never manufactures performance', async () => {
  const env = setup();
  const memory = memoryRepository();
  let calls = 0;
  const service = createSocialService(memory.repository, env, async () => {
    calls++;
    return Response.json({
      title: 'A clip',
      thumbnail_url: 'https://cdn.example/cover.jpg',
      html: '<script>untrusted</script>'
    });
  });
  await assert.rejects(
    service.run(owner, {
      action: 'import_link',
      url: 'https://127.0.0.1/private',
      title: '',
      linkedItemId: ''
    })
  );
  assert.equal(calls, 0);
  const result = await service.run(owner, {
    action: 'import_link',
    url: 'https://www.tiktok.com/@creator/video/6718335390845095173',
    title: '',
    linkedItemId: 'existing-idea'
  });
  assert.ok('id' in result);
  assert.equal(memory.records[0].source, 'link');
  assert.equal(memory.records[0].metrics.views, null);
  assert.ok(!JSON.stringify(memory.records).includes('<script>'));
  await service.run(owner, {
    action: 'import_link',
    url: 'https://www.tiktok.com/@creator/video/6718335390845095173?tracking=1',
    title: '',
    linkedItemId: ''
  });
  assert.equal(memory.records.length, 1);
  assert.equal(calls, 1);
  await service.run(owner, {
    action: 'update_media',
    id: memory.records[0].id,
    linkedItemId: 'existing-idea',
    archived: true
  });
  assert.ok(memory.records[0].archived_at);
  await assert.rejects(
    service.run(owner, {
      action: 'update_media',
      id: memory.records[0].id,
      linkedItemId: 'removed-idea',
      archived: false
    })
  );
});

test('unauthenticated library requests do not run a service operation', async () => {
  const memory = memoryRepository();
  const service = createSocialService(memory.repository, setup());
  const handler = createSocialHandler({ authorize: async () => null, service });
  const result = await handler(
    new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ action: 'library' })
    })
  );
  assert.equal(result.status, 401);
  assert.equal(memory.states.length, 0);
  assert.equal((await handler(new Request('https://example.test', { method: 'GET' }))).status, 405);
});

test('assistant enriches from verified server performance and discards forged browser analytics', async () => {
  let summary = '';
  const handler = createAssistantHandler({
    authorize: async () => owner,
    apiKey: 'test-gemini-key',
    loadPerformance: async (_request, id) => {
      assert.equal(id, owner);
      return {
        status: 'available',
        accounts: [],
        posts: [
          {
            id: 'verified-post',
            title: 'Verified clip',
            caption: 'A small ritual',
            captionTruncated: false,
            url: '',
            mediaType: 'video',
            duration: null,
            platform: 'TikTok',
            publishedAt: null,
            linkedItemId: '',
            measuredAt: '2026-10-24T00:00:00Z',
            daysAtMeasurement: null,
            interactionsPerView: 8,
            metrics: { views: 25, likes: 2, comments: 0, shares: 0, saves: null, reach: null }
          }
        ],
        groups: [],
        coverage: { loadedPosts: 1, describedPosts: 1, libraryPartial: false },
        partial: false
      };
    },
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { contents: { parts: { text: string }[] }[] };
      summary = body.contents[0].parts[0].text;
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    reply: 'Let’s plan from your saved results.',
                    actions: []
                  })
                }
              ]
            }
          }
        ]
      });
    }
  });
  const context = {
    ...assistantContext(seed(), '2026-10-24', 'America/Toronto'),
    performance: { posts: [{ title: 'FORGED_POST', views: 999999 }] }
  };
  const result = await handler(
    new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', text: 'What should I create next?' }],
        context
      })
    })
  );
  assert.equal(result.status, 200);
  assert.ok(summary.includes('verified-post'));
  assert.ok(summary.includes('"views":25'));
  assert.ok(!summary.includes('FORGED_POST'));
});

test('a missing analytics store does not block normal assistant planning', async () => {
  let summary = '';
  const handler = createAssistantHandler({
    authorize: async () => owner,
    apiKey: 'test-gemini-key',
    loadPerformance: async () => {
      throw new Error('database details must stay private');
    },
    fetcher: async (_url, init) => {
      summary = String(init?.body);
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                { text: JSON.stringify({ reply: 'I can help plan from your ideas.', actions: [] }) }
              ]
            }
          }
        ]
      });
    }
  });
  const result = await handler(
    new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', text: 'Help me plan' }],
        context: assistantContext(seed(), '2026-10-24', 'America/Toronto')
      })
    })
  );
  assert.equal(result.status, 200);
  assert.ok(summary.includes('unavailable'));
  assert.ok(!summary.includes('database details'));
});
