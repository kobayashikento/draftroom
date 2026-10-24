import assert from 'node:assert/strict';
import test from 'node:test';
import type { Item, ItemUpdater } from '../lib/types.ts';
import { seed } from '../lib/model.ts';
import { captureIdea, itemFieldSetter } from '../components/editors/editors.helpers.ts';
import {
  publicationFieldSetter,
  togglePublicationPosted
} from '../components/editors/publication.helpers.ts';
import { storyboardFieldSetter } from '../components/editors/storyboard.helpers.ts';
import { removeStage } from '../components/editors/stage.helpers.ts';
import { saveSeriesTemplate, seriesForm } from '../components/editors/series.helpers.ts';
import {
  productionDateRange,
  setTaskField,
  taskFieldSetter
} from '../components/production/production.helpers.ts';
import {
  changeIdeaFilter,
  emptyIdeaFilters,
  filterIdeas
} from '../components/views/ideas/ideas.helpers.ts';
import { createSeriesEpisode } from '../components/views/series/series.helpers.ts';
import { changeWorkspace, changeWorkspaceItem } from '../components/workspace/workspace.helpers.ts';
import {
  conversationWithMessage,
  shouldSubmitAssistantMessage
} from '../components/assistant/assistant.helpers.ts';

function updateFixture(item: Item): ItemUpdater {
  return (id, change) => {
    assert.equal(id, item.id);
    change(item);
  };
}

test('idea filters combine case-insensitive search, channel, and local week boundaries', () => {
  const state = seed();
  const item = state.items[0];
  item.publications[0].date = '2026-10-25';
  item.publications[1].date = '';
  let filters = changeIdeaFilter(emptyIdeaFilters, 'query', 'EMI');
  filters = changeIdeaFilter(filters, 'date', 'week');
  filters = changeIdeaFilter(filters, 'platform', 'Instagram');
  assert.deepEqual(filterIdeas(state.items, filters, '2026-10-23'), [item]);
  filters = changeIdeaFilter(filters, 'platform', 'TikTok');
  assert.deepEqual(filterIdeas(state.items, filters, '2026-10-23'), []);
  assert.equal(changeIdeaFilter(filters, 'format', 'invalid'), filters);
  assert.equal(changeIdeaFilter(filters, 'date', 'invalid'), filters);
});

test('unscheduled ideas require every channel to be undated', () => {
  const state = seed();
  const item = state.items[0];
  const filters = changeIdeaFilter(emptyIdeaFilters, 'date', 'unscheduled');
  assert.ok(!filterIdeas(state.items, filters, '2026-10-23').includes(item));
  item.publications.forEach(publication => {
    publication.date = '';
  });
  assert.ok(filterIdeas(state.items, filters, '2026-10-23').includes(item));
});

test('idea capture trims the title and schedules only the requested channel without changing the source', () => {
  const state = seed();
  const original = structuredClone(state);
  const item = captureIdea(
    state,
    { title: '  A new reel  ', format: 'Reel', seriesId: '' },
    { type: 'add', date: '2026-10-25', platform: 'TikTok' }
  );
  assert.ok(item);
  assert.equal(item.title, 'A new reel');
  assert.equal(item.publications[0].date, '');
  assert.equal(item.publications[1].date, '2026-10-25');
  assert.deepEqual(state, original);
  assert.equal(
    captureIdea(state, { title: '  ', format: 'Reel', seriesId: '' }, { type: 'add' }),
    null
  );
});

test('typed editor setters update the selected record and safely ignore removed records', () => {
  const item = seed().items[0];
  const update = updateFixture(item);
  const setItem = itemFieldSetter(item.id, update);
  const setTask = taskFieldSetter(item.id, update);
  const setStoryboard = storyboardFieldSetter(item.id, update);
  const setPublication = publicationFieldSetter(item.id, update);
  setItem('notes', 'A note');
  setTask(item.tasks[2].id, 'done', true);
  setStoryboard(item.storyboard[0].id, 'overlay', 'Hello');
  setPublication(item.publications[1].id, 'caption', 'A caption');
  assert.equal(item.notes, 'A note');
  assert.equal(item.tasks[2].done, true);
  assert.equal(item.storyboard[0].overlay, 'Hello');
  assert.equal(item.publications[1].caption, 'A caption');
  const edited = structuredClone(item);
  setTask('removed', 'done', true);
  setStoryboard('removed', 'done', true);
  setPublication('removed', 'date', '2026-10-25');
  assert.deepEqual(item, edited);
});

test('publication posted status stays independent of checklist, workflow and the other channel', () => {
  const item = seed().items[0];
  const original = structuredClone(item);
  togglePublicationPosted(item, item.publications[1].id, '2026-10-23T12:00:00.000Z');
  assert.equal(item.publications[1].state, 'manually_posted');
  assert.equal(item.publications[1].publishedAt, '2026-10-23T12:00:00.000Z');
  assert.deepEqual(item.publications[0], original.publications[0]);
  assert.deepEqual(item.tasks, original.tasks);
  assert.equal(item.stageId, original.stageId);
  togglePublicationPosted(item, item.publications[1].id);
  assert.deepEqual(item, original);
});

test('removing a stage migrates its ideas and cannot remove the last stage', () => {
  const state = seed();
  const removed = state.items[0].stageId;
  assert.equal(removeStage(state, removed), true);
  assert.ok(!state.stages.some(stage => stage.id === removed));
  assert.equal(state.items[0].stageId, state.stages[0].id);
  state.stages = [state.stages[0]];
  const original = structuredClone(state);
  assert.equal(removeStage(state, state.stages[0].id), false);
  assert.equal(removeStage(state, 'missing'), false);
  assert.deepEqual(state, original);
});

test('saving a series template changes future episodes without rewriting existing ideas', () => {
  const state = seed();
  const template = state.series[0];
  const originalIdeas = structuredClone(state.items);
  const form = {
    ...seriesForm(template),
    name: '  New rhythm  ',
    storyboard: 'New opening\n\nClosing',
    tasks: 'Plan\n  \nEdit'
  };
  assert.equal(saveSeriesTemplate(state, form, template.id), true);
  assert.equal(template.name, 'New rhythm');
  assert.deepEqual(template.storyboard, ['New opening', 'Closing']);
  const episode = createSeriesEpisode(state, template);
  assert.deepEqual(
    episode.storyboard.map(entry => entry.title),
    ['New opening', 'Closing']
  );
  assert.deepEqual(
    episode.tasks.map(task => task.title),
    ['Plan', 'Edit']
  );
  assert.ok(episode.publications.every(publication => !publication.date));
  assert.deepEqual(state.items, originalIdeas);
  assert.equal(saveSeriesTemplate(state, { ...form, name: ' ' }, template.id), false);
  assert.equal(saveSeriesTemplate(state, form, 'missing'), false);
});

test('production date ranges include the full Monday to Sunday week', () => {
  assert.deepEqual(productionDateRange('All', '2026-10-25'), { start: '', end: '' });
  assert.deepEqual(productionDateRange('Today', '2026-10-25'), {
    start: '2026-10-25',
    end: '2026-10-25'
  });
  assert.deepEqual(productionDateRange('This week', '2026-10-25'), {
    start: '2026-10-19',
    end: '2026-10-25'
  });
});

test('workspace edits clone the document, update timestamps, and tolerate a deleted target', () => {
  const state = seed();
  const original = structuredClone(state);
  const item = state.items[0];
  const edited = changeWorkspace(state, draft =>
    changeWorkspaceItem(
      draft,
      item.id,
      record => setTaskField(record, item.tasks[2].id, 'done', true),
      '2026-10-23T12:00:00.000Z'
    )
  );
  assert.deepEqual(state, original);
  assert.equal(edited.items[0].tasks[2].done, true);
  assert.equal(edited.items[0].updatedAt, '2026-10-23T12:00:00.000Z');
  changeWorkspaceItem(edited, 'removed', () => {
    assert.fail('A removed idea must not be edited');
  });
});

test('assistant retry replaces the same message and composition keys preserve multiline and IME input', () => {
  const state = seed();
  const message = {
    id: 'request',
    role: 'user' as const,
    text: 'First try',
    createdAt: '2026-10-23T12:00:00.000Z'
  };
  state.assistant = { messages: [message] };
  const retried = { ...message, text: 'Try again' };
  assert.deepEqual(conversationWithMessage(state, retried), [retried]);
  assert.deepEqual(state.assistant.messages, [message]);
  assert.equal(
    shouldSubmitAssistantMessage({
      key: 'Enter',
      shiftKey: false,
      nativeEvent: { isComposing: false }
    }),
    true
  );
  assert.equal(
    shouldSubmitAssistantMessage({
      key: 'Enter',
      shiftKey: true,
      nativeEvent: { isComposing: false }
    }),
    false
  );
  assert.equal(
    shouldSubmitAssistantMessage({
      key: 'Enter',
      shiftKey: false,
      nativeEvent: { isComposing: true }
    }),
    false
  );
});
