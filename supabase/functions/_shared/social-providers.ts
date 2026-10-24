import type {
  ImportedMedia,
  ProviderPage,
  ProviderProfile,
  SocialEnvironment,
  SocialPlatform,
  SocialToken
} from './social-types.ts';
import {
  canonicalPost,
  emptyMetrics,
  isRecord,
  metric,
  safeHttpsUrl,
  text
} from './media-helpers.ts';

export class SocialError extends Error {
  status: number;
  reconnect: boolean;
  constructor(message: string, status = 400, reconnect = false) {
    super(message);
    this.status = status;
    this.reconnect = reconnect;
  }
}

export function callbackUrl(env: SocialEnvironment): string {
  try {
    const url = new URL(env.appUrl);
    return url.protocol === 'https:' ? `${url.origin}/social/callback/` : '';
  } catch {
    return '';
  }
}

export function requiredScopes(platform: SocialPlatform): string[] {
  return platform === 'Instagram'
    ? ['instagram_business_basic', 'instagram_business_manage_insights']
    : ['user.info.basic', 'video.list'];
}

export function authorizationUrl(
  platform: SocialPlatform,
  state: string,
  env: SocialEnvironment
): string {
  const url = new URL(
    platform === 'Instagram'
      ? 'https://www.instagram.com/oauth/authorize'
      : 'https://www.tiktok.com/v2/auth/authorize/'
  );
  url.searchParams.set(
    platform === 'Instagram' ? 'client_id' : 'client_key',
    platform === 'Instagram' ? env.instagramAppId : env.tiktokClientKey
  );
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', requiredScopes(platform).join(','));
  url.searchParams.set('redirect_uri', callbackUrl(env));
  url.searchParams.set('state', state);
  if (platform === 'Instagram') url.searchParams.set('enable_fb_login', '0');
  return url.href;
}

export async function providerJson(
  url: string | URL,
  options: RequestInit = {},
  fetcher = fetch
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...options,
      signal: options.signal || AbortSignal.timeout(15_000),
      redirect: 'error'
    });
  } catch {
    throw new SocialError('The platform didn’t respond. Try syncing again in a moment.', 504);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SocialError('The platform returned an unreadable response. Try again later.', 502);
  }
  const error = isRecord(data) && isRecord(data.error) ? data.error : null;
  const failed = !response.ok || (error && error.code !== 'ok' && error.code !== 0);
  if (failed) {
    if (
      response.status === 401 ||
      error?.code === 190 ||
      ['access_token_invalid', 'access_token_expired', 'invalid_grant'].includes(
        String(error?.code || (isRecord(data) ? data.error : ''))
      )
    )
      throw new SocialError(
        'This account needs to be reconnected. Your imported posts are still here.',
        401,
        true
      );
    if (response.status === 429 || error?.code === 'rate_limit_exceeded')
      throw new SocialError(
        'The platform’s request limit is busy. Your saved results are still here; try again later.',
        429
      );
    throw new SocialError(
      'The platform could not complete this request. Check the app permissions and try again.',
      502
    );
  }
  if (!isRecord(data)) throw new SocialError('The platform returned an unexpected response.', 502);
  return data;
}

function instagramUrl(
  path: string,
  env: SocialEnvironment,
  token: string,
  params: Record<string, string> = {}
): URL {
  const url = new URL(`https://graph.instagram.com/${env.instagramVersion}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);
  return url;
}

export async function exchangeCode(
  platform: SocialPlatform,
  code: string,
  env: SocialEnvironment,
  fetcher = fetch
): Promise<SocialToken> {
  if (platform === 'TikTok') {
    const data = await providerJson(
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: env.tiktokClientKey,
          client_secret: env.tiktokClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUrl(env)
        })
      },
      fetcher
    );
    return tiktokToken(data);
  }
  const response = await providerJson(
    'https://api.instagram.com/oauth/access_token',
    {
      method: 'POST',
      body: new URLSearchParams({
        client_id: env.instagramAppId,
        client_secret: env.instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl(env),
        code
      })
    },
    fetcher
  );
  const data =
    Array.isArray(response.data) && response.data.length === 1 && isRecord(response.data[0])
      ? response.data[0]
      : response;
  const accessToken = text(data.access_token, 16000);
  const externalId = String(data.user_id || '');
  if (!accessToken || !/^\d+$/.test(externalId))
    throw new SocialError('Instagram did not grant a usable account connection.', 502);
  const url = new URL('https://graph.instagram.com/access_token');
  url.search = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: env.instagramAppSecret,
    access_token: accessToken
  }).toString();
  const longLived = await providerJson(url, {}, fetcher);
  if (!text(longLived.access_token))
    throw new SocialError('Instagram could not finish the connection.', 502);
  return {
    accessToken: text(longLived.access_token, 16000),
    refreshToken: '',
    externalId,
    expiresAt: new Date(Date.now() + (metric(longLived.expires_in) || 3600) * 1000).toISOString(),
    refreshExpiresAt: null,
    scopes: requiredScopes('Instagram')
  };
}

function tiktokToken(data: Record<string, unknown>, previous?: SocialToken): SocialToken {
  const accessToken = text(data.access_token, 16000);
  const refreshToken = text(data.refresh_token, 16000) || previous?.refreshToken || '';
  const externalId = text(data.open_id, 200) || previous?.externalId || '';
  const scopes = text(data.scope).split(',').filter(Boolean);
  if (
    !accessToken ||
    !refreshToken ||
    !externalId ||
    !requiredScopes('TikTok').every(scope => scopes.includes(scope))
  )
    throw new SocialError('Allow profile and public-video access to connect TikTok.', 403);
  return {
    accessToken,
    refreshToken,
    externalId,
    scopes,
    expiresAt: new Date(Date.now() + (metric(data.expires_in) || 3600) * 1000).toISOString(),
    refreshExpiresAt: metric(data.refresh_expires_in)
      ? new Date(Date.now() + Number(data.refresh_expires_in) * 1000).toISOString()
      : previous?.refreshExpiresAt || null
  };
}

export async function refreshProviderToken(
  platform: SocialPlatform,
  token: SocialToken,
  env: SocialEnvironment,
  fetcher = fetch
): Promise<SocialToken> {
  const remaining = new Date(token.expiresAt).getTime() - Date.now();
  if (platform === 'TikTok') {
    if (remaining > 5 * 60_000) return token;
    if (token.refreshExpiresAt && new Date(token.refreshExpiresAt).getTime() <= Date.now())
      throw new SocialError('Reconnect TikTok to resume syncing.', 401, true);
    return tiktokToken(
      await providerJson(
        'https://open.tiktokapis.com/v2/oauth/token/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: env.tiktokClientKey,
            client_secret: env.tiktokClientSecret,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken
          })
        },
        fetcher
      ),
      token
    );
  }
  if (remaining > 7 * 86400_000) return token;
  if (remaining <= 0) throw new SocialError('Reconnect Instagram to resume syncing.', 401, true);
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.search = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: token.accessToken
  }).toString();
  const data = await providerJson(url, {}, fetcher);
  if (!text(data.access_token))
    throw new SocialError('Instagram could not refresh access. Reconnect the account.', 401, true);
  return {
    ...token,
    accessToken: text(data.access_token, 16000),
    expiresAt: new Date(Date.now() + (metric(data.expires_in) || 3600) * 1000).toISOString()
  };
}

export async function providerProfile(
  platform: SocialPlatform,
  token: SocialToken,
  env: SocialEnvironment,
  fetcher = fetch
): Promise<ProviderProfile> {
  if (platform === 'Instagram') {
    const data = await providerJson(
      instagramUrl('me', env, token.accessToken, {
        fields: 'user_id,username,name,profile_picture_url'
      }),
      {},
      fetcher
    );
    return {
      externalId: String(data.user_id || data.id || token.externalId),
      username: text(data.username, 100),
      displayName: text(data.name, 200),
      avatarUrl: safeHttpsUrl(data.profile_picture_url)
    };
  }
  const data = await providerJson(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
    { headers: { Authorization: `Bearer ${token.accessToken}` } },
    fetcher
  );
  const user = isRecord(data.data) && isRecord(data.data.user) ? data.data.user : {};
  if (user.open_id !== token.externalId)
    throw new SocialError('TikTok returned a different account. Please reconnect.', 502);
  return {
    externalId: token.externalId,
    username: '',
    displayName: text(user.display_name, 200),
    avatarUrl: safeHttpsUrl(user.avatar_url)
  };
}

export function normalizeTikTokVideo(value: unknown): ImportedMedia | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^\d{10,30}$/.test(value.id))
    return null;
  const permalink = safeHttpsUrl(value.share_url);
  try {
    if (canonicalPost(permalink).id !== value.id) return null;
  } catch {
    return null;
  }
  return {
    external_id: value.id,
    platform: 'TikTok',
    media_type: 'video',
    title: text(value.title, 240) || text(value.video_description, 240) || 'Untitled TikTok',
    caption: text(value.video_description, 4000),
    permalink,
    thumbnail_url: safeHttpsUrl(value.cover_image_url),
    media_url: '',
    published_at: metric(value.create_time)
      ? new Date(Number(value.create_time) * 1000).toISOString()
      : null,
    duration: metric(value.duration),
    metrics: {
      ...emptyMetrics(),
      views: metric(value.view_count),
      likes: metric(value.like_count),
      comments: metric(value.comment_count),
      shares: metric(value.share_count)
    },
    metrics_updated_at: new Date().toISOString()
  };
}

export function normalizeInstagramMedia(value: unknown): ImportedMedia | null {
  if (!isRecord(value) || !text(value.id)) return null;
  let permalink: string;
  try {
    const post = canonicalPost(text(value.permalink));
    if (post.platform !== 'Instagram') return null;
    permalink = post.url;
  } catch {
    return null;
  }
  return {
    external_id: text(value.id, 100),
    platform: 'Instagram',
    media_type:
      value.media_type === 'CAROUSEL_ALBUM'
        ? 'carousel'
        : value.media_type === 'IMAGE'
          ? 'image'
          : 'video',
    title: text(value.caption, 240).split('\n')[0] || 'Untitled Instagram post',
    caption: text(value.caption, 4000),
    permalink,
    thumbnail_url:
      safeHttpsUrl(value.thumbnail_url) ||
      (value.media_type !== 'VIDEO' ? safeHttpsUrl(value.media_url) : ''),
    media_url: safeHttpsUrl(value.media_url),
    published_at:
      typeof value.timestamp === 'string' && Number.isFinite(Date.parse(value.timestamp))
        ? new Date(value.timestamp).toISOString()
        : null,
    duration: null,
    metrics: {
      ...emptyMetrics(),
      likes: metric(value.like_count),
      comments: metric(value.comments_count)
    },
    metrics_updated_at: new Date().toISOString()
  };
}

export async function fetchProviderPage(
  platform: SocialPlatform,
  token: SocialToken,
  env: SocialEnvironment,
  cursor: string | null,
  fetcher = fetch
): Promise<ProviderPage> {
  if (platform === 'TikTok') {
    const fields =
      'id,title,video_description,create_time,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count';
    const data = await providerJson(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor: Number(cursor) } : {}) })
      },
      fetcher
    );
    if (!isRecord(data.data) || !Array.isArray(data.data.videos))
      throw new SocialError('TikTok did not return a video list.', 502);
    return {
      media: data.data.videos.flatMap(value => {
        const record = normalizeTikTokVideo(value);
        return record ? [record] : [];
      }),
      cursor:
        typeof data.data.cursor === 'number' && Number.isSafeInteger(data.data.cursor)
          ? String(data.data.cursor)
          : null,
      hasMore: data.data.has_more === true,
      metricNote:
        'Public videos · lifetime views, likes, comments and shares. Watch time and retention are not supplied by the Display API.'
    };
  }
  const data = await providerJson(
    instagramUrl(`${token.externalId}/media`, env, token.accessToken, {
      fields:
        'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: '20',
      ...(cursor ? { after: cursor } : {})
    }),
    {},
    fetcher
  );
  if (!Array.isArray(data.data))
    throw new SocialError('Instagram did not return a media list.', 502);
  const media = data.data.flatMap(value => {
    const record = normalizeInstagramMedia(value);
    return record ? [record] : [];
  });
  let incomplete = false;
  // Bound concurrent insight requests; a missing metric stays null, never zero.
  for (let index = 0; index < media.length; index += 4) {
    await Promise.all(
      media.slice(index, index + 4).map(async record => {
        try {
          const insights = await providerJson(
            instagramUrl(`${record.external_id}/insights`, env, token.accessToken, {
              metric: 'views,reach,saved,shares'
            }),
            { signal: AbortSignal.timeout(5000) },
            fetcher
          );
          if (!Array.isArray(insights.data)) {
            incomplete = true;
            return;
          }
          for (const insight of insights.data) {
            if (!isRecord(insight)) continue;
            const name = insight.name === 'saved' ? 'saves' : insight.name;
            const value =
              Array.isArray(insight.values) && isRecord(insight.values[0])
                ? insight.values[0].value
                : isRecord(insight.total_value)
                  ? insight.total_value.value
                  : null;
            if (name === 'views' || name === 'reach' || name === 'shares' || name === 'saves')
              record.metrics[name] = metric(value);
          }
        } catch (error) {
          if (error instanceof SocialError && error.reconnect) throw error;
          incomplete = true;
        }
      })
    );
  }
  const paging = isRecord(data.paging) ? data.paging : {};
  const cursors = isRecord(paging.cursors) ? paging.cursors : {};
  return {
    media,
    cursor: text(cursors.after, 2000) || null,
    hasMore: Boolean(paging.next),
    metricNote: incomplete
      ? 'Some insights are unavailable. Check the Insights permission; availability also depends on post type and age. Unavailable metrics are shown as —.'
      : 'Lifetime post insights. Views are not unique people; unavailable metrics are shown as —.'
  };
}
