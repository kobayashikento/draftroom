import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const denied = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === '42501';

test('media migration isolates clips, account metadata, encrypted tokens and one-time OAuth states', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated;
  insert into auth.users values ('${owner}', 'morningswithemi@gmail.com'), ('${other}', 'other@example.com');
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
 `);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202610230001_private_workspace.sql', import.meta.url),
      'utf8'
    )
  );
  await db.exec(
    await readFile(new URL('../supabase/provision-owner.sql', import.meta.url), 'utf8')
  );
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202610240002_media_library.sql', import.meta.url),
      'utf8'
    )
  );
  await db.query(
    `insert into public.draftroom_media (owner_id, platform, external_id, source, title, permalink) values ($1, 'TikTok', '6718335390845095173', 'api', 'A clip', 'https://www.tiktok.com/@creator/video/6718335390845095173')`,
    [owner]
  );
  await db.query(
    `insert into public.draftroom_social_accounts (owner_id, platform, external_id) values ($1, 'TikTok', 'creator')`,
    [owner]
  );
  await db.query(
    `insert into public.draftroom_social_tokens values ($1, 'TikTok', 'encrypted-ciphertext')`,
    [owner]
  );
  await db.query(
    `insert into public.draftroom_oauth_states values ('valid-state-digest', $1, 'TikTok', 'https://draftroom.example', now() + interval '10 minutes'), ('expired-state-digest', $1, 'TikTok', 'https://draftroom.example', now() - interval '1 minute')`,
    [owner]
  );

  await t.test('only the provisioned owner can read media and account metadata', async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`
    );
    assert.equal((await db.query('select id from public.draftroom_media')).rows.length, 1);
    assert.equal(
      (await db.query('select id from public.draftroom_social_accounts')).rows.length,
      1
    );
    await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
    assert.equal((await db.query('select id from public.draftroom_media')).rows.length, 0);
    assert.equal(
      (await db.query('select id from public.draftroom_social_accounts')).rows.length,
      0
    );
  });
  await t.test(
    'even the owner cannot read tokens, OAuth grants, or fabricate platform metrics',
    async () => {
      await db.exec(`select set_config('request.jwt.claim.sub', '${owner}', false);`);
      await assert.rejects(db.query('select * from public.draftroom_social_tokens'), denied);
      await assert.rejects(db.query('select * from public.draftroom_oauth_states'), denied);
      await assert.rejects(
        db.query(`update public.draftroom_media set metrics = '{"views":999999}'`),
        denied
      );
      await assert.rejects(db.query(`delete from public.draftroom_social_accounts`), denied);
      await assert.rejects(
        db.query(`select * from public.draftroom_consume_oauth_state('valid-state-digest')`),
        denied
      );
    }
  );
  await t.test(
    'private clip policies bind the object folder to the provisioned owner',
    async () => {
      const path = `${owner}/00000000-0000-4000-8000-000000000010/clip.mp4`;
      await db.query(
        `insert into storage.objects (bucket_id, name) values ('draftroom-media', $1)`,
        [path]
      );
      assert.equal((await db.query('select name from storage.objects')).rows.length, 1);
      await assert.rejects(
        db.query(`insert into storage.objects (bucket_id, name) values ('draftroom-media', $1)`, [
          `${other}/clip.mp4`
        ]),
        denied
      );
      await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
      assert.equal((await db.query('select name from storage.objects')).rows.length, 0);
      await assert.rejects(
        db.query(`insert into storage.objects (bucket_id, name) values ('draftroom-media', $1)`, [
          `${other}/clip.mp4`
        ]),
        denied
      );
      await db.exec('reset role;');
      const result = await db.query<{ public: boolean; file_size_limit: number }>(
        `select public, file_size_limit from storage.buckets where id = 'draftroom-media'`
      );
      assert.equal(result.rows[0].public, false);
      assert.ok(Number(result.rows[0].file_size_limit) <= 52428800);
    }
  );
  await t.test('only the server consumes a live OAuth state exactly once', async () => {
    await db.exec('set role service_role;');
    assert.equal(
      (await db.query(`select * from public.draftroom_consume_oauth_state('valid-state-digest')`))
        .rows.length,
      1
    );
    assert.equal(
      (await db.query(`select * from public.draftroom_consume_oauth_state('valid-state-digest')`))
        .rows.length,
      0
    );
    assert.equal(
      (await db.query(`select * from public.draftroom_consume_oauth_state('expired-state-digest')`))
        .rows.length,
      0
    );
    assert.equal((await db.query('select * from public.draftroom_social_tokens')).rows.length, 1);
  });
  await t.test('anonymous callers have no media or token table access', async () => {
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from public.draftroom_media'), denied);
    await assert.rejects(db.query('select * from public.draftroom_social_tokens'), denied);
  });
});
