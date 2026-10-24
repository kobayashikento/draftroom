import assert from 'node:assert/strict';
import test from 'node:test';
import { seed } from '../lib/model.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import {
  assessPublicationMedia,
  publicationLocalDate,
  resolvePublicationMedia
} from '../components/media/publication-media.helpers.ts';
import { mediaForItem, publicationPreview } from '../components/media/media.helpers.ts';

function fixture(platform: 'Instagram' | 'TikTok' = 'Instagram'): MediaRecord {
  return {
    ...newMediaRecord('owner', { title: 'An actual post', source: 'api' }),
    platform,
    external_id: platform === 'Instagram' ? '18012345678901234' : '6718335390845095173',
    permalink:
      platform === 'Instagram'
        ? 'https://www.instagram.com/reel/Correct123/'
        : 'https://www.tiktok.com/@creator/video/6718335390845095173',
    thumbnail_url: 'https://cdn.example/actual-cover.jpg',
    media_url: platform === 'Instagram' ? 'https://cdn.example/actual-video.mp4' : '',
    published_at: '2026-10-24T01:30:00Z',
    caption: 'A little morning ritual',
    metrics_updated_at: '2026-10-24T02:00:00Z'
  };
}

test('calendar and Publish resolve the exact URL across tracking parameters and prefer synced media', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const record = fixture();
  publication.url = 'https://instagram.com/p/Correct123/?igsh=tracking';
  const manual = {
    ...record,
    id: 'manual-link',
    source: 'link' as const,
    external_id: 'Correct123',
    thumbnail_url: ''
  };
  assert.equal(resolvePublicationMedia(item, publication, [manual, record]).record?.id, record.id);
  assert.equal(
    publicationPreview(item, publication, [manual, record])?.thumbnail_url,
    record.thumbnail_url
  );
  assert.equal(
    publicationPreview(item, publication, [manual, record])?.media_url,
    record.media_url
  );
});

test('the same idea gets different Instagram and TikTok media, including matches by platform post ID', () => {
  const item = seed().items[0];
  const instagram = fixture();
  const tiktok = fixture('TikTok');
  item.publications[0].postId = instagram.external_id!;
  item.publications[1].postId = tiktok.external_id!;
  for (const publication of item.publications) {
    const match = resolvePublicationMedia(item, publication, [tiktok, instagram]);
    assert.equal(match.basis, 'post_id');
    assert.equal(match.record?.platform, publication.platform);
  }
  assert.equal(mediaForItem([instagram, tiktok], item).length, 2);
});

test('a wrong-platform URL blocks all fallbacks and cannot leak into previews or matched analytics', () => {
  const item = seed().items[0];
  const tiktok = fixture('TikTok');
  item.publications[0].url = tiktok.permalink;
  const instagram = { ...fixture(), linked_item_id: item.id };
  const match = resolvePublicationMedia(item, item.publications[0], [instagram, tiktok]);
  assert.equal(match.record, null);
  assert.match(match.issue, /Instagram plan links to TikTok/);
  assert.equal(publicationPreview(item, item.publications[0], [instagram, tiktok]), null);
  assert.equal(mediaForItem([tiktok], item).length, 0);
});

test('a conflicting URL and post ID are reported instead of displaying a different post', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const correct = fixture();
  const other = {
    ...fixture(),
    id: 'different',
    external_id: '18099999999999999',
    permalink: 'https://www.instagram.com/reel/Different123/'
  };
  publication.url = correct.permalink;
  publication.postId = other.external_id;
  assert.match(
    resolvePublicationMedia(item, publication, [correct, other]).issue,
    /different posts/
  );
  assert.equal(publicationPreview(item, publication, [correct, other]), null);
  publication.postId = correct.external_id!;
  assert.equal(publicationPreview(item, publication, [correct])?.id, correct.id);
});

test('Instagram numeric media IDs can coexist with a shortcode URL before the API record is imported', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const record = fixture();
  publication.url = record.permalink;
  publication.postId = record.external_id!;
  const manual = {
    ...record,
    source: 'link' as const,
    external_id: 'Correct123',
    published_at: null
  };
  const match = resolvePublicationMedia(item, publication, [manual]);
  assert.equal(match.issue, '');
  assert.equal(match.record?.permalink, publication.url);
});

test('an explicit link never falls back to another linked clip when its imported record is missing', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const other = { ...fixture(), linked_item_id: item.id };
  publication.url = 'https://www.instagram.com/reel/Missing123/';
  const result = resolvePublicationMedia(item, publication, [other]);
  assert.equal(result.record?.source, 'link');
  assert.equal(result.record?.permalink, publication.url);
  assert.equal(result.record?.thumbnail_url, '');
  publication.url = 'https://instagram.com.evil.example/reel/Missing123/';
  assert.equal(resolvePublicationMedia(item, publication, [other]).record, null);
});

test('unique channel-specific idea links work, but multiple posts and similar titles do not select arbitrary media', () => {
  const item = seed().items[0];
  const first = { ...fixture(), linked_item_id: item.id };
  const second = {
    ...fixture(),
    id: 'second',
    external_id: '18099999999999999',
    permalink: 'https://www.instagram.com/reel/Second123/',
    linked_item_id: item.id
  };
  assert.equal(resolvePublicationMedia(item, item.publications[0], [first]).record?.id, first.id);
  assert.match(
    resolvePublicationMedia(item, item.publications[0], [first, second]).issue,
    /More than one/
  );
  const sameTitle = { ...first, linked_item_id: '', title: item.title };
  assert.equal(resolvePublicationMedia(item, item.publications[0], [sameTitle]).record, null);
});

test('archiving hides a default idea match but preserves an explicitly referenced publication', () => {
  const item = seed().items[0];
  const record = { ...fixture(), linked_item_id: item.id, archived_at: '2026-10-24T03:00:00Z' };
  assert.equal(resolvePublicationMedia(item, item.publications[0], [record]).record, null);
  item.publications[0].url = record.permalink;
  assert.equal(resolvePublicationMedia(item, item.publications[0], [record]).record?.id, record.id);
});

test('a private uploaded draft may illustrate a plan but never confirms or substitutes for a posted social video', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const upload = newMediaRecord('owner', {
    title: 'My clip',
    source: 'upload',
    linkedItemId: item.id
  });
  assert.equal(resolvePublicationMedia(item, publication, [upload]).basis, 'upload');
  assert.equal(assessPublicationMedia(item, publication, [upload]).confirmed, false);
  publication.state = 'manually_posted';
  const assessment = assessPublicationMedia(item, publication, [upload]);
  assert.equal(assessment.record, null);
  assert.equal(assessment.label, 'Manually posted · unverified');
});

test('manual links and post IDs without an imported record cannot claim platform verification', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  publication.state = 'manually_posted';
  publication.url = fixture().permalink;
  const result = assessPublicationMedia(item, publication, []);
  assert.equal(result.confirmed, false);
  assert.ok(result.record);
  publication.url = '';
  publication.postId = 'not-imported';
  assert.match(assessPublicationMedia(item, publication, []).issues.join(' '), /Sync the account/);
});

test('posted checks compare actual local publication date, caption and media format without mutating the plan', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const record = { ...fixture(), media_type: 'image' as const };
  publication.url = record.permalink;
  publication.date = '2026-10-24';
  publication.caption = 'A different caption';
  const original = structuredClone(item);
  const result = assessPublicationMedia(item, publication, [record], 'America/Toronto');
  assert.equal(result.actualDate, '2026-10-23');
  assert.equal(result.format, 'Photo');
  assert.equal(result.confirmed, true);
  assert.equal(result.issues.length, 4);
  assert.match(result.issues.join(' '), /Planned/);
  assert.match(result.issues.join(' '), /2026-10-23.*2026-10-24/);
  assert.match(result.issues.join(' '), /caption/);
  assert.match(result.issues.join(' '), /photo/);
  assert.deepEqual(item, original);
});

test('matching published details pass despite whitespace differences and handle time zones correctly', () => {
  const item = seed().items[0];
  const publication = item.publications[0];
  const record = fixture();
  publication.url = record.permalink;
  publication.state = 'manually_posted';
  publication.date = '2026-10-23';
  publication.caption = '  A little\n morning ritual  ';
  const result = assessPublicationMedia(item, publication, [record], 'America/Toronto');
  assert.deepEqual(result.issues, []);
  assert.equal(result.label, 'Synced post');
  assert.equal(publicationLocalDate(record.published_at, 'Asia/Tokyo'), '2026-10-24');
  assert.equal(publicationLocalDate('not-a-date', 'America/Toronto'), '');
});
