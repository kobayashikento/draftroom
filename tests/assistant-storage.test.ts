import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('planning storage is private, scoped to provisioned owners and cannot overwrite existing files', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const unprovisioned = '00000000-0000-4000-8000-000000000003';
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}'), ('${other}'), ('${unprovisioned}');
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (bucket_id text, name text, primary key (bucket_id, name));
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated, anon;
  `);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202610230001_private_workspace.sql', import.meta.url),
      'utf8'
    )
  );
  await db.exec(
    `insert into public.draftroom_workspaces (owner_id) values ('${owner}'), ('${other}');`
  );
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202610240001_assistant_attachments.sql', import.meta.url),
      'utf8'
    )
  );
  const bucket = (
    await db.query<{ public: boolean; file_size_limit: number }>(
      "select public, file_size_limit from storage.buckets where id = 'assistant-attachments'"
    )
  ).rows[0];
  assert.equal(bucket.public, false);
  assert.equal(Number(bucket.file_size_limit), 50_000_000);
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`
  );
  await db.query("insert into storage.objects values ('assistant-attachments', $1)", [
    `${owner}/plan.pdf`
  ]);
  await assert.rejects(
    db.query("insert into storage.objects values ('assistant-attachments', $1)", [
      `${other}/plan.pdf`
    ])
  );
  assert.equal((await db.query('select * from storage.objects')).rows.length, 1);
  assert.equal(
    (await db.query("update storage.objects set name = 'overwritten' returning *")).rows.length,
    0
  );
  await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
  assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length, 0);
  await db.exec(`select set_config('request.jwt.claim.sub', '${unprovisioned}', false);`);
  await assert.rejects(
    db.query("insert into storage.objects values ('assistant-attachments', $1)", [
      `${unprovisioned}/plan.pdf`
    ])
  );
  await db.exec('reset role; set role anon;');
  assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
  await assert.rejects(
    db.query("insert into storage.objects values ('assistant-attachments', 'anonymous.pdf')")
  );
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`
  );
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length, 1);
});
