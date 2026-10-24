import type { Workspace } from '../lib/types.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { seed } from '../lib/model.ts';
import {
  appendAssistantMessage,
  applyAssistantTurn,
  prepareAssistantTurn
} from '../lib/assistant-actions.ts';
import { validateWorkspace } from '../lib/workspace-data.ts';
import { required } from './helpers.ts';

type DatabaseFixtureRow = { owner_id: string; data: Workspace | null; revision: number };
const errorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? error.code : undefined;

test('PostgreSQL migration protects the private workspace and increments revisions', async t => {
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
      'utf8'
    )
  );
  await db.exec(
    await readFile(new URL('../supabase/provision-owner.sql', import.meta.url), 'utf8')
  );

  await t.test('only the provisioned owner has a workspace', async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`
    );
    const { rows } = await db.query<DatabaseFixtureRow>(
      'select owner_id, data, revision from public.draftroom_workspaces'
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].owner_id, owner);
    assert.equal(rows[0].data, null);
    assert.equal(Number(rows[0].revision), 0);
  });

  await t.test('anonymous requests have no table access', async () => {
    await db.exec('reset role; set role anon;');
    await assert.rejects(
      db.query<DatabaseFixtureRow>('select * from public.draftroom_workspaces'),
      error => errorCode(error) === '42501'
    );
    await db.exec('reset role;');
  });

  await t.test('another signed-in account cannot read, update, or create a workspace', async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub', '${other}', false);`
    );
    assert.equal(
      (await db.query<DatabaseFixtureRow>('select * from public.draftroom_workspaces')).rows.length,
      0
    );
    assert.equal(
      (
        await db.query<DatabaseFixtureRow>(
          'update public.draftroom_workspaces set data = null returning owner_id'
        )
      ).rows.length,
      0
    );
    await assert.rejects(
      db.query<DatabaseFixtureRow>(
        'insert into public.draftroom_workspaces (owner_id) values ($1)',
        [other]
      ),
      error => errorCode(error) === '42501'
    );
  });

  await t.test('owner can save, but the server controls the revision and ownership', async () => {
    await db.exec(`select set_config('request.jwt.claim.sub', '${owner}', false);`);
    const { rows } = await db.query<DatabaseFixtureRow>(
      'update public.draftroom_workspaces set data = $1 where revision = 0 returning revision, data',
      [JSON.stringify(seed())]
    );
    assert.equal(Number(rows[0].revision), 1);
    assert.equal(required(rows[0].data).items.length, 4);
    await assert.rejects(
      db.query<DatabaseFixtureRow>('update public.draftroom_workspaces set revision = 100'),
      error => errorCode(error) === '42501'
    );
    await assert.rejects(
      db.query<DatabaseFixtureRow>('update public.draftroom_workspaces set owner_id = $1', [other]),
      error => errorCode(error) === '42501'
    );
  });

  await t.test('stale revisions update no rows and preserve the saved workspace', async () => {
    const { rows } = await db.query<DatabaseFixtureRow>(
      'update public.draftroom_workspaces set data = null where revision = 0 returning revision'
    );
    assert.equal(rows.length, 0);
    assert.equal(
      Number(
        (await db.query<DatabaseFixtureRow>('select revision from public.draftroom_workspaces'))
          .rows[0].revision
      ),
      1
    );
  });

  await t.test('invalid JSON shape is rejected by the database', async () => {
    await assert.rejects(
      db.query<DatabaseFixtureRow>('update public.draftroom_workspaces set data = $1', [
        JSON.stringify({ version: 1 })
      ]),
      error => errorCode(error) === '23514'
    );
  });

  await t.test('owner provisioning is repeatable and does not erase saved data', async () => {
    await db.exec('reset role;');
    await db.exec(
      await readFile(new URL('../supabase/provision-owner.sql', import.meta.url), 'utf8')
    );
    assert.equal(
      Number(
        (await db.query<DatabaseFixtureRow>('select revision from public.draftroom_workspaces'))
          .rows[0].revision
      ),
      1
    );
  });

  await t.test(
    'conversation and action receipts round-trip through the owner’s database record',
    async () => {
      await db.exec(
        `set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`
      );
      const workspace = seed();
      appendAssistantMessage(workspace, {
        id: 'database-chat',
        role: 'user',
        text: 'Add a filming task.',
        createdAt: '2026-10-23T12:00:00.000Z'
      });
      applyAssistantTurn(
        workspace,
        prepareAssistantTurn(workspace, 'database-chat', {
          reply: 'Added your filming task.',
          actions: [
            {
              type: 'create_task',
              itemId: workspace.items[0].id,
              title: 'Film the opening',
              category: 'film',
              due: '',
              priority: 'High'
            }
          ]
        })
      );
      await db.query(
        'update public.draftroom_workspaces set data = $1 where owner_id = $2 and revision = 1',
        [JSON.stringify(workspace), owner]
      );
      const { rows } = await db.query<DatabaseFixtureRow>(
        'select data, revision from public.draftroom_workspaces where owner_id = $1',
        [owner]
      );
      const restored = validateWorkspace(rows[0].data);
      assert.deepEqual(restored.assistant, workspace.assistant);
      assert.deepEqual(restored.items[0].tasks, workspace.items[0].tasks);
      assert.equal(Number(rows[0].revision), 2);
      await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
      assert.equal((await db.query('select data from public.draftroom_workspaces')).rows.length, 0);
    }
  );
});
