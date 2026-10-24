import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupabaseConfig } from '../lib/supabase.js';

test('Supabase configuration fails closed for incomplete or secret browser keys', (t) => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(getSupabaseConfig(), null);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  assert.throws(getSupabaseConfig, /incomplete/);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_do-not-expose';
  assert.throws(getSupabaseConfig, /publishable key/);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  assert.equal(getSupabaseConfig().url, 'https://test.supabase.co');
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://remote.example';
  assert.throws(getSupabaseConfig, /HTTPS/);
});
