import { required } from './helpers.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, kind } from '../lib/model.ts';
import {
  overviewSummary,
  overduePublications
} from '../components/views/overview/overview.helpers.ts';

test('planned overview results count each idea once and exclude manually posted or out-of-week plans', () => {
  const state = seed();
  const [emi, obsessed] = state.items;
  assert.equal(overviewSummary(state, '2026-10-26', '2026-10-23').planned.length, 4);
  emi.publications[0].state = 'manually_posted';
  let results = overviewSummary(state, '2026-10-26', '2026-10-23');
  assert.equal(results.planned.filter(item => item.id === emi.id).length, 1);
  emi.publications[1].date = '2026-11-02';
  results = overviewSummary(state, '2026-10-26', '2026-10-23');
  assert.ok(!results.planned.some(item => item.id === emi.id));
  obsessed.publications[0].date = '2026-10-26';
  obsessed.publications[1].date = '2026-11-01';
  assert.equal(
    overviewSummary(state, '2026-10-26', '2026-10-23').planned.filter(
      item => item.id === obsessed.id
    ).length,
    1
  );
  assert.deepEqual(
    overviewSummary(state, '2026-11-02', '2026-10-23').planned.map(item => item.id),
    [emi.id]
  );
});

test('ready and unfinished task results follow workflow behavior across the workspace', () => {
  const state = seed();
  required(state.stages.find(stage => stage.id === 'ready')).name = 'Good to go';
  const ready = state.items[2];
  ready.publications[0].date = '2027-01-01';
  ready.tasks[0].done = false;
  const priorityTask = state.items[3].tasks[1];
  priorityTask.priority = 'High';
  const before = structuredClone(state);
  const summary = overviewSummary(state, '2026-10-26', '2026-10-23');
  assert.deepEqual(
    summary.ready.map(item => item.id),
    [ready.id]
  );
  assert.ok(summary.tasks.every(({ p, t }) => !t.done && kind(state, p) === 'prep'));
  assert.ok(!summary.tasks.some(({ p }) => p.id === ready.id));
  assert.equal(summary.tasks[0].t.id, priorityTask.id);
  assert.deepEqual(state, before);
});

test('overdue overview results deduplicate ideas and identify only their unposted past dates', () => {
  const state = seed();
  const [emi, obsessed, ready, posted] = state.items;
  emi.publications[0].date = '2026-10-22';
  emi.publications[1].date = '2026-10-21';
  obsessed.publications[0].date = '2026-10-23';
  ready.publications[0].date = '2026-10-22';
  ready.publications[0].state = 'manually_posted';
  posted.stageId = 'posted';
  posted.publications[0].date = '2026-10-20';
  assert.deepEqual(
    overviewSummary(state, '2026-10-26', '2026-10-23').overdue.map(item => item.id),
    [emi.id]
  );
  emi.publications[1].state = 'manually_posted';
  assert.deepEqual(
    overduePublications(emi, '2026-10-23').map(publication => publication.id),
    [emi.publications[0].id]
  );
  emi.publications[0].date = '2026-10-24';
  assert.equal(overviewSummary(state, '2026-10-26', '2026-10-23').overdue.length, 0);
  assert.deepEqual(
    overviewSummary(state, '2026-10-26', '2026-10-24').overdue.map(item => item.id),
    [obsessed.id]
  );
});

test('empty overview categories return no records and completed work leaves the unfinished count', () => {
  const state = seed();
  state.items.forEach(item => item.tasks.forEach(task => (task.done = true)));
  assert.equal(overviewSummary(state, '2026-10-26', '2026-10-23').tasks.length, 0);
  state.items = [];
  assert.deepEqual(overviewSummary(state, '2026-10-26', '2026-10-23'), {
    planned: [],
    ready: [],
    tasks: [],
    overdue: []
  });
});
