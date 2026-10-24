import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarEntries,
  calendarTasks,
  calendarRange,
  moveCalendarAnchor,
  reschedulePublication
} from '../components/calendar/calendar.helpers.ts';
import { seed } from '../lib/model.ts';
import { validateWorkspace } from '../lib/workspace-data.ts';

test('calendar periods align Monday through Sunday, including month and year boundaries', () => {
  assert.deepEqual(calendarRange('2026-11-01'), {
    start: '2026-10-26',
    end: '2026-11-01',
    days: 7
  });
  assert.deepEqual(calendarRange('2026-11-18', 'Month'), {
    start: '2026-10-26',
    end: '2026-12-06',
    days: 42
  });
  assert.deepEqual(calendarRange('2027-02-28', 'Month'), {
    start: '2027-02-01',
    end: '2027-02-28',
    days: 28
  });
  assert.deepEqual(calendarRange('2028-02-29', 'Month'), {
    start: '2028-01-31',
    end: '2028-03-05',
    days: 35
  });
  assert.deepEqual(calendarRange('2027-01-01', 'List'), {
    start: '2026-12-28',
    end: '2027-01-03',
    days: 7
  });
  assert.equal(moveCalendarAnchor('2026-01-31', 'Month', 1), '2026-02-01');
  assert.equal(moveCalendarAnchor('2026-12-31', 'Month', 1), '2027-01-01');
  assert.equal(moveCalendarAnchor('2027-01-01', 'Week', -1), '2026-12-21');
});

test('calendar filters operate on individual channel plans and combine with content filters', () => {
  const state = seed();
  const range = { start: '2026-10-26', end: '2026-11-01' };
  const emi = state.items[0];
  emi.publications[0].state = 'manually_posted';
  assert.equal(
    calendarEntries(state, { ...range, platform: 'TikTok', query: 'Emi' })[0].pub.id,
    emi.publications[1].id
  );
  assert.equal(
    calendarEntries(state, { ...range, platform: 'TikTok', status: 'manually_posted' }).length,
    0
  );
  assert.equal(
    calendarEntries(state, { ...range, platform: 'Instagram', status: 'manually_posted' })[0].pub
      .id,
    emi.publications[0].id
  );
  assert.equal(calendarEntries(state, { ...range, format: 'Carousel', seriesId: 'emi' }).length, 0);
  assert.equal(
    calendarEntries(state, { ...range, seriesId: 'obsessed', query: '  OBSESSED  ' }).length,
    1
  );
});

test('unscheduled tray includes only undated, unposted channel plans, including partially scheduled ideas', () => {
  const state = seed();
  const item = state.items[0];
  item.publications[1].date = '';
  const drafts = calendarEntries(state, { unscheduled: true, query: 'Emi' });
  assert.deepEqual(
    drafts.map(entry => entry.pub.id),
    [item.publications[1].id]
  );
  assert.equal(
    calendarEntries(state, { unscheduled: true, platform: 'Instagram', query: 'Emi' }).length,
    0
  );
  item.publications[1].state = 'manually_posted';
  assert.equal(calendarEntries(state, { unscheduled: true, query: 'Emi' }).length, 0);
});

test('rescheduling changes only the selected publication date and preserves all other content', () => {
  const item = seed().items[0];
  const before = structuredClone(item);
  assert.equal(reschedulePublication(item, item.publications[1].id, '2028-02-29'), true);
  const expected = structuredClone(before);
  expected.publications[1].date = '2028-02-29';
  assert.deepEqual(item, expected);
  assert.equal(reschedulePublication(item, item.publications[1].id, ''), true);
  assert.equal(item.publications[1].date, '');
  const state = seed();
  reschedulePublication(state.items[0], state.items[0].publications[0].id, '2026-11-02');
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('invalid dates, missing publications, and posted records cannot be rescheduled', () => {
  const item = seed().items[0];
  const before = structuredClone(item);
  for (const date of ['2026-02-30', '2026-13-01', 'tomorrow', '2026-1-03', null, undefined]) {
    assert.equal(reschedulePublication(item, item.publications[0].id, date), false);
  }
  assert.equal(reschedulePublication(item, 'missing', '2026-11-01'), false);
  assert.deepEqual(item, before);
  item.publications[0].state = 'manually_posted';
  assert.equal(reschedulePublication(item, item.publications[0].id, '2026-11-01'), false);
  assert.equal(reschedulePublication(item, item.publications[0].id, ''), false);
  assert.equal(item.publications[0].date, before.publications[0].date);
});

test('calendar tasks follow their own due dates, appear once across channels, and retain completed work', () => {
  const state = seed();
  state.items = [state.items[0]];
  const item = state.items[0];
  item.stageId = 'ready';
  item.tasks[0].due = '2026-10-26';
  item.tasks[1].due = '';
  item.tasks[2].due = '2026-10-27';
  item.tasks[3].due = '2026-11-02';
  const tasks = calendarTasks(state, calendarRange('2026-10-26'));
  assert.deepEqual(
    tasks.map(({ t }) => t.id),
    [item.tasks[0].id, item.tasks[2].id]
  );
  assert.equal(tasks[0].t.done, true);
  item.publications.forEach(pub => {
    pub.date = '';
  });
  assert.deepEqual(calendarTasks(state, calendarRange('2026-10-26')), tasks);
});

test('task filters combine content, channel publication status, and task search without duplication', () => {
  const state = seed();
  const item = state.items[0];
  item.tasks[2].title = 'Colour grade the footage';
  item.publications[0].state = 'manually_posted';
  const range = calendarRange('2026-10-19');
  assert.deepEqual(
    calendarTasks(state, { ...range, query: '  COLOUR GRADE  ' }).map(({ t }) => t.id),
    [item.tasks[2].id]
  );
  assert.equal(
    calendarTasks(state, { ...range, platform: 'TikTok', status: 'manually_posted' }).length,
    0
  );
  assert.equal(
    calendarTasks(state, {
      ...range,
      platform: 'Instagram',
      status: 'manually_posted',
      seriesId: 'emi'
    }).length,
    4
  );
  assert.equal(calendarTasks(state, { ...range, seriesId: 'emi', format: 'Carousel' }).length, 0);
});
