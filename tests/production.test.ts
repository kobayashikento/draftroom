import test from 'node:test';
import { required } from './helpers.ts';
import assert from 'node:assert/strict';
import { seed, pending, productionQueue } from '../lib/model.ts';
import { parseWorkspace, validateWorkspace } from '../lib/workspace-data.ts';

test('finishing a checklist moves it to Completed, and reopening restores the same records', () => {
  const state = seed(),
    item = state.items[0],
    stageId = item.stageId,
    ids = item.tasks.map((task) => task.id);
  item.tasks.forEach((task) => (task.done = true));
  let queue = productionQueue(state);
  assert.ok(!queue.active.some((group) => group.item.id === item.id));
  assert.deepEqual(
    required(queue.completed.find((group) => group.item.id === item.id)).tasks.map(({ t }) => t.id),
    ids,
  );
  assert.notEqual(required(queue.next).p.id, item.id);
  item.tasks[2].done = false;
  queue = productionQueue(state);
  assert.ok(queue.active.some((group) => group.item.id === item.id));
  assert.ok(!queue.completed.some((group) => group.item.id === item.id));
  assert.equal(item.stageId, stageId);
  assert.equal(queue.next!.t.id, item.tasks[2].id);
});

test('priority tasks come before priority projects and completing one advances to the next project', () => {
  const state = seed();
  state.items = [state.items[0], state.items[1], state.items[3]];
  const [early, project, task] = state.items;
  for (const item of state.items) {
    item.tasks = [item.tasks[2]];
    item.tasks[0].done = false;
  }
  early.tasks[0].due = '2026-10-01';
  project.tasks[0].due = '2026-11-01';
  project.priority = 'High';
  task.tasks[0].due = '2026-12-01';
  task.tasks[0].priority = 'High';
  let queue = productionQueue(state);
  assert.deepEqual(
    queue.active.map((group) => group.item.id),
    [task.id, project.id, early.id],
  );
  assert.equal(queue.next!.t.id, task.tasks[0].id);
  assert.equal(pending(state)[0].t.id, queue.next!.t.id);
  task.tasks[0].done = true;
  queue = productionQueue(state);
  assert.equal(required(queue.next).p.id, project.id);
  project.tasks[0].done = true;
  assert.equal(productionQueue(state).next.p.id, early.id);
  early.tasks[0].done = true;
  queue = productionQueue(state);
  assert.equal(queue.next, null);
  assert.equal(queue.active.length, 0);
  assert.equal(queue.remaining, 0);
  assert.equal(queue.completed.length, 3);
});

test('a checked priority task never puts its project ahead of unfinished priority work', () => {
  const state = seed(),
    first = state.items[0],
    second = state.items[1];
  state.items = [first, second];
  first.tasks[0].priority = 'High';
  second.tasks[0].priority = 'High';
  const queue = productionQueue(state);
  assert.equal(queue.next!.t.id, second.tasks[0].id);
  assert.equal(queue.active[0].item.id, second.id);
  assert.ok(!queue.active[0].tasks[0].t.done);
});

test('date filters never mistake a partly finished checklist for a completed project', () => {
  const state = seed(),
    item = state.items[0];
  state.items = [item];
  item.tasks.forEach((task) => {
    task.done = true;
    task.due = '2026-10-23';
  });
  item.tasks[3].done = false;
  item.tasks[3].due = '2026-10-30';
  let queue = productionQueue(state, { start: '2026-10-23', end: '2026-10-23' });
  assert.equal(queue.active.length, 1);
  assert.equal(queue.completed.length, 0);
  assert.equal(queue.remaining, 0);
  assert.equal(queue.next, null);
  assert.equal(queue.active[0].tasks.length, 3);
  queue = productionQueue(state, { start: '2026-10-30', end: '2026-10-30' });
  assert.equal(queue.remaining, 1);
  assert.equal(queue.next!.t.id, item.tasks[3].id);
  item.tasks[3].due = '';
  assert.equal(productionQueue(state, { start: '2026-10-30', end: '2026-10-30' }).active.length, 0);
  assert.equal(productionQueue(state).remaining, 1);
});

test('Completed includes finished Ready and Posted ideas but excludes empty and unfinished checklists', () => {
  const state = seed(),
    ready = state.items[2],
    posted = state.items[0],
    empty = state.items[1];
  posted.stageId = 'posted';
  posted.tasks.forEach((task) => (task.done = true));
  empty.tasks = [];
  let queue = productionQueue(state);
  assert.deepEqual(
    queue.completed.map((group) => group.item.id),
    [posted.id, ready.id],
  );
  assert.ok(!queue.active.some((group) => group.item.id === empty.id));
  ready.tasks[0].done = false;
  queue = productionQueue(state);
  assert.ok(!queue.completed.some((group) => group.item.id === ready.id));
  assert.ok(!queue.active.some((group) => group.item.id === ready.id));
  assert.equal(ready.stageId, 'ready');
});

test('task priorities survive saved workspaces while drafts without priority remain compatible', () => {
  const state = seed();
  assert.doesNotThrow(() => validateWorkspace(state));
  state.items[0].tasks[2].priority = 'High';
  const restored = parseWorkspace(JSON.stringify(state));
  assert.equal(productionQueue(restored).next!.t.id, state.items[0].tasks[2].id);
  assert.equal(restored.items[0].tasks[2].priority, 'High');
  const invalid = {
    ...state,
    items: [{ ...state.items[0], tasks: [{ ...state.items[0].tasks[2], priority: 'unknown' }] }],
  };
  assert.throws(() => validateWorkspace(invalid), /unsupported format/);
});
