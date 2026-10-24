export type SocialPlatform = 'Instagram' | 'TikTok';
export type MediaSource = 'api' | 'link' | 'upload';
export type MediaKind = 'video' | 'image' | 'carousel';
export type MediaMetrics = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
};

export type MediaRecord = {
  id: string;
  owner_id: string;
  platform: SocialPlatform | null;
  external_id: string | null;
  source: MediaSource;
  media_type: MediaKind;
  title: string;
  caption: string;
  permalink: string;
  thumbnail_url: string;
  media_url: string;
  storage_path: string;
  published_at: string | null;
  duration: number | null;
  metrics: MediaMetrics;
  metrics_updated_at: string | null;
  linked_item_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialAccount = {
  id: string;
  owner_id: string;
  platform: SocialPlatform;
  external_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: 'connected' | 'reconnect_required' | 'disconnected';
  last_synced_at: string | null;
  last_error: string;
  metric_note: string;
  cursor: string | null;
  has_more: boolean;
  sync_lock_until: string | null;
  updated_at: string;
};

export type ProviderSetup = {
  platform: SocialPlatform;
  configured: boolean;
  missing: string[];
  callbackUrl: string;
};
export type MediaLibrarySnapshot = {
  media: MediaRecord[];
  accounts: SocialAccount[];
  setup: ProviderSetup[];
  partial: boolean;
};
export type SocialToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string | null;
  scopes: string[];
  externalId: string;
};
export type StoredSocialToken = { owner_id: string; platform: SocialPlatform; payload: string };
export type OAuthState = {
  state_hash: string;
  owner_id: string;
  platform: SocialPlatform;
  return_origin: string;
  expires_at: string;
};
export type SocialEnvironment = {
  supabaseUrl: string;
  appUrl: string;
  encryptionKey: string;
  instagramAppId: string;
  instagramAppSecret: string;
  instagramVersion: string;
  tiktokClientKey: string;
  tiktokClientSecret: string;
};
export type ProviderProfile = {
  externalId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
};
export type ImportedMedia = {
  external_id: string;
  platform: SocialPlatform;
  media_type: MediaKind;
  title: string;
  caption: string;
  permalink: string;
  thumbnail_url: string;
  media_url: string;
  published_at: string | null;
  duration: number | null;
  metrics: MediaMetrics;
  metrics_updated_at: string | null;
};
export type ProviderPage = {
  media: ImportedMedia[];
  cursor: string | null;
  hasMore: boolean;
  metricNote: string;
};
export type SocialCommand =
  | { action: 'library' }
  | { action: 'connect'; platform: SocialPlatform; returnOrigin: string }
  | { action: 'sync'; platform: SocialPlatform; older: boolean }
  | { action: 'disconnect'; platform: SocialPlatform }
  | { action: 'import_link'; url: string; title: string; linkedItemId: string }
  | {
      action: 'register_upload';
      path: string;
      title: string;
      duration: number | null;
      linkedItemId: string;
    }
  | { action: 'update_media'; id: string; linkedItemId: string; archived: boolean };

export type PerformancePost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  caption: string;
  captionTruncated: boolean;
  url: string;
  mediaType: MediaKind;
  duration: number | null;
  publishedAt: string | null;
  metrics: MediaMetrics;
  measuredAt: string | null;
  daysAtMeasurement: number | null;
  interactionsPerView: number | null;
  linkedItemId: string;
};
export type PerformanceMetric = keyof MediaMetrics | 'interactionsPerView';
export type PerformanceMetricSummary = {
  measuredPosts: number;
  median: number | null;
  topPostIds: string[];
  bottomPostIds: string[];
};
export type PerformanceGroup = {
  platform: SocialPlatform;
  mediaType: MediaKind;
  posts: number;
  metrics: Record<PerformanceMetric, PerformanceMetricSummary>;
};
export type PerformanceContext = {
  status: 'available' | 'not_connected' | 'unavailable';
  accounts: {
    platform: SocialPlatform;
    status: string;
    lastSyncedAt: string | null;
    hasMore: boolean;
    metricNote: string;
  }[];
  posts: PerformancePost[];
  groups: PerformanceGroup[];
  coverage: { loadedPosts: number; describedPosts: number; libraryPartial: boolean };
  partial: boolean;
};
