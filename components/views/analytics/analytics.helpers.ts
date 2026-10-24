import type { Item, Platform, Publication } from '../../../lib/types.ts';

export type AnalyticsProps = { item?: Item };

export const analyticsPlatforms: Platform[] = ['Instagram', 'TikTok'];
export const metricLabels = ['Views', 'Likes', 'Comments'];

export function publicationRecordLabel(publication: Publication): string {
  const status = publication.state === 'manually_posted' ? 'Manually posted' : 'Planned';
  return `${publication.platform}: ${status}${publication.url ? ' · Link saved' : ''}`;
}
