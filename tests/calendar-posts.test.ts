import assert from 'node:assert/strict';
import test from 'node:test';
import { seed } from '../lib/model.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { calendarTimeline } from '../components/calendar/calendar-posts.helpers.ts';

const timeZone = 'America/Toronto';
const range = { start: '2026-10-19', end: '2026-10-25' };

function fixture(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    ...newMediaRecord('owner', { title: 'A morning ritual', source: 'api' }),
    id: 'instagram-post',
    platform: 'Instagram',
    external_id: '18012345678901234',
    permalink: 'https://www.instagram.com/reel/Posted123/',
    thumbnail_url: 'https://cdn.example/thumbnail.jpg',
    media_url: 'https://cdn.example/video.mp4',
    published_at: '2026-10-24T01:30:00Z',
    updated_at: '2026-10-24T02:00:00Z',
    ...overrides
  };
}

test('unlinked synced videos appear on their local published date without creating ideas', () => {
  const state = seed();
  state.items = [];
  const record = fixture();
  const before = structuredClone({ state, record });
  const result = calendarTimeline(state, [record], range, timeZone);
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].date, '2026-10-23');
  assert.equal(result.posts[0].record.thumbnail_url, record.thumbnail_url);
  assert.equal(result.posts[0].record.media_url, record.media_url);
  assert.equal(result.posts[0].item, null);
  assert.deepEqual(result.entries, []);
  assert.deepEqual({ state, record }, before);
  assert.equal(calendarTimeline(state, [record], range, 'Asia/Tokyo').posts[0].date, '2026-10-24');
});

for (const basis of ['url', 'postId', 'linked'] as const) {
  test(`a match by ${basis} displays one actual post and keeps the saved plan unchanged`, () => {
    const state = seed();
    state.items = [state.items[0]];
    const item = state.items[0];
    const publication = item.publications[0];
    const record = fixture();
    publication.date = '2026-10-26';
    if (basis === 'url') publication.url = 'https://instagram.com/p/Posted123/?igsh=tracking';
    if (basis === 'postId') publication.postId = record.external_id!;
    if (basis === 'linked') record.linked_item_id = item.id;
    const before = structuredClone(state);
    const result = calendarTimeline(state, [record], {}, timeZone);
    assert.equal(result.posts.length, 1);
    assert.equal(result.posts[0].date, '2026-10-23');
    assert.equal(result.posts[0].item?.id, item.id);
    assert.ok(result.posts[0].issues.some(issue => issue.includes('Planned')));
    assert.ok(result.posts[0].issues.some(issue => issue.includes('2026-10-26')));
    assert.equal(
      result.entries.some(({ pub }) => pub.id === publication.id),
      false
    );
    assert.equal(
      result.entries.some(({ pub }) => pub.id === item.publications[1].id),
      true
    );
    publication.date = '';
    assert.equal(calendarTimeline(state, [record], {}, timeZone).unscheduled.length, 0);
    publication.date = before.items[0].publications[0].date;
    assert.deepEqual(state, before);
  });
}

test('a matching publication is not left on its planned date when the post falls outside the visible week', () => {
  const state = seed();
  state.items = [state.items[0]];
  const record = fixture();
  state.items[0].publications[0].url = record.permalink;
  state.items[0].publications[0].date = '2026-11-02';
  const result = calendarTimeline(
    state,
    [record],
    { start: '2026-11-02', end: '2026-11-08' },
    timeZone
  );
  assert.equal(result.posts.length, 0);
  assert.equal(result.entries.length, 0);
});

test('similar titles, ambiguous idea links and conflicting post references never remove a plan', () => {
  const state = seed();
  state.items = [state.items[0]];
  const item = state.items[0];
  const first = fixture({ title: item.title });
  const second = fixture({
    id: 'second',
    external_id: '180999',
    permalink: 'https://www.instagram.com/reel/Other123/'
  });
  assert.equal(calendarTimeline(state, [first], {}, timeZone).entries.length, 2);
  first.linked_item_id = item.id;
  second.linked_item_id = item.id;
  assert.equal(calendarTimeline(state, [first, second], {}, timeZone).entries.length, 2);
  item.publications[0].url = first.permalink;
  item.publications[0].postId = second.external_id!;
  assert.equal(calendarTimeline(state, [first, second], {}, timeZone).entries.length, 2);
});

test('calendar filters use actual media format, captions, channel, linked series and synced status', () => {
  const state = seed();
  state.items = [state.items[0]];
  const item = state.items[0];
  const record = fixture({
    caption: 'A little quiet time',
    linked_item_id: item.id,
    media_type: 'image'
  });
  const records = [record];
  const posts = (options = {}) =>
    calendarTimeline(state, records, { ...range, ...options }, timeZone).posts;
  assert.equal(
    posts({
      query: ' QUIET ',
      platform: 'Instagram',
      format: 'Photo',
      status: 'synced',
      seriesId: item.seriesId
    }).length,
    1
  );
  for (const options of [
    { platform: 'TikTok' },
    { format: 'Reel' },
    { status: 'planned' },
    { status: 'manually_posted' },
    { query: 'unrelated' },
    { seriesId: 'other-series' }
  ])
    assert.equal(posts(options).length, 0);
  assert.equal(posts({ query: item.title }).length, 1);
  record.linked_item_id = '';
  assert.equal(posts({ seriesId: item.seriesId }).length, 0);
});

test('archived, undated, invalid, uploaded and pasted records do not become published calendar posts', () => {
  const records = [
    fixture({ archived_at: '2026-10-24T02:00:00Z' }),
    fixture({ id: 'undated', published_at: null }),
    fixture({ id: 'invalid', published_at: 'not-a-date' }),
    fixture({ id: 'upload', source: 'upload', platform: null }),
    fixture({ id: 'pasted', source: 'link' })
  ];
  assert.equal(calendarTimeline(seed(), records, {}, timeZone).posts.length, 0);
});

test('repeated syncs and imported duplicate links keep one post with the newest thumbnail and metrics', () => {
  const state = seed();
  const first = fixture();
  const refreshed = fixture({
    id: 'newer-copy',
    thumbnail_url: 'https://cdn.example/refreshed.jpg',
    metrics: { ...first.metrics, views: 42 },
    updated_at: '2026-10-25T02:00:00Z'
  });
  const result = calendarTimeline(state, [first, refreshed], range, timeZone);
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].record.thumbnail_url, refreshed.thumbnail_url);
  assert.equal(result.posts[0].record.metrics.views, 42);
});

test('older imports extend calendar history and both social channels keep their own posts', () => {
  const state = seed();
  state.items = [];
  const instagram = fixture();
  const tiktok = fixture({
    id: 'tiktok-post',
    platform: 'TikTok',
    external_id: '6718335390845095173',
    permalink: 'https://www.tiktok.com/@creator/video/6718335390845095173'
  });
  const older = fixture({
    id: 'older',
    external_id: '180111',
    permalink: 'https://www.instagram.com/reel/Older123/',
    published_at: '2026-08-01T12:00:00Z'
  });
  assert.equal(
    calendarTimeline(state, [instagram, tiktok, older], range, timeZone).posts.length,
    2
  );
  const result = calendarTimeline(
    state,
    [instagram, tiktok, older],
    { start: '2026-08-01', end: '2026-08-01' },
    timeZone
  );
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].record.id, older.id);
});
