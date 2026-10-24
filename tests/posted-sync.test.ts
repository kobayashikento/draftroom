import assert from 'node:assert/strict';
import test from 'node:test';
import { seed } from '../lib/model.ts';
import { togglePublicationPosted } from '../components/editors/publication.helpers.ts';
import { postedSyncPlatforms } from '../components/media/posted-sync.helpers.ts';
import {
  applyPublicationPostLink,
  preparePublicationPostLink
} from '../components/media/publication-link.helpers.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';

test('opening a workspace or adding an already posted idea does not request a sync', () => {
  const before = seed();
  before.items[0].stageId = 'posted';
  assert.deepEqual(postedSyncPlatforms(null, before), []);
  assert.deepEqual(postedSyncPlatforms(before, structuredClone(before)), []);
  const after = structuredClone(before);
  after.items.push({ ...structuredClone(before.items[0]), id: 'imported-posted-idea' });
  assert.deepEqual(postedSyncPlatforms(before, after), []);
});

test('moving into Posted syncs the intended channels and leaves the plan intact', () => {
  const before = seed();
  before.items[0].publications[1].date = '';
  const after = structuredClone(before);
  after.items[0].stageId = 'posted';
  const saved = structuredClone(after);
  assert.deepEqual(postedSyncPlatforms(before, after), ['Instagram']);
  assert.deepEqual(after, saved);
  assert.equal(after.items[0].publications[0].state, 'planned');
  assert.ok(after.items[0].tasks.some(task => !task.done));
});

test('an idea without channel plans checks both platforms while a caption identifies intent', () => {
  const before = seed();
  before.items[0].publications.forEach(pub => {
    pub.date = '';
  });
  const after = structuredClone(before);
  after.items[0].stageId = 'posted';
  assert.deepEqual(postedSyncPlatforms(before, after), ['Instagram', 'TikTok']);
  after.items[0].publications[1].caption = 'Only planned for TikTok';
  assert.deepEqual(postedSyncPlatforms(before, after), ['TikTok']);
});

test('a channel manual-posted change syncs only that platform without changing the idea stage', () => {
  const before = seed();
  const after = structuredClone(before);
  togglePublicationPosted(after.items[0], after.items[0].publications[1].id);
  assert.deepEqual(postedSyncPlatforms(before, after), ['TikTok']);
  assert.equal(after.items[0].stageId, before.items[0].stageId);
  assert.deepEqual(postedSyncPlatforms(after, before), [], 'undo does not sync');
});

test('batch posted changes deduplicate each platform and ordinary edits do not repeat the sync', () => {
  const before = seed();
  const after = structuredClone(before);
  after.items[0].stageId = 'posted';
  after.items[1].stageId = 'posted';
  togglePublicationPosted(after.items[0], after.items[0].publications[0].id);
  assert.deepEqual(postedSyncPlatforms(before, after), ['Instagram', 'TikTok']);
  const edited = structuredClone(after);
  edited.items[0].title = 'A new title';
  edited.items[0].publications[0].caption = 'A new caption';
  edited.items[0].tasks[0].done = true;
  assert.deepEqual(postedSyncPlatforms(after, edited), []);
});

test('custom stage kinds work without syncing for stage configuration or leaving Posted', () => {
  const before = seed();
  before.stages.push({ id: 'live', name: 'Out in the world', kind: 'posted' });
  const after = structuredClone(before);
  after.items[0].stageId = 'live';
  assert.deepEqual(postedSyncPlatforms(before, after), ['Instagram', 'TikTok']);
  const moved = structuredClone(after);
  moved.items[0].stageId = 'posted';
  assert.deepEqual(postedSyncPlatforms(after, moved), []);
  assert.deepEqual(postedSyncPlatforms(after, before), []);
  const configured = structuredClone(before);
  configured.stages.find(stage => stage.id === configured.items[0].stageId)!.kind = 'posted';
  assert.deepEqual(postedSyncPlatforms(before, configured), []);
});

test('matching a synced post does not launch a redundant sync when it marks the idea Posted', () => {
  const before = seed();
  before.items[0].publications[1].date = '';
  const after = structuredClone(before);
  const item = after.items[0];
  const record = {
    ...newMediaRecord('owner', { title: 'Already synced', source: 'api' }),
    platform: 'Instagram' as const,
    external_id: '18012345',
    permalink: 'https://www.instagram.com/reel/Actual123/',
    published_at: '2026-10-24T10:00:00Z'
  };
  applyPublicationPostLink(
    after,
    preparePublicationPostLink(after, [record], {
      itemId: item.id,
      publicationId: item.publications[0].id,
      mediaId: record.id
    })
  );
  assert.equal(item.stageId, 'posted');
  assert.deepEqual(postedSyncPlatforms(before, after), []);
  const editing = structuredClone(after);
  editing.items[0].stageId = 'editing';
  assert.deepEqual(postedSyncPlatforms(editing, after), ['Instagram']);
});
