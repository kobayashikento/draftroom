import assert from 'node:assert/strict';
import test from 'node:test';
import {
  performanceContext,
  PERFORMANCE_POST_LIMIT
} from '../supabase/functions/_shared/assistant-performance.ts';
import { emptyMetrics, newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import type { MediaRecord, SocialAccount } from '../supabase/functions/_shared/social-types.ts';
import { createAssistantHandler } from '../supabase/functions/_shared/assistant-handler.ts';
import { assistantContext } from '../supabase/functions/_shared/assistant-context.ts';
import { geminiRequest } from '../supabase/functions/_shared/assistant-prompt.ts';
import { seed } from '../lib/model.ts';

function post(id: string, changes: Partial<MediaRecord> = {}): MediaRecord {
  return {
    ...newMediaRecord('owner', { title: `Morning ritual ${id}`, source: 'api' }),
    id,
    platform: 'Instagram',
    caption: 'A matcha ritual to start the morning.',
    permalink: `https://www.instagram.com/reel/POST${id}/?tracking=remove`,
    published_at: '2026-10-01T00:00:00Z',
    metrics_updated_at: '2026-10-21T00:00:00Z',
    metrics: { views: 1000, likes: 80, comments: 10, shares: 10, saves: null, reach: null },
    duration: 20,
    ...changes
  };
}

test('small libraries include every post, including old low performers and posts with missing insights', () => {
  const records = Array.from({ length: 60 }, (_, index) => post(String(index)));
  records[59].published_at = '2026-01-01T00:00:00Z';
  records[59].metrics.views = 4;
  records[58].metrics_updated_at = null;
  const context = performanceContext(records, []);
  assert.equal(context.posts.length, 60);
  assert.equal(context.posts.find(post => post.id === '59')?.metrics.views, 4);
  assert.deepEqual(context.posts.find(post => post.id === '58')?.metrics, emptyMetrics());
  assert.deepEqual(context.coverage, {
    loadedPosts: 60,
    describedPosts: 60,
    libraryPartial: false
  });
  assert.equal(context.partial, false);
});

test('rankings and medians separate platforms, formats and metric coverage', () => {
  const records = [
    post('a', { metrics: { ...emptyMetrics(), views: 100, likes: 2 } }),
    post('b', { metrics: { ...emptyMetrics(), views: 300, likes: 1 } }),
    post('c', { metrics: { ...emptyMetrics(), views: 200, likes: 4 } }),
    post('d', { metrics: emptyMetrics() }),
    post('carousel', { media_type: 'carousel', metrics: { ...emptyMetrics(), views: 99999 } }),
    post('tiktok', { platform: 'TikTok', metrics: { ...emptyMetrics(), views: 999999 } })
  ];
  const groups = performanceContext(records, []).groups;
  const reels = groups.find(
    group => group.platform === 'Instagram' && group.mediaType === 'video'
  )!;
  assert.equal(groups.length, 3);
  assert.equal(reels.posts, 4);
  assert.equal(reels.metrics.views.median, 200);
  assert.equal(reels.metrics.views.measuredPosts, 3);
  assert.deepEqual(reels.metrics.views.topPostIds, ['b', 'c', 'a']);
  assert.deepEqual(reels.metrics.likes.topPostIds, ['c', 'a', 'b']);
  assert.deepEqual(reels.metrics.saves, {
    measuredPosts: 0,
    median: null,
    topPostIds: [],
    bottomPostIds: []
  });
});

test('rates preserve missing measurements and zero counts without dividing by zero', () => {
  const context = performanceContext(
    [
      post('complete'),
      post('missing-shares', {
        metrics: { views: 100, likes: 5, comments: 1, shares: null, saves: 4, reach: null }
      }),
      post('zero-views', {
        metrics: { ...emptyMetrics(), views: 0, likes: 0, comments: 0, shares: 0 }
      }),
      post('zero-interactions', {
        metrics: { ...emptyMetrics(), views: 50, likes: 0, comments: 0, shares: 0 }
      })
    ],
    []
  );
  assert.deepEqual(
    context.posts.map(post => post.interactionsPerView),
    [10, null, null, 0]
  );
  assert.equal(context.groups[0].metrics.interactionsPerView.median, 5);
  assert.equal(context.groups[0].metrics.views.measuredPosts, 4);
});

test('comparison evidence includes canonical post links, format, duration and age at measurement', () => {
  const context = performanceContext(
    [
      post('first', {
        caption: 'a'.repeat(1500),
        media_url: 'https://private.example/video?token=SECRET'
      }),
      post('newer', { published_at: '2026-10-20T12:00:00Z', duration: null }),
      post('future', { published_at: '2026-10-23T00:00:00Z' }),
      post('bad-link', { permalink: 'https://attacker.example/reel/POSTbad-link/' })
    ],
    []
  );
  assert.equal(context.posts[0].url, 'https://www.instagram.com/reel/POSTfirst/');
  assert.equal(context.posts[0].caption.length, 1200);
  assert.equal(context.posts[0].captionTruncated, true);
  assert.equal(context.posts[0].daysAtMeasurement, 20);
  assert.equal(context.posts[1].daysAtMeasurement, 0.5);
  assert.equal(context.posts[1].duration, null);
  assert.equal(context.posts[2].daysAtMeasurement, null);
  assert.equal(context.posts[3].url, '');
  assert.equal(JSON.stringify(context).includes('SECRET'), false);
});

test('large libraries retain leaders for each metric and low performers across both platforms', () => {
  const records = Array.from({ length: 700 }, (_, index) =>
    post(String(index), {
      metrics: { ...emptyMetrics(), views: 1000 + index, likes: 10, comments: 0, shares: 0 }
    })
  );
  const oldWinner = post('oldWinner', {
    published_at: '2025-01-01T00:00:00Z',
    metrics: { ...emptyMetrics(), views: 90000 }
  });
  const savesWinner = post('savesWinner', {
    metrics: { ...emptyMetrics(), views: null, saves: 100 }
  });
  const low = post('low', { metrics: { ...emptyMetrics(), views: 0 } });
  const tiktok = post('tiktok', { platform: 'TikTok', metrics: { ...emptyMetrics(), views: 2 } });
  const named = post('named', {
    title: 'Lavender cloud latte',
    metrics: { ...emptyMetrics(), views: 1400, likes: 10, comments: 0, shares: 0 }
  });
  const context = performanceContext(
    [...records, oldWinner, savesWinner, low, tiktok, named],
    [],
    false,
    'Why did Lavender cloud latte underperform?'
  );
  const ids = context.posts.map(post => post.id);
  for (const id of ['oldWinner', 'savesWinner', 'low', 'tiktok', 'named'])
    assert.ok(ids.includes(id));
  const reels = context.groups.find(group => group.platform === 'Instagram')!;
  assert.equal(reels.metrics.views.topPostIds[0], 'oldWinner');
  assert.equal(reels.posts, 704);
  assert.equal(reels.metrics.views.measuredPosts, 703);
  assert.ok(context.posts.length <= PERFORMANCE_POST_LIMIT);
  assert.ok(context.posts.length < context.coverage.loadedPosts);
  assert.equal(context.partial, true);
  assert.equal(context.coverage.libraryPartial, false);
});

test('captions from all six platform/format groups keep ranked references within the description budget', () => {
  const records: MediaRecord[] = [];
  let index = 0;
  for (const platform of ['Instagram', 'TikTok'] as const)
    for (const media_type of ['video', 'carousel', 'image'] as const) {
      for (let n = 0; n < 100; n++)
        records.push(
          post(String(index++), {
            platform,
            media_type,
            metrics: {
              views: n * 7,
              likes: n * 3,
              comments: n * 2,
              shares: n,
              saves: 100 - n,
              reach: n * 4
            }
          })
        );
    }
  const context = performanceContext(records, [], true);
  assert.equal(context.groups.length, 6);
  const ids = new Set(context.posts.map(post => post.id));
  for (const group of context.groups)
    for (const metric of Object.values(group.metrics)) {
      for (const id of [...metric.topPostIds, ...metric.bottomPostIds]) assert.ok(ids.has(id));
    }
  assert.ok(context.posts.length <= PERFORMANCE_POST_LIMIT);
  assert.equal(context.coverage.libraryPartial, true);
});

test('cached imports stay available after disconnection and carry remaining-history and metric limitations', () => {
  const account: SocialAccount = {
    id: 'account',
    owner_id: 'owner',
    platform: 'Instagram',
    external_id: 'creator',
    username: 'creator',
    display_name: 'Creator',
    avatar_url: '',
    status: 'disconnected',
    last_synced_at: '2026-10-21T00:00:00Z',
    last_error: '',
    metric_note: 'Views were not supplied.',
    cursor: 'next',
    has_more: true,
    sync_lock_until: null,
    updated_at: '2026-10-21T00:00:00Z'
  };
  const context = performanceContext(
    [
      post('saved'),
      post('manual', { source: 'link' }),
      post('upload', { source: 'upload' }),
      post('archived', { archived_at: '2026-10-21T00:00:00Z' })
    ],
    [account]
  );
  assert.equal(context.status, 'available');
  assert.deepEqual(
    context.posts.map(post => post.id),
    ['saved']
  );
  assert.equal(context.accounts[0].hasMore, true);
  assert.equal(context.accounts[0].metricNote, 'Views were not supplied.');
  assert.equal(performanceContext([], [account]).status, 'not_connected');
});

test('the assistant passes the conversation to its owner-scoped loader and sends current comparisons to Gemini', async () => {
  const question = 'What do my best reels have in common, and why might the latte reel do worse?';
  const records = [post('best'), post('lower', { metrics: { ...emptyMetrics(), views: 50 } })];
  const handler = createAssistantHandler({
    apiKey: 'test-key',
    authorize: async () => 'owner',
    loadPerformance: async (_request, owner, messages) => {
      assert.equal(owner, 'owner');
      assert.equal(messages.at(-1)?.text, question);
      return performanceContext(records, [], false, question);
    },
    fetcher: async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const summary = JSON.parse(request.contents[0].parts[0].text.split('\n')[1]);
      assert.equal(summary.performance.groups[0].metrics.views.median, 525);
      assert.equal(summary.performance.posts[0].url, 'https://www.instagram.com/reel/POSTbest/');
      assert.match(request.systemInstruction.parts[0].text, /label possible reasons as hypotheses/);
      assert.match(
        request.systemInstruction.parts[0].text,
        /do not rank images or carousels as reels/
      );
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    reply:
                      'The saved Instagram results show a difference in views. Here is an experiment to try.',
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
  const response = await handler(
    new Request('https://example.test/assistant', {
      method: 'POST',
      body: JSON.stringify({
        context: assistantContext(seed(), '2026-10-24', 'America/Toronto'),
        messages: [{ role: 'user', text: question }]
      })
    })
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).actions, []);
});

test('missing footage does not turn saved metrics into a blanket no-access answer', () => {
  const context = assistantContext(seed(), '2026-10-24', 'America/Toronto');
  context.performance = performanceContext([post('saved')], []);
  const prompt = geminiRequest(context, [{ role: 'user', text: 'What is my best reel?' }]);
  const instructions = prompt.systemInstruction.parts[0].text;
  assert.match(instructions, /use them directly/);
  assert.match(instructions, /does not prevent a useful analysis/);
  assert.match(instructions, /do not claim to have watched/);
});
