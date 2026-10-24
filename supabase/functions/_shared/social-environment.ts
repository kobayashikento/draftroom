import type { SocialEnvironment } from './social-types.ts';

export function socialEnvironment(get: (name: string) => string | undefined): SocialEnvironment {
  const read = (name: string) => get(name)?.trim() || '';
  return {
    supabaseUrl: read('SUPABASE_URL'),
    appUrl: read('DRAFTROOM_APP_URL'),
    encryptionKey: read('SOCIAL_TOKEN_ENCRYPTION_KEY'),
    instagramAppId: read('INSTAGRAM_APP_ID'),
    instagramAppSecret: read('INSTAGRAM_APP_SECRET'),
    instagramVersion: read('INSTAGRAM_API_VERSION') || 'v25.0',
    tiktokClientKey: read('TIKTOK_CLIENT_KEY'),
    tiktokClientSecret: read('TIKTOK_CLIENT_SECRET')
  };
}
