import test from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarDragData } from '../components/calendar/calendar-dnd.helpers.ts';
import {
  calendarDragId,
  calendarDropPlan,
  readCalendarDragData,
  readCalendarDropDate
} from '../components/calendar/calendar-dnd.helpers.ts';
import { moveCalendarItem } from '../components/calendar/calendar-move.helpers.ts';
import { calendarDayTasks, saveDayTask } from '../components/calendar/day-task.helpers.ts';
import { calendarRange } from '../components/calendar/calendar.helpers.ts';
import { seed } from '../lib/model.ts';

test('dnd-kit identifiers distinguish channels, production days and recurring task occurrences', () => {
  const ids = [
    calendarDragId({
      type: 'day-task',
      taskId: 'shared',
      scheduledDate: '2026-10-26',
      date: '2026-10-27'
    }),
    calendarDragId({
      type: 'day-task',
      taskId: 'shared',
      scheduledDate: '2026-11-02',
      date: '2026-11-02'
    }),
    calendarDragId({ type: 'production', itemId: 'shared', taskIds: ['a'], date: '2026-10-26' }),
    calendarDragId({ type: 'production', itemId: 'shared', taskIds: ['a'], date: '2026-10-27' }),
    calendarDragId({ type: 'publication', itemId: 'shared', publicationId: 'instagram' }),
    calendarDragId({ type: 'publication', itemId: 'shared', publicationId: 'tiktok' })
  ];
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    calendarDragId({
      type: 'day-task',
      taskId: 'shared',
      scheduledDate: '2026-10-26',
      date: '2026-10-28'
    }),
    ids[0]
  );
});

test('a dnd-kit drop commits the same occurrence move used by the calendar date editor', () => {
  const state = seed();
  saveDayTask(state, { title: 'Film', date: '2026-10-26', repeat: 'weekly' });
  const source: CalendarDragData = {
    label: 'Film',
    kind: 'Day task',
    target: {
      type: 'day-task',
      taskId: state.calendarTasks![0].id,
      scheduledDate: '2026-10-26',
      date: '2026-10-26'
    }
  };
  const before = structuredClone(state);
  const plan = calendarDropPlan(state, source, { date: '2026-10-28' }, false);
  assert.ok(plan);
  assert.deepEqual(state, before);
  assert.equal(moveCalendarItem(state, plan.target, plan.date), true);
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2026-10-26')).map(task => task.date),
    ['2026-10-28']
  );
  assert.deepEqual(
    calendarDayTasks(state, calendarRange('2026-11-02')).map(task => task.date),
    ['2026-11-02']
  );
});

test('canceled, outside, invalid, unchanged and stale drops never produce a workspace update', () => {
  const state = seed();
  const item = state.items[0];
  const source: CalendarDragData = {
    label: item.title,
    kind: 'Publication',
    target: { type: 'publication', itemId: item.id, publicationId: item.publications[0].id }
  };
  const before = structuredClone(state);
  assert.equal(calendarDropPlan(state, source, { date: '2026-10-28' }, true), null);
  for (const destination of [
    null,
    undefined,
    {},
    { date: '' },
    { date: '2026-02-30' },
    { date: item.publications[0].date }
  ]) {
    assert.equal(calendarDropPlan(state, source, destination, false), null);
  }
  assert.equal(
    calendarDropPlan(
      state,
      { ...source, target: { ...source.target, itemId: 'missing' } },
      { date: '2026-10-28' },
      false
    ),
    null
  );
  assert.deepEqual(state, before);
  item.publications[0].state = 'manually_posted';
  assert.equal(calendarDropPlan(state, source, { date: '2026-10-28' }, false), null);
});

test('drag payload validation rejects unrelated or malformed data at the library boundary', () => {
  for (const value of [
    null,
    undefined,
    'item',
    {},
    { target: {} },
    { label: 'Film', kind: 'Task', target: { type: 'other' } },
    {
      label: 'Film',
      kind: 'Task',
      target: { type: 'production', itemId: 'id', date: '2026-10-26', taskIds: [null] }
    },
    {
      label: 'Film',
      kind: 'Task',
      target: { type: 'day-task', taskId: '', scheduledDate: '2026-10-26', date: '2026-10-26' }
    }
  ]) {
    assert.equal(readCalendarDragData(value), null);
  }
  assert.equal(readCalendarDropDate({ date: '2028-02-29' }), '2028-02-29');
  assert.equal(readCalendarDropDate({ date: '2027-02-29' }), '');
});
