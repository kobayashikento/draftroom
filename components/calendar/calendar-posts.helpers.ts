import type { CalendarEntryOptions, PublicationEntry, Workspace } from '../../lib/types.ts';
import type { MediaRecord } from '../../supabase/functions/_shared/social-types.ts';
import { canonicalPost } from '../../supabase/functions/_shared/media-helpers.ts';
import {
  publicationLocalDate,
  assessPublicationMedia
} from '../media/publication-media.helpers.ts';
import { calendarEntries } from './calendar.helpers.ts';
import type { CalendarSyncedPost, CalendarTimeline } from './calendar.helpers.ts';

export function calendarPostFormat(record: MediaRecord): 'Photo' | 'Carousel' | 'Reel' {
  return record.media_type === 'image'
    ? 'Photo'
    : record.media_type === 'carousel'
      ? 'Carousel'
      : 'Reel';
}

function postIdentity(record: MediaRecord): string {
  try {
    const post = canonicalPost(record.permalink);
    if (post.platform === record.platform) return `${post.platform}:${post.id}`;
  } catch {
    // An API record can still be identified by its platform media ID.
  }
  return `${record.platform}:${record.external_id || record.id}`;
}

/** Project published media into the calendar without creating or rewriting planning records. */
export function calendarTimeline(
  state: Workspace,
  media: MediaRecord[],
  options: CalendarEntryOptions = {},
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
): CalendarTimeline {
  const postsByIdentity = new Map<string, CalendarSyncedPost>();
  for (const record of [...media].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    if (record.source !== 'api' || !record.platform || !record.published_at || record.archived_at)
      continue;
    const date = publicationLocalDate(record.published_at, timeZone);
    if (!date) continue;
    const identity = postIdentity(record);
    if (!postsByIdentity.has(identity))
      postsByIdentity.set(identity, {
        record: {
          ...record,
          source: 'api',
          platform: record.platform,
          published_at: record.published_at
        },
        date,
        item: null,
        issues: []
      });
  }
  const allPosts = [...postsByIdentity.values()];
  const postsById = new Map(allPosts.map(post => [post.record.id, post]));
  const matches = new Map<string, PublicationEntry[]>();
  const matchedPublications = new Set<string>();
  for (const p of state.items) {
    for (const pub of p.publications) {
      const assessment = assessPublicationMedia(p, pub, media, timeZone);
      const record = assessment.record;
      if (!record) continue;
      const post = postsById.get(record.id);
      if (!post) continue;
      post.issues = [...new Set([...post.issues, ...assessment.issues])];
      matchedPublications.add(pub.id);
      const entries = matches.get(record.id) || [];
      entries.push({ p, pub });
      matches.set(record.id, entries);
    }
  }
  const search = options.query?.trim().toLocaleLowerCase();
  const posts = allPosts.filter(post => {
    const linked = state.items.find(item => item.id === post.record.linked_item_id);
    const matchedItems = [
      ...new Map((matches.get(post.record.id) || []).map(({ p }) => [p.id, p])).values()
    ];
    post.item = linked || (matchedItems.length === 1 ? matchedItems[0] : null);
    return (
      !options.unscheduled &&
      (!options.start || post.date >= options.start) &&
      (!options.end || post.date <= options.end) &&
      (!options.platform || post.record.platform === options.platform) &&
      (!options.format || calendarPostFormat(post.record) === options.format) &&
      (!options.seriesId || post.item?.seriesId === options.seriesId) &&
      (!options.status || options.status === 'synced') &&
      (!search ||
        `${post.record.title} ${post.record.caption} ${post.item?.title || ''} ${post.item?.tags || ''}`
          .toLocaleLowerCase()
          .includes(search))
    );
  });
  const unmatched = ({ pub }: PublicationEntry) => !matchedPublications.has(pub.id);
  return {
    entries: calendarEntries(state, options).filter(unmatched),
    posts: posts.sort((a, b) => a.record.published_at.localeCompare(b.record.published_at)),
    unscheduled: calendarEntries(state, { ...options, unscheduled: true }).filter(unmatched)
  };
}
