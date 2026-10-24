import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/database.types.ts';
import type {
  ImportedMedia,
  MediaRecord,
  OAuthState,
  SocialAccount,
  SocialPlatform,
  StoredSocialToken
} from './social-types.ts';
import { SocialError } from './social-providers.ts';

export type SocialRepository = ReturnType<typeof createSocialRepository>;

export function createSocialRepository(client: SupabaseClient<Database>) {
  function check(error: unknown): void {
    if (error)
      throw new SocialError(
        'Your media library could not be saved or loaded. Please try again.',
        503
      );
  }
  return {
    async list(ownerId: string) {
      const [media, accounts] = await Promise.all([
        client
          .from('draftroom_media')
          .select('*', { count: 'exact' })
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(1000),
        client.from('draftroom_social_accounts').select('*').eq('owner_id', ownerId)
      ]);
      check(media.error);
      check(accounts.error);
      return {
        media: media.data || [],
        accounts: accounts.data || [],
        partial: (media.count || 0) > 1000
      };
    },
    async account(ownerId: string, platform: SocialPlatform) {
      const result = await client
        .from('draftroom_social_accounts')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('platform', platform)
        .maybeSingle();
      check(result.error);
      return result.data;
    },
    async saveAccount(account: SocialAccount) {
      check(
        (
          await client
            .from('draftroom_social_accounts')
            .upsert(account, { onConflict: 'owner_id,platform' })
        ).error
      );
    },
    async updateAccount(ownerId: string, platform: SocialPlatform, change: Partial<SocialAccount>) {
      check(
        (
          await client
            .from('draftroom_social_accounts')
            .update({ ...change, updated_at: new Date().toISOString() })
            .eq('owner_id', ownerId)
            .eq('platform', platform)
        ).error
      );
    },
    async token(ownerId: string, platform: SocialPlatform) {
      const result = await client
        .from('draftroom_social_tokens')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('platform', platform)
        .maybeSingle();
      check(result.error);
      return result.data;
    },
    async saveToken(token: StoredSocialToken) {
      check(
        (
          await client
            .from('draftroom_social_tokens')
            .upsert(token, { onConflict: 'owner_id,platform' })
        ).error
      );
    },
    async removeToken(ownerId: string, platform: SocialPlatform) {
      check(
        (
          await client
            .from('draftroom_social_tokens')
            .delete()
            .eq('owner_id', ownerId)
            .eq('platform', platform)
        ).error
      );
    },
    async state(state: OAuthState) {
      check((await client.from('draftroom_oauth_states').insert(state)).error);
      // Expired grants cannot be consumed and need not accumulate indefinitely.
      check(
        (
          await client
            .from('draftroom_oauth_states')
            .delete()
            .lt('expires_at', new Date().toISOString())
        ).error
      );
    },
    async consumeState(digest: string): Promise<OAuthState | null> {
      const result = await client.rpc('draftroom_consume_oauth_state', { state_digest: digest });
      check(result.error);
      return result.data?.[0] || null;
    },
    async saveMedia(record: MediaRecord) {
      check((await client.from('draftroom_media').upsert(record, { onConflict: 'id' })).error);
    },
    async refreshMedia(ownerId: string, id: string, values: ImportedMedia) {
      check(
        (
          await client
            .from('draftroom_media')
            .update({ ...values, source: 'api', updated_at: new Date().toISOString() })
            .eq('owner_id', ownerId)
            .eq('id', id)
        ).error
      );
    },
    async media(ownerId: string, id: string) {
      const result = await client
        .from('draftroom_media')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('id', id)
        .maybeSingle();
      check(result.error);
      return result.data;
    },
    async updateMedia(
      ownerId: string,
      id: string,
      change: { linked_item_id: string; archived_at: string | null }
    ) {
      const result = await client
        .from('draftroom_media')
        .update({ ...change, updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      check(result.error);
      if (!result.data) throw new SocialError('This video is no longer in your library.', 404);
    },
    async lock(ownerId: string, platform: SocialPlatform): Promise<boolean> {
      const now = new Date().toISOString();
      const result = await client
        .from('draftroom_social_accounts')
        .update({ sync_lock_until: new Date(Date.now() + 120_000).toISOString() })
        .eq('owner_id', ownerId)
        .eq('platform', platform)
        .or(`sync_lock_until.is.null,sync_lock_until.lt.${now}`)
        .select('id')
        .maybeSingle();
      check(result.error);
      return Boolean(result.data);
    },
    async uploadInfo(path: string) {
      const result = await client.storage.from('draftroom-media').info(path);
      check(result.error);
      return result.data;
    },
    async assertLinkedIdea(ownerId: string, id: string) {
      if (!id) return;
      const result = await client
        .from('draftroom_workspaces')
        .select('data')
        .eq('owner_id', ownerId)
        .maybeSingle();
      check(result.error);
      if (!result.data?.data?.items.some(item => item.id === id))
        throw new SocialError('Choose an idea that still exists in your workspace.', 400);
    }
  };
}
