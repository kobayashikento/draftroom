import assert from 'node:assert/strict';
import test from 'node:test';
import { seed, productionQueue } from '../lib/model.ts';
import { parseWorkspace, validateWorkspace } from '../lib/workspace-data.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import {
  applyPublicationPostLink,
  liveItemPublications,
  preparePublicationPostLink,
  publishedPostCandidates,
  removePublicationPostLink
} from '../components/media/publication-link.helpers.ts';
import { assessPublicationMedia } from '../components/media/publication-media.helpers.ts';
import { calendarTimeline } from '../components/calendar/calendar-posts.helpers.ts';

function fixture(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    ...newMediaRecord('owner', { title: 'The published reel', source: 'api' }),
    id: 'synced-instagram',
    platform: 'Instagram',
    external_id: '18012345678901234',
    permalink: 'https://www.instagram.com/reel/Actual123/',
    thumbnail_url: 'https://cdn.example/actual.jpg',
    caption: 'The published caption',
    published_at: '2026-10-24T01:30:00Z',
    ...overrides
  };
}
function setup() {
  const state = seed();
  state.items = [state.items[0]];
  const item = state.items[0];
  const publication = item.publications[0];
  const record = fixture();
  const input = { itemId: item.id, publicationId: publication.id, mediaId: record.id };
  return { state, item, publication, record, input };
}

test('matching a synced post marks only its channel posted and preserves creative work', () => {
  const { state, item, publication, record, input } = setup();
  publication.caption = 'Keep my drafted caption';
  const before = structuredClone(item);
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.equal(publication.url, record.permalink);
  assert.equal(publication.postId, record.external_id);
  assert.equal(publication.publishedAt, new Date(record.published_at!).toISOString());
  assert.equal(publication.state, 'manually_posted');
  assert.equal(publication.linkedPost?.mediaId, record.id);
  assert.equal(publication.date, before.publications[0].date);
  assert.equal(publication.caption, before.publications[0].caption);
  assert.deepEqual(item.publications[1], before.publications[1]);
  assert.deepEqual(item.tasks, before.tasks);
  assert.deepEqual(item.storyboard, before.storyboard);
  assert.equal(item.stageId, before.stageId, 'TikTok is still planned');
  assert.equal(productionQueue(state).active[0].item.id, item.id);
  assert.equal(liveItemPublications(item, [record])[0].platform, 'Instagram');
  assert.ok(
    !assessPublicationMedia(item, publication, [record]).issues.some(issue =>
      issue.includes('marked Planned')
    )
  );
  const timeline = calendarTimeline(state, [record], {}, 'America/Toronto');
  assert.equal(timeline.posts.length, 1);
  assert.equal(timeline.posts[0].date, '2026-10-23');
  assert.equal(
    timeline.entries.some(({ pub }) => pub.id === publication.id),
    false
  );
});

test('a single intended channel moves to Posted and Completed without checking off unfinished tasks', () => {
  const { state, item, record, input } = setup();
  item.publications[1].date = '';
  const tasks = structuredClone(item.tasks);
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.equal(item.stageId, 'posted');
  assert.deepEqual(item.tasks, tasks);
  assert.ok(item.tasks.some(task => !task.done));
  const queue = productionQueue(state);
  assert.equal(queue.active.length, 0);
  assert.equal(queue.completed[0].item.id, item.id);
  assert.equal(queue.remaining, 0);
});

test('every intended channel must be posted before the whole idea moves to Posted', () => {
  const { state, item, record, input } = setup();
  const tiktok = fixture({
    id: 'synced-tiktok',
    platform: 'TikTok',
    external_id: '6718335390845095173',
    permalink: 'https://www.tiktok.com/@creator/video/6718335390845095173'
  });
  const media = [record, tiktok];
  const originalStage = item.stageId;
  applyPublicationPostLink(state, preparePublicationPostLink(state, media, input));
  assert.equal(item.stageId, originalStage);
  applyPublicationPostLink(
    state,
    preparePublicationPostLink(state, media, {
      itemId: item.id,
      publicationId: item.publications[1].id,
      mediaId: tiktok.id
    })
  );
  assert.equal(item.stageId, 'posted');
  assert.equal(liveItemPublications(item, media).length, 2);
});

test('an unscheduled caption on another channel still counts as an intended publication', () => {
  const { state, item, record, input } = setup();
  item.publications[1].date = '';
  item.publications[1].caption = 'My TikTok plan';
  const originalStage = item.stageId;
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.equal(item.stageId, originalStage);
});

test('removing a match restores original references and stage while retaining later edits', () => {
  const { state, item, publication, record, input } = setup();
  item.publications[1].date = '';
  publication.url = 'https://www.instagram.com/reel/Previous123/';
  publication.postId = 'Previous123';
  const before = structuredClone(item);
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  publication.caption = 'Edited after linking';
  publication.date = '2026-11-02';
  removePublicationPostLink(state, item.id, publication.id);
  assert.equal(publication.url, before.publications[0].url);
  assert.equal(publication.postId, before.publications[0].postId);
  assert.equal(publication.state, before.publications[0].state);
  assert.equal(publication.publishedAt, before.publications[0].publishedAt);
  assert.equal(publication.linkedPost, undefined);
  assert.equal(item.stageId, before.stageId);
  assert.equal(publication.caption, 'Edited after linking');
  assert.equal(publication.date, '2026-11-02');
  assert.deepEqual(item.tasks, before.tasks);
});

test('replacing or reconfirming a post retains the original undo snapshot', () => {
  const { state, item, publication, record, input } = setup();
  item.publications[1].date = '';
  const originalStage = item.stageId;
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  record.linked_item_id = item.id;
  const previous = structuredClone(publication.linkedPost);
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.deepEqual(publication.linkedPost, previous);
  const replacement = fixture({
    id: 'replacement',
    external_id: '180999',
    permalink: 'https://www.instagram.com/reel/Replacement123/'
  });
  const prepared = preparePublicationPostLink(state, [record, replacement], {
    ...input,
    mediaId: replacement.id
  });
  assert.equal(prepared.previousRecord?.id, record.id);
  assert.equal(prepared.previousLinkedItemId, '');
  applyPublicationPostLink(state, prepared);
  removePublicationPostLink(state, item.id, publication.id);
  assert.equal(publication.url, '');
  assert.equal(publication.state, 'planned');
  assert.equal(item.stageId, originalStage);
});

test('links survive saved workspaces and malformed link metadata is rejected', () => {
  const { state, publication, record, input } = setup();
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.deepEqual(parseWorkspace(JSON.stringify(state)), state);
  const valid = structuredClone(publication.linkedPost);
  for (const invalid of [
    null,
    { ...valid, mediaId: 123 },
    { ...valid, previous: {} },
    { ...valid, previousLinkedItemId: null }
  ]) {
    const data = structuredClone(state);
    Object.assign(data.items[0].publications[0], { linkedPost: invalid });
    assert.throws(() => validateWorkspace(data), /unsupported format/);
  }
});

test('pasted links, uploads, archived records and invalid timestamps cannot be marked live', () => {
  for (const overrides of [
    { source: 'link' as const },
    { source: 'upload' as const },
    { archived_at: '2026-10-24T02:00:00Z' },
    { published_at: null },
    { published_at: 'invalid-date' },
    { external_id: null },
    { permalink: 'https://evil.example/reel/Actual123/' }
  ]) {
    const { state, record, input } = setup();
    Object.assign(record, overrides);
    const before = structuredClone(state);
    assert.throws(() => preparePublicationPostLink(state, [record], input));
    assert.deepEqual(state, before);
  }
});

test('a post on another channel or matched to another idea cannot be claimed', () => {
  const { state, record, input } = setup();
  assert.throws(
    () => preparePublicationPostLink(state, [fixture({ ...record, platform: 'TikTok' })], input),
    /Instagram post/
  );
  record.linked_item_id = 'another-idea';
  assert.throws(() => preparePublicationPostLink(state, [record], input), /another idea/);
  record.linked_item_id = '';
  const other = structuredClone(seed().items[1]);
  other.publications[0].url = record.permalink;
  state.items.push(other);
  assert.throws(() => preparePublicationPostLink(state, [record], input), /Already matched/);
});

test('post selection filters by channel and search and explains unavailable matches', () => {
  const { state, item, publication, record } = setup();
  const unavailable = fixture({
    id: 'claimed',
    external_id: '180999',
    permalink: 'https://www.instagram.com/reel/Claimed123/',
    linked_item_id: 'other'
  });
  const tiktok = fixture({ id: 'tiktok', platform: 'TikTok' });
  const choices = publishedPostCandidates(
    state,
    [record, unavailable, tiktok],
    item,
    publication,
    'published'
  );
  assert.equal(choices.length, 2);
  assert.equal(choices.find(choice => choice.record.id === record.id)?.unavailableReason, '');
  assert.match(
    choices.find(choice => choice.record.id === unavailable.id)?.unavailableReason || '',
    /another idea/
  );
  assert.equal(publishedPostCandidates(state, [record], item, publication, 'unrelated').length, 0);
});

test('custom Posted stages are respected and a workspace without one still links safely', () => {
  const { state, item, record, input } = setup();
  item.publications[1].date = '';
  state.stages.find(stage => stage.kind === 'posted')!.id = 'went-live';
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.equal(item.stageId, 'went-live');
  removePublicationPostLink(state, item.id, input.publicationId);
  const originalStage = item.stageId;
  state.stages = state.stages.filter(stage => stage.kind !== 'posted');
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  assert.equal(item.stageId, originalStage);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('undo remains safe after the previous workflow stage has been removed', () => {
  const { state, item, record, input } = setup();
  item.publications[1].date = '';
  const previousStage = item.stageId;
  applyPublicationPostLink(state, preparePublicationPostLink(state, [record], input));
  state.stages = state.stages.filter(stage => stage.id !== previousStage);
  removePublicationPostLink(state, item.id, input.publicationId);
  assert.equal(state.stages.find(stage => stage.id === item.stageId)?.kind, 'prep');
  assert.doesNotThrow(() => validateWorkspace(state));
});
