import test from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarTask, Workspace } from '../lib/types.ts';
import { seed } from '../lib/model.ts';
import { parseWorkspace, readCache, validateWorkspace } from '../lib/workspace-data.ts';
import {
  calendarProductionGroups,
  calendarRange,
  calendarTasks
} from '../components/calendar/calendar.helpers.ts';
import {
  calendarDayTasks,
  completeDayTask,
  dayTaskError,
  removeDayTask,
  saveDayTask
} from '../components/calendar/day-task.helpers.ts';

test('day tasks can be created, renamed, moved and deleted without belonging to or modifying an idea', () => {
  const state = seed();
  const ideasBefore = structuredClone(state.items);
  assert.equal(
    saveDayTask(state, { title: '  Batch filming  ', date: '2026-10-26', repeat: 'none' }),
    true
  );
  const task = state.calendarTasks![0];
  assert.equal(task.title, 'Batch filming');
  assert.equal(calendarDayTasks(state, calendarRange('2026-10-26')).length, 1);
  assert.equal(
    saveDayTask(state, { title: 'Edit and prepare', date: '2026-10-28', repeat: 'none' }, task.id),
    true
  );
  const occurrence = calendarDayTasks(state, calendarRange('2026-10-26'))[0];
  assert.equal(occurrence.date, '2026-10-28');
  assert.equal(occurrence.task.title, 'Edit and prepare');
  removeDayTask(state, task.id);
  assert.deepEqual(state.calendarTasks, []);
  assert.deepEqual(state.items, ideasBefore);
});

test('weekly routines appear only from their start day, across month, year and daylight-saving boundaries', () => {
  const state = seed();
  saveDayTask(state, { title: 'Plan content', date: '2026-10-25', repeat: 'weekly' });
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2026-11-10', 'Month')).map(task => task.date),
    ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29', '2026-12-06']
  );
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2026-10-10', 'Month')).map(task => task.date),
    ['2026-10-25', '2026-11-01']
  );
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2027-01-01')).map(task => task.date),
    ['2027-01-03']
  );
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2027-03-09')).map(task => task.date),
    ['2027-03-14']
  );
});

test('checking a routine off completes only that date and can be reopened without duplicate completion records', () => {
  const state = seed();
  saveDayTask(state, { title: 'Batch filming', date: '2026-10-26', repeat: 'weekly' });
  const id = state.calendarTasks![0].id;
  completeDayTask(state, id, '2026-10-26', true);
  completeDayTask(state, id, '2026-10-26', true);
  assert.deepEqual(state.calendarTasks![0].completedDates, ['2026-10-26']);
  assert.equal(calendarDayTasks(state, calendarRange('2026-10-26'))[0].done, true);
  assert.equal(calendarDayTasks(state, calendarRange('2026-11-02'))[0].done, false);
  completeDayTask(state, id, '2026-10-27', true);
  completeDayTask(state, 'missing', '2026-10-26', true);
  completeDayTask(state, id, '2026-10-19', true);
  assert.deepEqual(state.calendarTasks![0].completedDates, ['2026-10-26']);
  completeDayTask(state, id, '2026-10-26', false);
  assert.deepEqual(state.calendarTasks![0].completedDates, []);
});

test('changing the routine schedule removes completion dates that no longer belong to it', () => {
  const state = seed();
  saveDayTask(state, { title: 'Filming', date: '2026-10-26', repeat: 'weekly' });
  const id = state.calendarTasks![0].id;
  completeDayTask(state, id, '2026-10-26', true);
  completeDayTask(state, id, '2026-11-02', true);
  saveDayTask(state, { title: 'Filming', date: '2026-11-02', repeat: 'weekly' }, id);
  assert.deepEqual(state.calendarTasks![0].completedDates, ['2026-11-02']);
  saveDayTask(state, { title: 'Filming', date: '2026-11-03', repeat: 'none' }, id);
  assert.deepEqual(state.calendarTasks![0].completedDates, []);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('day tasks work in an empty workspace and search matches routine names independently of ideas', () => {
  const state = seed();
  state.items = [];
  saveDayTask(state, { title: 'Plan content', date: '2026-10-25', repeat: 'weekly' });
  saveDayTask(state, { title: 'Batch filming', date: '2026-10-26', repeat: 'none' });
  const result = calendarDayTasks(state, calendarRange('2026-10-26'), '  PLAN CONTENT  ');
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-11-01');
  assert.equal(calendarDayTasks(state, calendarRange('2026-10-26'), 'unmatched').length, 0);
});

test('invalid day tasks and stale edits cannot mutate the saved workspace', () => {
  const state = seed();
  const before = structuredClone(state);
  for (const date of ['', '2026-02-29', '2026-10-32', '2026-1-01', 'tomorrow']) {
    assert.equal(saveDayTask(state, { title: 'Filming', date, repeat: 'none' }), false);
  }
  assert.ok(dayTaskError({ title: ' ', date: '2026-10-26', repeat: 'none' }));
  assert.ok(dayTaskError({ title: 'a'.repeat(241), date: '2026-10-26', repeat: 'none' }));
  assert.equal(
    saveDayTask(state, { title: 'Filming', date: '2026-10-26', repeat: 'weekly' }, 'missing'),
    false
  );
  assert.deepEqual(state, before);
});

test('old workspaces stay valid and day tasks with completion history round-trip through backups and cache', () => {
  const state = seed();
  assert.equal(validateWorkspace(state).calendarTasks, undefined);
  saveDayTask(state, { title: 'Filming', date: '2026-10-26', repeat: 'weekly' });
  completeDayTask(state, state.calendarTasks![0].id, '2026-11-02', true);
  assert.deepEqual(parseWorkspace(JSON.stringify(state)), state);
  assert.deepEqual(
    readCache(
      { getItem: () => JSON.stringify({ data: state, revision: 4, dirty: false }), setItem() {} },
      'owner'
    )?.data,
    state
  );
});

test('external workspaces reject invalid day task titles, dates, repeats, duplicate IDs and completion history', () => {
  const task: CalendarTask = {
    id: 'routine',
    title: 'Plan',
    date: '2026-10-25',
    repeat: 'weekly',
    completedDates: []
  };
  const corruptions: unknown[] = [
    null,
    {},
    { ...task, title: '' },
    { ...task, date: '2026-02-30' },
    { ...task, repeat: 'daily' },
    { ...task, completedDates: ['2026-10-26'] },
    { ...task, completedDates: ['2026-10-18'] },
    { ...task, completedDates: ['2026-10-25', '2026-10-25'] }
  ];
  for (const corrupted of corruptions) {
    const state: unknown = { ...seed(), calendarTasks: [corrupted] };
    assert.throws(() => validateWorkspace(state));
  }
  const duplicate: Workspace = { ...seed(), calendarTasks: [task, task] };
  assert.throws(() => validateWorkspace(duplicate));
});

test('production cards group an idea’s due checklist work once per day without copying its checklist', () => {
  const state = seed();
  const item = state.items[0];
  const tasks = calendarTasks(state, {
    start: item.tasks[0].due,
    end: item.tasks[0].due,
    seriesId: 'emi'
  });
  const groups = calendarProductionGroups(tasks);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].item, item);
  assert.deepEqual(
    new Set(groups[0].tasks.map(({ t }) => t.id)),
    new Set(item.tasks.map(task => task.id))
  );
  assert.ok(groups[0].tasks.every(({ t }) => item.tasks.includes(t)));
});
