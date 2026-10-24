import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../lib/model.ts';
import { WorkspaceSync } from '../lib/workspace-sync.ts';
import { WorkspaceConflictError } from '../lib/workspace-repository.ts';
import {
  LEGACY_STORAGE_KEY,
  parseWorkspace,
  readLegacyWorkspace,
  workspaceCacheKey,
} from '../lib/workspace-data.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
}

function fixture(t, row = { data: null, revision: 0 }, storage = new MemoryStorage()) {
  const remote = { row: structuredClone(row), saves: [], offline: false };
  const repository = {
    async load() {
      if (remote.offline) throw new Error('Offline');
      return structuredClone(remote.row);
    },
    async save(data, revision) {
      if (remote.offline) throw new Error('Offline');
      if (revision !== remote.row.revision) throw new WorkspaceConflictError();
      remote.row = { data: structuredClone(data), revision: revision + 1 };
      remote.saves.push(structuredClone(remote.row));
      return structuredClone(remote.row);
    },
  };
  const snapshots = [];
  const sync = new WorkspaceSync({
    repository,
    storage,
    cacheKey: 'test-owner',
    delay: 60_000,
    onChange: (value) => snapshots.push(value),
  });
  t.after(() => sync.dispose());
  return { sync, remote, storage, repository, snapshots };
}

test('first sign-in migrates existing drafts with stable IDs and saves once', async (t) => {
  const { sync, remote, storage } = fixture(t);
  const original = seed();
  original.items[0].title = 'My existing draft';
  storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(original));
  await sync.start(() => readLegacyWorkspace(storage));
  assert.equal(sync.status, 'pending');
  await sync.flush();
  assert.deepEqual(remote.row.data, original);
  assert.equal(remote.saves.length, 1);
  assert.equal(sync.status, 'saved');
  assert.equal(readLegacyWorkspace(storage).items[0].id, original.items[0].id);
});

test('existing cloud records take priority over legacy drafts and demo seeds', async (t) => {
  const cloud = seed();
  cloud.items[0].title = 'Cloud draft';
  const { sync, remote } = fixture(t, { data: cloud, revision: 5 });
  await sync.start(() => {
    throw new Error('Must not read legacy data');
  });
  assert.deepEqual(sync.data, cloud);
  assert.equal(sync.revision, 5);
  assert.equal(remote.saves.length, 0);
});

test('a failed save retains a dirty browser copy and resumes after reconnecting', async (t) => {
  const { sync, remote, storage } = fixture(t, { data: seed(), revision: 2 });
  await sync.start(seed);
  const changed = structuredClone(sync.data);
  changed.items[0].tasks[2].done = true;
  sync.change(changed);
  remote.offline = true;
  assert.equal(await sync.flush(), false);
  assert.equal(sync.status, 'error');
  assert.equal(JSON.parse(storage.getItem('test-owner')).dirty, true);
  remote.offline = false;
  await sync.refresh();
  assert.equal(sync.status, 'saved');
  assert.equal(remote.row.data.items[0].tasks[2].done, true);
  assert.equal(JSON.parse(storage.getItem('test-owner')).dirty, false);
});

test('reload restores and saves unsynced edits when the cloud revision still matches', async (t) => {
  const cloud = seed();
  const local = structuredClone(cloud);
  local.items[0].title = 'Unsynced title';
  const { sync, remote, storage } = fixture(t, { data: cloud, revision: 4 });
  storage.setItem('test-owner', JSON.stringify({ data: local, revision: 4, dirty: true }));
  await sync.start(seed);
  assert.equal(sync.data.items[0].title, 'Unsynced title');
  await sync.flush();
  assert.equal(remote.row.revision, 5);
  assert.equal(remote.row.data.items[0].title, 'Unsynced title');
});

test('stale device changes cannot overwrite a newer cloud version', async (t) => {
  const { sync, remote, storage } = fixture(t, { data: seed(), revision: 1 });
  await sync.start(seed);
  const local = structuredClone(sync.data);
  local.items[0].title = 'This device';
  sync.change(local);
  remote.row.data.items[0].title = 'Another device';
  remote.row.revision = 2;
  await sync.flush();
  assert.equal(sync.status, 'conflict');
  assert.equal(remote.row.data.items[0].title, 'Another device');
  assert.equal(sync.data.items[0].title, 'This device');
  await sync.resolve('cloud');
  assert.equal(sync.data.items[0].title, 'Another device');
  assert.equal(sync.dirty, false);
  const recovery = [...storage.values.entries()].find(([key]) => key.includes(':recovery:'));
  assert.equal(JSON.parse(recovery[1]).items[0].title, 'This device');
});

test('keeping local changes uses the current revision and retains a cloud recovery copy', async (t) => {
  const cloud = seed();
  const local = structuredClone(cloud);
  local.items[0].title = 'Local choice';
  const { sync, remote, storage } = fixture(t, { data: cloud, revision: 3 });
  storage.setItem('test-owner', JSON.stringify({ data: local, revision: 1, dirty: true }));
  await sync.start(seed);
  assert.equal(sync.status, 'conflict');
  await sync.resolve('local');
  assert.equal(sync.status, 'saved');
  assert.equal(remote.row.revision, 4);
  assert.equal(remote.row.data.items[0].title, 'Local choice');
  const recovery = [...storage.values.entries()].find(([key]) => key.includes(':recovery:'));
  assert.deepEqual(JSON.parse(recovery[1]), cloud);
});

test('edits made during an in-flight save are written serially with the new revision', async (t) => {
  const { sync, repository, remote } = fixture(t, { data: seed(), revision: 6 });
  await sync.start(seed);
  const originalSave = repository.save;
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  let first = true;
  repository.save = async (...args) => {
    if (first) {
      first = false;
      await wait;
    }
    return originalSave(...args);
  };
  const firstEdit = structuredClone(sync.data);
  firstEdit.items[0].title = 'First edit';
  sync.change(firstEdit);
  const saving = sync.flush();
  const secondEdit = structuredClone(sync.data);
  secondEdit.items[0].title = 'Newest edit';
  sync.change(secondEdit);
  release();
  await saving;
  assert.equal(remote.saves.length, 2);
  assert.equal(remote.row.revision, 8);
  assert.equal(remote.row.data.items[0].title, 'Newest edit');
  assert.equal(sync.dirty, false);
});

test('a lost successful save response is recovered without inventing a conflict', async (t) => {
  const { sync, repository, remote } = fixture(t, { data: seed(), revision: 1 });
  await sync.start(seed);
  const originalSave = repository.save;
  let loseResponse = true;
  repository.save = async (...args) => {
    const result = await originalSave(...args);
    if (loseResponse) {
      loseResponse = false;
      throw new Error('Response lost');
    }
    return result;
  };
  const changed = structuredClone(sync.data);
  changed.items[0].title = 'Saved, response lost';
  sync.change(changed);
  await sync.flush();
  assert.equal(sync.status, 'error');
  await sync.refresh();
  assert.equal(sync.status, 'saved');
  assert.equal(remote.saves.length, 1);
  assert.equal(sync.revision, 2);
});

test('unreadable browser cache is preserved instead of being overwritten by demo data', async (t) => {
  const { sync, storage, remote } = fixture(t);
  storage.setItem('test-owner', '{broken');
  await assert.rejects(sync.start(seed));
  assert.equal(storage.getItem('test-owner'), '{broken');
  assert.equal(remote.saves.length, 0);
});

test('local storage failure is surfaced while a successful cloud save stays truthful', async (t) => {
  const { sync, storage } = fixture(t, { data: seed(), revision: 0 });
  storage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  await sync.start(seed);
  assert.match(sync.cacheError, /recovery copy/);
  const changed = structuredClone(sync.data);
  changed.items[0].title = 'Still saved to cloud';
  sync.change(changed);
  await sync.flush();
  assert.equal(sync.status, 'saved');
  assert.match(sync.cacheError, /recovery copy/);
});

test('cache keys isolate different owners and Supabase projects', () => {
  const owner = workspaceCacheKey('https://one.supabase.co', 'owner');
  assert.notEqual(owner, workspaceCacheKey('https://one.supabase.co', 'other'));
  assert.notEqual(owner, workspaceCacheKey('https://two.supabase.co', 'owner'));
});

test('malformed workspaces and dangling references are rejected before saving', () => {
  assert.throws(() => parseWorkspace('{"version":1}'));
  const data = seed();
  data.items[0].stageId = 'missing-stage';
  assert.throws(() => parseWorkspace(JSON.stringify(data)), /incomplete/);
});

test('a slow cloud read cannot roll back a save completed while it was in flight', async (t) => {
  const { sync, repository } = fixture(t, { data: seed(), revision: 1 });
  await sync.start(seed);
  const old = await repository.load();
  let release;
  repository.load = () =>
    new Promise((resolve) => {
      release = () => resolve(old);
    });
  const refresh = sync.refresh();
  const changed = structuredClone(sync.data);
  changed.items[0].title = 'Newer completed save';
  sync.change(changed);
  await sync.flush();
  release();
  await refresh;
  assert.equal(sync.data.items[0].title, 'Newer completed save');
  assert.equal(sync.revision, 2);
  assert.equal(sync.dirty, false);
});
