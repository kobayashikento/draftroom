import type {
  ImportedMedia,
  MediaMetrics,
  MediaRecord,
  PerformanceContext,
  SocialAccount,
  SocialPlatform
} from './social-types.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function text(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export function metric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function emptyMetrics(): MediaMetrics {
  return { views: null, likes: null, comments: null, shares: null, saves: null, reach: null };
}

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return value === 'Instagram' || value === 'TikTok';
}

export function safeHttpsUrl(value: unknown): string {
  try {
    const url = new URL(text(value, 8000));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function canonicalPost(value: string): {
  platform: SocialPlatform;
  id: string;
  url: string;
  embed: string;
} {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Paste a full Instagram or TikTok post link.');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Use a secure Instagram or TikTok post link.');
  const host = url.hostname.toLowerCase();
  if (host === 'instagram.com' || host === 'www.instagram.com') {
    const match = url.pathname.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,100})\/?$/);
    if (match) {
      const kind = match[1] === 'reels' ? 'reel' : match[1];
      const canonical = `https://www.instagram.com/${kind}/${match[2]}/`;
      return { platform: 'Instagram', id: match[2], url: canonical, embed: `${canonical}embed/` };
    }
  }
  if (host === 'tiktok.com' || host === 'www.tiktok.com') {
    const match = url.pathname.match(/^\/@[A-Za-z0-9._-]+\/(?:video|photo)\/(\d{10,30})\/?$/);
    if (match)
      return {
        platform: 'TikTok',
        id: match[1],
        url: `https://www.tiktok.com${url.pathname.replace(/\/$/, '')}`,
        embed: `https://www.tiktok.com/player/v1/${match[1]}?autoplay=0&rel=0`
      };
  }
  throw new Error(
    'Use a full post link: instagram.com/reel/… or tiktok.com/@name/video/… . Open shortened TikTok share links first.'
  );
}

export function mediaEmbed(record: MediaRecord): string {
  try {
    return canonicalPost(record.permalink).embed;
  } catch {
    return '';
  }
}

export function newMediaRecord(
  ownerId: string,
  values: { title: string; source: MediaRecord['source']; linkedItemId?: string }
): MediaRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    owner_id: ownerId,
    platform: null,
    external_id: null,
    source: values.source,
    media_type: 'video',
    title: values.title.slice(0, 240),
    caption: '',
    permalink: '',
    thumbnail_url: '',
    media_url: '',
    storage_path: '',
    published_at: null,
    duration: null,
    metrics: emptyMetrics(),
    metrics_updated_at: null,
    linked_item_id: values.linkedItemId || '',
    archived_at: null,
    created_at: now,
    updated_at: now
  };
}

export function mergeImportedMedia(
  existing: MediaRecord | undefined,
  incoming: ImportedMedia,
  ownerId: string
): MediaRecord {
  return {
    ...(existing || newMediaRecord(ownerId, { title: incoming.title, source: 'api' })),
    ...incoming,
    source: 'api',
    updated_at: new Date().toISOString()
  };
}

export function performanceContext(
  media: MediaRecord[],
  accounts: SocialAccount[],
  partial = false
): PerformanceContext {
  const measured = media.filter(
    record =>
      record.source === 'api' && record.platform && record.metrics_updated_at && !record.archived_at
  );
  const recent = [...measured]
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
    .slice(0, 20);
  const leaders = [...measured]
    .filter(record => record.metrics.views !== null)
    .sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0))
    .slice(0, 10);
  const selected = [
    ...new Map([...recent, ...leaders].map(record => [record.id, record])).values()
  ];
  return {
    status: measured.length
      ? 'available'
      : accounts.some(account => account.status === 'connected')
        ? 'available'
        : 'not_connected',
    accounts: accounts.map(account => ({
      platform: account.platform,
      status: account.status,
      lastSyncedAt: account.last_synced_at
    })),
    posts: selected.flatMap(record =>
      record.platform && record.metrics_updated_at
        ? [
            {
              id: record.id,
              platform: record.platform,
              title: record.title.slice(0, 240),
              caption: record.caption.slice(0, 600),
              publishedAt: record.published_at,
              metrics: record.metrics,
              measuredAt: record.metrics_updated_at,
              linkedItemId: record.linked_item_id
            }
          ]
        : []
    ),
    partial: partial || measured.length > selected.length
  };
}
