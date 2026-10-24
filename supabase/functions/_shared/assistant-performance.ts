import type {
  MediaRecord,
  PerformanceContext,
  PerformanceGroup,
  PerformanceMetric,
  PerformanceMetricSummary,
  PerformancePost,
  SocialAccount
} from './social-types.ts';
import { canonicalPost, emptyMetrics, isSocialPlatform, metric } from './media-helpers.ts';
import { workspaceLinkHref } from '../../../lib/workspace-links.ts';

export const PERFORMANCE_LIBRARY_LIMIT = 1000;
export const PERFORMANCE_POST_LIMIT = 300;
const metrics: PerformanceMetric[] = [
  'views',
  'likes',
  'comments',
  'shares',
  'saves',
  'reach',
  'interactionsPerView'
];

function performancePost(record: MediaRecord): PerformancePost {
  const measuredAt = record.metrics_updated_at;
  const counts = measuredAt
    ? {
        views: metric(record.metrics.views),
        likes: metric(record.metrics.likes),
        comments: metric(record.metrics.comments),
        shares: metric(record.metrics.shares),
        saves: metric(record.metrics.saves),
        reach: metric(record.metrics.reach)
      }
    : emptyMetrics();
  const { views, likes, comments, shares } = counts;
  const published = Date.parse(record.published_at || '');
  const measured = Date.parse(measuredAt || '');
  let url = '';
  try {
    const post = canonicalPost(record.permalink);
    if (post.platform === record.platform) url = post.url;
  } catch {
    /* Invalid post references are never sent as links. */
  }
  return {
    id: record.id,
    platform: record.platform!,
    title: record.title.slice(0, 240),
    caption: record.caption.slice(0, 1200),
    captionTruncated: record.caption.length > 1200,
    url,
    href: workspaceLinkHref({ type: 'post', id: record.id }),
    mediaType: record.media_type,
    duration: metric(record.duration),
    publishedAt: record.published_at,
    measuredAt,
    daysAtMeasurement:
      Number.isFinite(published) && Number.isFinite(measured) && measured >= published
        ? Math.round(((measured - published) / 86400_000) * 10) / 10
        : null,
    metrics: counts,
    interactionsPerView:
      views !== null && views > 0 && likes !== null && comments !== null && shares !== null
        ? Math.round(((likes + comments + shares) / views) * 10000) / 100
        : null,
    linkedItemId: record.linked_item_id
  };
}

function metricValue(post: PerformancePost, key: PerformanceMetric): number | null {
  return key === 'interactionsPerView' ? post.interactionsPerView : post.metrics[key];
}

function metricSummary(posts: PerformancePost[], key: PerformanceMetric): PerformanceMetricSummary {
  const ranked = posts
    .filter(post => metricValue(post, key) !== null)
    .sort((a, b) => metricValue(a, key)! - metricValue(b, key)! || a.id.localeCompare(b.id));
  const middle = Math.floor(ranked.length / 2);
  return {
    measuredPosts: ranked.length,
    median: !ranked.length
      ? null
      : ranked.length % 2
        ? metricValue(ranked[middle], key)
        : (metricValue(ranked[middle - 1], key)! + metricValue(ranked[middle], key)!) / 2,
    topPostIds: [...ranked]
      .reverse()
      .slice(0, 3)
      .map(post => post.id),
    bottomPostIds: ranked.slice(0, 3).map(post => post.id)
  };
}

function performanceGroups(posts: PerformancePost[]): PerformanceGroup[] {
  const groups = new Map<string, PerformancePost[]>();
  for (const post of posts) {
    const key = `${post.platform}:${post.mediaType}`;
    const group = groups.get(key) || [];
    group.push(post);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    platform: group[0].platform,
    mediaType: group[0].mediaType,
    posts: group.length,
    metrics: {
      views: metricSummary(group, 'views'),
      likes: metricSummary(group, 'likes'),
      comments: metricSummary(group, 'comments'),
      shares: metricSummary(group, 'shares'),
      saves: metricSummary(group, 'saves'),
      reach: metricSummary(group, 'reach'),
      interactionsPerView: metricSummary(group, 'interactionsPerView')
    }
  }));
}

export function unavailablePerformance(): PerformanceContext {
  return {
    status: 'unavailable',
    accounts: [],
    posts: [],
    groups: [],
    partial: false,
    coverage: { loadedPosts: 0, describedPosts: 0, libraryPartial: false }
  };
}

export function performanceContext(
  media: MediaRecord[],
  accounts: SocialAccount[],
  partial = false,
  question = ''
): PerformanceContext {
  const posts = media
    .filter(
      record => record.source === 'api' && isSocialPlatform(record.platform) && !record.archived_at
    )
    .map(performancePost);
  const groups = performanceGroups(posts);
  const selected = new Map<string, PerformancePost>();
  if (posts.length <= PERFORMANCE_POST_LIMIT) posts.forEach(post => selected.set(post.id, post));
  else {
    const byId = new Map(posts.map(post => [post.id, post]));
    // Include every ranked example, including low performers and platforms with fewer views.
    for (const group of groups)
      for (const key of metrics) {
        const ranking = group.metrics[key];
        for (const id of [...ranking.topPostIds, ...ranking.bottomPostIds])
          selected.set(id, byId.get(id)!);
      }
    // Keep named posts available for follow-up questions even outside the rankings.
    const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [])].slice(-80);
    const relevant = posts
      .map(post => {
        const description = `${post.id} ${post.title} ${post.caption} ${post.url}`.toLowerCase();
        return { post, score: words.filter(word => description.includes(word)).length };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    relevant.forEach(({ post }) => selected.set(post.id, post));
    [...posts]
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 20)
      .forEach(post => selected.set(post.id, post));
  }
  const described = [...selected.values()].slice(0, PERFORMANCE_POST_LIMIT);
  return {
    status:
      posts.length || accounts.some(account => account.status === 'connected')
        ? 'available'
        : 'not_connected',
    accounts: accounts.map(account => ({
      platform: account.platform,
      status: account.status,
      lastSyncedAt: account.last_synced_at,
      hasMore: account.has_more,
      metricNote: account.metric_note.slice(0, 600)
    })),
    posts: described,
    groups,
    coverage: {
      loadedPosts: posts.length,
      describedPosts: described.length,
      libraryPartial: partial
    },
    partial: partial || described.length < posts.length
  };
}
