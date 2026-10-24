import type { Item, Platform, Publication } from '../../../lib/types.ts';
import type {
  MediaMetrics,
  MediaRecord
} from '../../../supabase/functions/_shared/social-types.ts';

export type AnalyticsProps = { item?: Item };
export type AnalyticsPeriod = '30' | '90' | 'all';
export type AnalyticsSummary = {
  totals: MediaMetrics;
  posts: number;
  measuredViews: number;
  leaders: MediaRecord[];
};
export const analyticsPeriods: [AnalyticsPeriod, string][] = [
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['all', 'All imported posts']
];
export function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
  return analyticsPeriods.some(([period]) => period === value);
}
export function analyticsSummary(
  records: MediaRecord[],
  period: AnalyticsPeriod,
  now = new Date()
): AnalyticsSummary {
  const cutoff =
    period === 'all' ? '' : new Date(now.getTime() - Number(period) * 86400_000).toISOString();
  const measured = records.filter(
    record =>
      record.source === 'api' &&
      !record.archived_at &&
      record.metrics_updated_at &&
      (!cutoff || (record.published_at && record.published_at >= cutoff))
  );
  function total(key: keyof MediaMetrics): number | null {
    const available = measured.flatMap(record =>
      record.metrics[key] === null ? [] : [record.metrics[key]]
    );
    return available.length ? available.reduce((sum, value) => sum + value, 0) : null;
  }
  return {
    totals: {
      views: total('views'),
      likes: total('likes'),
      comments: total('comments'),
      shares: total('shares'),
      saves: total('saves'),
      reach: total('reach')
    },
    posts: measured.length,
    measuredViews: measured.filter(record => record.metrics.views !== null).length,
    leaders: [...measured]
      .filter(record => record.metrics.views !== null)
      .sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0))
      .slice(0, 4)
  };
}

export const analyticsPlatforms: Platform[] = ['Instagram', 'TikTok'];
export const metricLabels = ['Views', 'Likes', 'Comments'];

export function publicationRecordLabel(publication: Publication): string {
  const status = publication.state === 'manually_posted' ? 'Manually posted' : 'Planned';
  return `${publication.platform}: ${status}${publication.url ? ' · Link saved' : ''}`;
}
