import { createClient } from '@supabase/supabase-js';

let client;
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key)
    throw new Error(
      'Supabase setup is incomplete. Add the project URL and publishable key to .env.local.',
    );
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
  ) {
    throw new Error('The Supabase project URL must use HTTPS.');
  }
  if (!key.startsWith('sb_publishable_'))
    throw new Error(
      'Use a Supabase publishable key. Secret and service-role keys must never be used in the browser.',
    );
  return { url, key };
}

export function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  client ||= createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: {
      fetch: (input, options) =>
        fetch(input, { ...options, signal: options?.signal || AbortSignal.timeout(15_000) }),
    },
  });
  return client;
}
