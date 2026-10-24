import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { seed } from '../lib/model.js';

test('PostgreSQL migration protects the private workspace and increments revisions', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}', 'morningswithemi@gmail.com'), ('${other}', 'another@example.com');
  `);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202610230001_private_workspace.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(
    await readFile(new URL('../supabase/provision-owner.sql', import.meta.url), 'utf8'),
  );

  await t.test('only the provisioned owner has a workspace', async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`,
    );
    const { rows } = await db.query(
      'select owner_id, data, revision from public.draftroom_workspaces',
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].owner_id, owner);
    assert.equal(rows[0].data, null);
    assert.equal(Number(rows[0].revision), 0);
  });

  await t.test('anonymous requests have no table access', async () => {
    await db.exec('reset role; set role anon;');
    await assert.rejects(
      db.query('select * from public.draftroom_workspaces'),
      (error) => error.code === '42501',
    );
    await db.exec('reset role;');
  });

  await t.test('another signed-in account cannot read, update, or create a workspace', async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub', '${other}', false);`,
    );
    assert.equal((await db.query('select * from public.draftroom_workspaces')).rows.length, 0);
    assert.equal(
      (await db.query('update public.draftroom_workspaces set data = null returning owner_id')).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query('insert into public.draftroom_workspaces (owner_id) values ($1)', [other]),
      (error) => error.code === '42501',
    );
  });

  await t.test('owner can save, but the server controls the revision and ownership', async () => {
    await db.exec(`select set_config('request.jwt.claim.sub', '${owner}', false);`);
    const { rows } = await db.query(
      'update public.draftroom_workspaces set data = $1 where revision = 0 returning revision, data',
      [JSON.stringify(seed())],
    );
    assert.equal(Number(rows[0].revision), 1);
    assert.equal(rows[0].data.items.length, 4);
    await assert.rejects(
      db.query('update public.draftroom_workspaces set revision = 100'),
      (error) => error.code === '42501',
    );
    await assert.rejects(
      db.query('update public.draftroom_workspaces set owner_id = $1', [other]),
      (error) => error.code === '42501',
    );
  });

  await t.test('stale revisions update no rows and preserve the saved workspace', async () => {
    const { rows } = await db.query(
      'update public.draftroom_workspaces set data = null where revision = 0 returning revision',
    );
    assert.equal(rows.length, 0);
    assert.equal(
      Number((await db.query('select revision from public.draftroom_workspaces')).rows[0].revision),
      1,
    );
  });

  await t.test('invalid JSON shape is rejected by the database', async () => {
    await assert.rejects(
      db.query('update public.draftroom_workspaces set data = $1', [
        JSON.stringify({ version: 1 }),
      ]),
      (error) => error.code === '23514',
    );
  });

  await t.test('owner provisioning is repeatable and does not erase saved data', async () => {
    await db.exec('reset role;');
    await db.exec(
      await readFile(new URL('../supabase/provision-owner.sql', import.meta.url), 'utf8'),
    );
    assert.equal(
      Number((await db.query('select revision from public.draftroom_workspaces')).rows[0].revision),
      1,
    );
  });
});
