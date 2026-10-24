import type {
  MediaLibrarySnapshot,
  ProviderSetup,
  SocialAccount,
  SocialCommand,
  SocialEnvironment,
  SocialPlatform
} from './social-types.ts';
import type { SocialRepository } from './social-repository.ts';
import {
  authorizationUrl,
  callbackUrl,
  exchangeCode,
  fetchProviderPage,
  providerProfile,
  refreshProviderToken,
  SocialError
} from './social-providers.ts';
import {
  canonicalPost,
  isRecord,
  mergeImportedMedia,
  newMediaRecord,
  safeHttpsUrl,
  text
} from './media-helpers.ts';
import { openToken, randomState, sealToken, stateDigest } from './social-crypto.ts';

export function socialSetup(env: SocialEnvironment): ProviderSetup[] {
  return (['Instagram', 'TikTok'] as SocialPlatform[]).map(platform => {
    const fields =
      platform === 'Instagram'
        ? { INSTAGRAM_APP_ID: env.instagramAppId, INSTAGRAM_APP_SECRET: env.instagramAppSecret }
        : { TIKTOK_CLIENT_KEY: env.tiktokClientKey, TIKTOK_CLIENT_SECRET: env.tiktokClientSecret };
    const missing = Object.entries({
      ...fields,
      SOCIAL_TOKEN_ENCRYPTION_KEY: env.encryptionKey,
      DRAFTROOM_APP_URL: env.appUrl
    })
      .filter(([, value]) => !value)
      .map(([name]) => name);
    return { platform, configured: !missing.length, missing, callbackUrl: callbackUrl(env) };
  });
}

export function allowedReturnOrigin(origin: string, env: SocialEnvironment): string {
  const configured = new URL(env.appUrl);
  if (
    configured.protocol !== 'https:' ||
    configured.username ||
    configured.password ||
    configured.search ||
    configured.hash
  )
    throw new SocialError('Set DRAFTROOM_APP_URL to your public HTTPS Draftroom address.', 503);
  if (origin !== configured.origin)
    throw new SocialError(
      'Connect your accounts from the public Draftroom website so the platform can return you safely.',
      400
    );
  return configured.origin;
}

export function createSocialService(
  repository: SocialRepository,
  env: SocialEnvironment,
  fetcher = fetch
) {
  async function snapshot(ownerId: string): Promise<MediaLibrarySnapshot> {
    return { ...(await repository.list(ownerId)), setup: socialSetup(env) };
  }
  async function sync(ownerId: string, platform: SocialPlatform, older = false): Promise<number> {
    const account = await repository.account(ownerId, platform);
    if (!account || account.status === 'disconnected')
      throw new SocialError(`Connect ${platform} to import your posts.`, 400);
    if (older && !account.has_more) return 0;
    if (!(await repository.lock(ownerId, platform)))
      throw new SocialError(
        'A sync is already running. Give it a moment, then refresh your library.',
        409
      );
    try {
      const stored = await repository.token(ownerId, platform);
      if (!stored) throw new SocialError('Reconnect this account to continue syncing.', 401, true);
      let token;
      try {
        token = await openToken(stored.payload, env.encryptionKey, ownerId, platform);
      } catch {
        throw new SocialError('Reconnect this account to continue syncing.', 401, true);
      }
      const refreshed = await refreshProviderToken(platform, token, env, fetcher);
      if (refreshed !== token)
        await repository.saveToken({
          owner_id: ownerId,
          platform,
          payload: await sealToken(refreshed, env.encryptionKey, ownerId, platform)
        });
      const page = await fetchProviderPage(
        platform,
        refreshed,
        env,
        older ? account.cursor : null,
        fetcher
      );
      const existing = (await repository.list(ownerId)).media;
      for (const imported of page.media) {
        const match = existing.find(
          record =>
            record.platform === platform &&
            (record.external_id === imported.external_id ||
              samePost(record.permalink, imported.permalink))
        );
        if (match) await repository.refreshMedia(ownerId, match.id, imported);
        else await repository.saveMedia(mergeImportedMedia(undefined, imported, ownerId));
      }
      await repository.updateAccount(ownerId, platform, {
        status: 'connected',
        last_synced_at: new Date().toISOString(),
        last_error: '',
        metric_note: page.metricNote,
        ...(older || !account.last_synced_at ? { cursor: page.cursor, has_more: page.hasMore } : {})
      });
      return page.media.length;
    } catch (error) {
      await repository.updateAccount(ownerId, platform, {
        ...(error instanceof SocialError && error.reconnect
          ? { status: 'reconnect_required' as const }
          : {}),
        last_error:
          error instanceof SocialError
            ? error.message
            : 'Sync could not finish. Your existing posts have been kept.'
      });
      throw error;
    } finally {
      await repository.updateAccount(ownerId, platform, { sync_lock_until: null });
    }
  }
  return {
    snapshot,
    async run(ownerId: string, command: SocialCommand) {
      if (command.action === 'library') return snapshot(ownerId);
      if (command.action === 'connect') {
        if (!socialSetup(env).find(setup => setup.platform === command.platform)?.configured)
          throw new SocialError(
            'Finish the developer-app setup before connecting this account.',
            503
          );
        const origin = allowedReturnOrigin(command.returnOrigin, env);
        const state = randomState();
        await repository.state({
          state_hash: await stateDigest(state),
          owner_id: ownerId,
          platform: command.platform,
          return_origin: origin,
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString()
        });
        return { url: authorizationUrl(command.platform, state, env) };
      }
      if (command.action === 'sync')
        return { imported: await sync(ownerId, command.platform, command.older) };
      if (command.action === 'disconnect') {
        const account = await repository.account(ownerId, command.platform);
        if (account?.sync_lock_until && new Date(account.sync_lock_until).getTime() > Date.now())
          throw new SocialError('Wait for the current sync to finish before disconnecting.', 409);
        await repository.removeToken(ownerId, command.platform);
        await repository.updateAccount(ownerId, command.platform, {
          status: 'disconnected',
          last_error: '',
          sync_lock_until: null
        });
        return { disconnected: true };
      }
      if (command.action === 'update_media') {
        await repository.assertLinkedIdea(ownerId, command.linkedItemId);
        await repository.updateMedia(ownerId, command.id, {
          linked_item_id: command.linkedItemId,
          archived_at: command.archived ? new Date().toISOString() : null
        });
        return { saved: true };
      }
      await repository.assertLinkedIdea(ownerId, command.linkedItemId);
      if (command.action === 'import_link') {
        const post = canonicalPost(command.url);
        const existing = (await repository.list(ownerId)).media.find(record =>
          samePost(record.permalink, post.url)
        );
        if (existing) {
          await repository.updateMedia(ownerId, existing.id, {
            linked_item_id: command.linkedItemId || existing.linked_item_id,
            archived_at: null
          });
          return { id: existing.id };
        }
        const record = newMediaRecord(ownerId, {
          title: command.title.trim() || `${post.platform} video`,
          source: 'link',
          linkedItemId: command.linkedItemId
        });
        record.platform = post.platform;
        record.external_id = post.id;
        record.permalink = post.url;
        if (post.platform === 'TikTok') {
          // Only a validated TikTok post is sent to its own oEmbed endpoint. Ignore all returned HTML.
          try {
            const response = await fetcher(
              `https://www.tiktok.com/oembed?url=${encodeURIComponent(post.url)}`,
              { signal: AbortSignal.timeout(6000), redirect: 'error' }
            );
            const data: unknown = await response.json();
            if (response.ok && isRecord(data)) {
              if (!command.title.trim()) record.title = text(data.title, 240) || record.title;
              record.thumbnail_url = safeHttpsUrl(data.thumbnail_url);
            }
          } catch {
            /* Embedding still works without optional cover metadata. */
          }
        }
        await repository.saveMedia(record);
        return { id: record.id };
      }
      if (!validUploadPath(ownerId, command.path))
        throw new SocialError('Choose a video uploaded to your own library.', 400);
      const file = await repository.uploadInfo(command.path);
      if (
        !file ||
        typeof file.contentType !== 'string' ||
        typeof file.size !== 'number' ||
        !['video/mp4', 'video/webm', 'video/quicktime'].includes(file.contentType) ||
        file.size > 50_000_000 ||
        file.size <= 0
      )
        throw new SocialError('Choose an MP4, WebM or MOV clip under 50 MB.', 400);
      const existing = (await repository.list(ownerId)).media.find(
        record => record.storage_path === command.path
      );
      if (existing) return { id: existing.id };
      const record = newMediaRecord(ownerId, {
        title: command.title.trim() || 'Untitled clip',
        source: 'upload',
        linkedItemId: command.linkedItemId
      });
      record.storage_path = command.path;
      record.duration = command.duration;
      await repository.saveMedia(record);
      return { id: record.id };
    },
    async callback(code: string, stateValue: string, denied: boolean): Promise<string> {
      if (!/^[A-Za-z0-9_-]{43}$/.test(stateValue))
        throw new SocialError(
          'This connection link is invalid or expired. Start again from Draftroom.',
          400
        );
      const state = await repository.consumeState(await stateDigest(stateValue));
      if (!state || new Date(state.expires_at).getTime() <= Date.now())
        throw new SocialError(
          'This connection link is invalid or expired. Start again from Draftroom.',
          400
        );
      const origin = allowedReturnOrigin(state.return_origin, env);
      const destination = new URL('/library/', origin);
      if (denied) {
        destination.searchParams.set('social', 'cancelled');
        return destination.href;
      }
      if (!code || code.length > 4096)
        throw new SocialError('The platform did not return a usable authorization code.', 400);
      try {
        const token = await exchangeCode(state.platform, code, env, fetcher);
        const profile = await providerProfile(state.platform, token, env, fetcher);
        const old = await repository.account(state.owner_id, state.platform);
        if (old?.sync_lock_until && new Date(old.sync_lock_until).getTime() > Date.now())
          throw new SocialError('A sync is running. Reconnect again after it finishes.', 409);
        if (old && old.external_id !== profile.externalId)
          throw new SocialError(
            'Reconnect the same account used for this library. Switching accounts is not supported yet.',
            409
          );
        const account: SocialAccount = {
          id: old?.id || crypto.randomUUID(),
          owner_id: state.owner_id,
          platform: state.platform,
          external_id: profile.externalId,
          username: profile.username,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
          status: 'connected',
          last_synced_at: old?.last_synced_at || null,
          last_error: '',
          metric_note: '',
          cursor: old?.cursor || null,
          has_more: old?.has_more || false,
          sync_lock_until: null,
          updated_at: new Date().toISOString()
        };
        await repository.saveToken({
          owner_id: state.owner_id,
          platform: state.platform,
          payload: await sealToken(
            { ...token, externalId: profile.externalId },
            env.encryptionKey,
            state.owner_id,
            state.platform
          )
        });
        await repository.saveAccount(account);
        destination.searchParams.set('social', 'connected');
        destination.searchParams.set('platform', state.platform);
      } catch {
        destination.searchParams.set('social', 'failed');
      }
      return destination.href;
    }
  };
}

export function validUploadPath(ownerId: string, path: string): boolean {
  return (
    path.startsWith(`${ownerId}/`) &&
    /^[a-f0-9-]{36}\/[a-f0-9-]{36}\/(?:clip\.(?:mp4|webm|mov))$/.test(path)
  );
}

function samePost(first: string, second: string): boolean {
  try {
    const a = canonicalPost(first);
    const b = canonicalPost(second);
    return a.platform === b.platform && a.id === b.id;
  } catch {
    return false;
  }
}
