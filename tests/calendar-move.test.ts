import test from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarMoveTarget } from '../components/calendar/calendar-move.helpers.ts';
import {
  calendarMoveDetails,
  canMoveCalendarItem,
  moveCalendarItem
} from '../components/calendar/calendar-move.helpers.ts';
import { calendarRange } from '../components/calendar/calendar.helpers.ts';
import {
  calendarDayTasks,
  completeDayTask,
  saveDayTask
} from '../components/calendar/day-task.helpers.ts';
import { seed } from '../lib/model.ts';
import { parseWorkspace, validateWorkspace } from '../lib/workspace-data.ts';

test('moving a one-off day task preserves completion, stable identity and unrelated content', () => {
  const state = seed();
  saveDayTask(state, { title: 'Batch filming', date: '2026-10-26', repeat: 'none' });
  const task = state.calendarTasks![0];
  completeDayTask(state, task.id, task.date, true);
  const before = structuredClone(state);
  assert.equal(
    moveCalendarItem(
      state,
      { type: 'day-task', taskId: task.id, scheduledDate: '2026-10-26', date: '2026-10-26' },
      '2026-10-28'
    ),
    true
  );
  const expected = structuredClone(before);
  expected.calendarTasks![0].date = '2026-10-28';
  expected.calendarTasks![0].completedDates = ['2026-10-28'];
  assert.deepEqual(state, expected);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('moving one weekly occurrence across weeks preserves the routine and independent completion history', () => {
  const state = seed();
  saveDayTask(state, { title: 'Film', date: '2026-10-26', repeat: 'weekly' });
  const task = state.calendarTasks![0];
  completeDayTask(state, task.id, '2026-10-26', true);
  const target: CalendarMoveTarget = {
    type: 'day-task',
    taskId: task.id,
    scheduledDate: '2026-10-26',
    date: '2026-10-26'
  };
  assert.equal(moveCalendarItem(state, target, '2026-11-03'), true);
  assert.equal(task.date, '2026-10-26');
  assert.deepEqual(task.movedDates, { '2026-10-26': '2026-11-03' });
  assert.deepEqual(calendarDayTasks(state, calendarRange('2026-10-26')), []);
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2026-11-02')).map(({ date, scheduledDate, done }) => ({
      date,
      scheduledDate,
      done
    })),
    [
      { date: '2026-11-02', scheduledDate: '2026-11-02', done: false },
      { date: '2026-11-03', scheduledDate: '2026-10-26', done: true }
    ]
  );
  assert.equal(calendarDayTasks(state, calendarRange('2026-11-09'))[0].date, '2026-11-09');
  completeDayTask(state, task.id, '2026-10-26', false);
  assert.equal(calendarDayTasks(state, calendarRange('2026-11-02'))[1].done, false);
  assert.deepEqual(parseWorkspace(JSON.stringify(state)), state);
});

test('weekly tasks can share a day, move again, and return to their original day without duplicate occurrences', () => {
  const state = seed();
  saveDayTask(state, { title: 'Prep', date: '2026-10-26', repeat: 'weekly' });
  const task = state.calendarTasks![0];
  const target: CalendarMoveTarget = {
    type: 'day-task',
    taskId: task.id,
    scheduledDate: '2026-10-26',
    date: '2026-10-26'
  };
  moveCalendarItem(state, target, '2026-11-02');
  assert.equal(calendarDayTasks(state, calendarRange('2026-11-02')).length, 2);
  const moved: CalendarMoveTarget = { ...target, date: '2026-11-02' };
  moveCalendarItem(state, moved, '2026-11-04');
  assert.equal(
    calendarDayTasks(state, calendarRange('2026-11-02')).filter(
      occurrence => occurrence.scheduledDate === '2026-10-26'
    ).length,
    1
  );
  assert.equal(moveCalendarItem(state, { ...target, date: '2026-11-04' }, '2026-10-26'), true);
  assert.equal(task.movedDates, undefined);
  assert.equal(calendarDayTasks(state, calendarRange('2026-10-26')).length, 1);
});

test('editing a routine title preserves occurrence moves while changing its schedule clears them', () => {
  const state = seed();
  saveDayTask(state, { title: 'Film', date: '2026-10-26', repeat: 'weekly' });
  const task = state.calendarTasks![0];
  moveCalendarItem(
    state,
    { type: 'day-task', taskId: task.id, scheduledDate: task.date, date: task.date },
    '2026-10-28'
  );
  saveDayTask(state, { title: 'Film clips', date: task.date, repeat: 'weekly' }, task.id);
  assert.deepEqual(task.movedDates, { '2026-10-26': '2026-10-28' });
  saveDayTask(state, { title: 'Film clips', date: '2026-10-27', repeat: 'weekly' }, task.id);
  assert.equal(task.movedDates, undefined);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('moving production work changes only the selected unfinished tasks still due on the source day', () => {
  const state = seed();
  const item = state.items[0];
  item.tasks[3].due = '2026-10-25';
  const before = structuredClone(state);
  const target: CalendarMoveTarget = {
    type: 'production',
    itemId: item.id,
    taskIds: item.tasks.map(task => task.id),
    date: '2026-10-24'
  };
  assert.match(calendarMoveDetails(state, target)!.description, /1 unfinished checklist task/);
  assert.equal(moveCalendarItem(state, target, '2026-10-28', '2026-10-24T12:00:00Z'), true);
  const expected = structuredClone(before);
  expected.items[0].tasks[2].due = '2026-10-28';
  expected.items[0].updatedAt = '2026-10-24T12:00:00Z';
  assert.deepEqual(state, expected);
  assert.equal(calendarMoveDetails(state, target), null);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('publishing moves change one channel date and never move posted records', () => {
  const state = seed();
  const item = state.items[0];
  const before = structuredClone(state);
  const target: CalendarMoveTarget = {
    type: 'publication',
    itemId: item.id,
    publicationId: item.publications[1].id
  };
  assert.equal(moveCalendarItem(state, target, '2026-11-01', '2026-10-24T12:00:00Z'), true);
  const expected = structuredClone(before);
  expected.items[0].publications[1].date = '2026-11-01';
  expected.items[0].updatedAt = '2026-10-24T12:00:00Z';
  assert.deepEqual(state, expected);
  item.publications[1].state = 'manually_posted';
  const posted = structuredClone(state);
  assert.equal(calendarMoveDetails(state, target), null);
  assert.equal(moveCalendarItem(state, target, '2026-11-02'), false);
  assert.deepEqual(state, posted);
});

test('invalid dates, stale occurrences and deleted or completed work are rejected without writes', () => {
  const state = seed();
  const item = state.items[0];
  saveDayTask(state, { title: 'Film', date: '2026-10-26', repeat: 'weekly' });
  const task = state.calendarTasks![0];
  const target: CalendarMoveTarget = {
    type: 'day-task',
    taskId: task.id,
    scheduledDate: task.date,
    date: task.date
  };
  const before = structuredClone(state);
  for (const date of [
    '',
    null,
    undefined,
    '2026-02-29',
    '2026-13-01',
    '2026-1-01',
    'tomorrow',
    task.date
  ]) {
    assert.equal(canMoveCalendarItem(state, target, date), false);
    assert.equal(moveCalendarItem(state, target, date), false);
  }
  const unavailable: CalendarMoveTarget[] = [
    { ...target, taskId: 'missing' },
    { ...target, scheduledDate: '2026-10-27' },
    { ...target, date: '2026-10-28' },
    { type: 'production', itemId: item.id, taskIds: [item.tasks[0].id], date: item.tasks[0].due },
    { type: 'production', itemId: item.id, taskIds: [item.tasks[2].id], date: '2026-11-01' },
    { type: 'publication', itemId: 'missing', publicationId: item.publications[0].id }
  ];
  for (const unavailableTarget of unavailable)
    assert.equal(moveCalendarItem(state, unavailableTarget, '2026-11-02'), false);
  assert.deepEqual(state, before);
});

test('import validation rejects malformed occurrence overrides while accepting existing task records', () => {
  const state = seed();
  saveDayTask(state, { title: 'Film', date: '2026-10-26', repeat: 'weekly' });
  assert.doesNotThrow(() => validateWorkspace(state));
  for (const movedDates of [
    null,
    [],
    '2026-10-28',
    { '2026-10-27': '2026-10-28' },
    { '2026-10-19': '2026-10-28' },
    { '2026-10-26': '2026-02-30' },
    { '2026-10-26': '2026-10-26' }
  ]) {
    const invalid = structuredClone(state);
    Object.assign(invalid.calendarTasks![0], { movedDates });
    assert.throws(() => validateWorkspace(invalid));
  }
});
