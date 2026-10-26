import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Item, Publication } from '../../lib/types.ts';
import { resolvePublicationMedia } from './publication-media.helpers.ts';
import type { PublicationPostLinkInput } from './publication-link.helpers.ts';
import type {
  MediaLibrarySnapshot,
  MediaRecord,
  ProviderSetup,
  SocialPlatform
} from '../../supabase/functions/_shared/social-types.ts';
import {
  canonicalPost,
  emptyMetrics,
  isRecord,
  isSocialPlatform,
  mediaEmbed,
  newMediaRecord
} from '../../supabase/functions/_shared/media-helpers.ts';

export type {
  MediaRecord,
  MediaMetrics,
  ProviderSetup,
  SocialAccount,
  SocialPlatform
} from '../../supabase/functions/_shared/social-types.ts';
export type MediaSort = 'newest' | 'views' | 'engagement';
export type MediaScope = 'all' | 'Instagram' | 'TikTok';
export type MediaFilters = { query: string; scope: MediaScope; sort: MediaSort; archived: boolean };
export type MediaToolbarProps = {
  filters: MediaFilters;
  count: number;
  onChange: <K extends keyof MediaFilters>(key: K, value: MediaFilters[K]) => void;
};
export type MediaLibraryProps = { children: ReactNode; onOpenLibrary: () => void };
export type MediaCardProps = { record: MediaRecord; onOpen: () => void };
export type MediaCoverProps = { record: MediaRecord };
export type MetricTileProps = { label: string; value: number | null; icon: LucideIcon };
export type MediaPlayerProps = { record: MediaRecord };
export type MediaDetailProps = { record: MediaRecord; close: () => void; readOnly?: boolean };
export type AccountConnectionsProps = { compact?: boolean };
export type ConnectionSetupProps = { setup: ProviderSetup; close: () => void };
export type AddPostLinkDialogProps = {
  close: () => void;
  itemId?: string;
  onAdded?: (id: string) => void;
};
export type PublicationPreviewProps = { item: Item; publication: Publication };
export type MediaController = MediaLibrarySnapshot & {
  loading: boolean;
  refreshing: boolean;
  error: string;
  busy: string;
  cloud: boolean;
  refresh: () => Promise<void>;
  connect: (platform: SocialPlatform) => Promise<void>;
  sync: (platform: SocialPlatform, older?: boolean) => Promise<void>;
  disconnect: (platform: SocialPlatform) => Promise<void>;
  importLink: (url: string, title: string, linkedItemId: string) => Promise<string>;
  updateMedia: (record: MediaRecord, linkedItemId: string, archived: boolean) => Promise<void>;
  linkPublication: (input: PublicationPostLinkInput) => Promise<void>;
  unlinkPublication: (itemId: string, publicationId: string) => Promise<void>;
  openLibrary: () => void;
};

export const LOCAL_MEDIA_KEY = 'draftroom:media:local:v1';
export const defaultMediaFilters: MediaFilters = {
  query: '',
  scope: 'all',
  sort: 'newest',
  archived: false
};
export const mediaSortOptions: [MediaSort, string][] = [
  ['newest', 'Newest first'],
  ['views', 'Most viewed'],
  ['engagement', 'Most interactions']
];
export const mediaScopeOptions: [MediaScope, string][] = [
  ['all', 'Everything'],
  ['Instagram', 'Instagram'],
  ['TikTok', 'TikTok']
];
export const blankLibrary: MediaLibrarySnapshot = {
  media: [],
  accounts: [],
  setup: [],
  partial: false
};

export function isMediaSort(value: string): value is MediaSort {
  return mediaSortOptions.some(([key]) => key === value);
}
export function isMediaScope(value: string): value is MediaScope {
  return mediaScopeOptions.some(([key]) => key === value);
}

export function interactionCount(record: MediaRecord): number | null {
  const values = [
    record.metrics.likes,
    record.metrics.comments,
    record.metrics.shares,
    record.metrics.saves
  ].filter(value => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

export function filterMedia(records: MediaRecord[], filters: MediaFilters): MediaRecord[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return records
    .filter(
      record =>
        Boolean(record.archived_at) === filters.archived &&
        (!query || `${record.title} ${record.caption}`.toLocaleLowerCase().includes(query)) &&
        (filters.scope === 'all' || record.platform === filters.scope)
    )
    .sort((a, b) => {
      if (filters.sort === 'views') return (b.metrics.views ?? -1) - (a.metrics.views ?? -1);
      if (filters.sort === 'engagement')
        return (interactionCount(b) ?? -1) - (interactionCount(a) ?? -1);
      return (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at);
    });
}

export function formatMetric(value: number | null): string {
  return value === null
    ? '—'
    : new Intl.NumberFormat('en', {
        notation: value >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: 1
      }).format(value);
}

export function mediaDate(value: string | null): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(value)
      )
    : 'Not published';
}

export function durationLabel(seconds: number | null): string {
  if (seconds === null) return '';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function freshnessLabel(value: string | null): string {
  if (!value) return 'Not synced yet';
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60000));
  if (!Number.isFinite(minutes)) return 'Not synced yet';
  return minutes < 1
    ? 'Synced just now'
    : minutes < 60
      ? `Synced ${minutes}m ago`
      : minutes < 1440
        ? `Synced ${Math.floor(minutes / 60)}h ago`
        : `Synced ${Math.floor(minutes / 1440)}d ago`;
}

export function mediaForItem(records: MediaRecord[], item: Item): MediaRecord[] {
  const matchedIds = new Set(
    item.publications.map(
      publication => resolvePublicationMedia(item, publication, records).record?.id
    )
  );
  return records.filter(
    record =>
      !record.archived_at && (record.linked_item_id === item.id || matchedIds.has(record.id))
  );
}

export function sameMediaLink(first: string, second: string): boolean {
  try {
    const a = canonicalPost(first);
    const b = canonicalPost(second);
    return a.platform === b.platform && a.id === b.id;
  } catch {
    return false;
  }
}

export function publicationPreview(
  item: Item,
  publication: Publication,
  media: MediaRecord[]
): MediaRecord | null {
  return resolvePublicationMedia(item, publication, media).record;
}

export function playableEmbed(record: MediaRecord): string {
  return mediaEmbed(record);
}

export function localLinkRecord(url: string, title: string, linkedItemId: string): MediaRecord {
  const post = canonicalPost(url);
  return {
    ...newMediaRecord('local', {
      title: title.trim() || `${post.platform} video`,
      source: 'link',
      linkedItemId
    }),
    platform: post.platform,
    external_id: post.id,
    permalink: post.url
  };
}

export function validMediaRecord(value: unknown): value is MediaRecord {
  if (!isRecord(value) || !isRecord(value.metrics)) return false;
  return (
    [
      'id',
      'owner_id',
      'title',
      'caption',
      'permalink',
      'thumbnail_url',
      'media_url',
      'storage_path',
      'linked_item_id',
      'created_at',
      'updated_at'
    ].every(key => typeof value[key] === 'string') &&
    (value.platform === null || isSocialPlatform(value.platform)) &&
    ['api', 'link', 'upload'].includes(String(value.source)) &&
    ['video', 'image', 'carousel'].includes(String(value.media_type)) &&
    (value.external_id === null || typeof value.external_id === 'string') &&
    ['published_at', 'metrics_updated_at', 'archived_at'].every(
      key => value[key] === null || typeof value[key] === 'string'
    ) &&
    (value.duration === null ||
      (typeof value.duration === 'number' &&
        Number.isFinite(value.duration) &&
        value.duration >= 0)) &&
    Object.keys(emptyMetrics()).every(
      key =>
        value.metrics &&
        isRecord(value.metrics) &&
        (value.metrics[key] === null ||
          (typeof value.metrics[key] === 'number' &&
            Number.isFinite(value.metrics[key]) &&
            value.metrics[key] >= 0))
    )
  );
}

export function parseMediaSnapshot(value: unknown): MediaLibrarySnapshot {
  if (
    !isRecord(value) ||
    !Array.isArray(value.media) ||
    !value.media.every(validMediaRecord) ||
    !Array.isArray(value.accounts) ||
    !Array.isArray(value.setup) ||
    typeof value.partial !== 'boolean'
  )
    throw new Error('Your media library returned an unreadable response. Try refreshing.');
  if (
    !value.accounts.every(
      account =>
        isRecord(account) &&
        isSocialPlatform(account.platform) &&
        typeof account.id === 'string' &&
        typeof account.username === 'string' &&
        typeof account.display_name === 'string' &&
        typeof account.last_error === 'string' &&
        typeof account.metric_note === 'string' &&
        ['connected', 'reconnect_required', 'disconnected'].includes(String(account.status)) &&
        (account.last_synced_at === null || typeof account.last_synced_at === 'string') &&
        typeof account.has_more === 'boolean'
    )
  )
    throw new Error('Your connected accounts could not be read.');
  if (
    !value.setup.every(
      setup =>
        isRecord(setup) &&
        isSocialPlatform(setup.platform) &&
        typeof setup.configured === 'boolean' &&
        Array.isArray(setup.missing) &&
        setup.missing.every(name => typeof name === 'string') &&
        typeof setup.callbackUrl === 'string'
    )
  )
    throw new Error('The account setup details could not be read.');
  return value as MediaLibrarySnapshot;
}
