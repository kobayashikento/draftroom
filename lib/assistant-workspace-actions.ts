import type { AssistantAction, ActionReceipt } from '../supabase/functions/_shared/types.ts';
import type { Item, Workspace } from './types.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import { isAssistantServiceAction } from '../supabase/functions/_shared/assistant-action-contract.ts';
import { createItem, kind } from './model.ts';
import { writeCreativeBrief } from './creative-brief.helpers.ts';
import { workspaceLinkHref } from './workspace-links.ts';
import { assignItemSeries, deleteIdea } from '../components/editors/editors.helpers.ts';
import { removeTask } from '../components/production/production.helpers.ts';
import {
  addStoryboardEntry,
  removeStoryboardEntry
} from '../components/editors/storyboard.helpers.ts';
import { togglePublicationPosted } from '../components/editors/publication.helpers.ts';
import { reschedulePublication } from '../components/calendar/calendar.helpers.ts';
import { saveSeriesTemplate, seriesForm } from '../components/editors/series.helpers.ts';
import { addStage, removeStage } from '../components/editors/stage.helpers.ts';
import {
  saveDayTask,
  removeDayTask,
  completeDayTask,
  moveDayTask,
  dayTaskOccursOn
} from '../components/calendar/day-task.helpers.ts';
import { resolvePublicationMedia } from '../components/media/publication-media.helpers.ts';

export function assistantItem(state: Workspace, id: string): Item {
  const item = state.items.find(item => item.id === id);
  if (!item) throw new Error('An idea in this plan is no longer available.');
  return item;
}
export function assistantIdeaPosted(state: Workspace, item: Item, media: MediaRecord[]): boolean {
  return (
    kind(state, item) === 'posted' ||
    item.publications.some(
      pub =>
        pub.state === 'manually_posted' ||
        pub.linkedPost ||
        pub.url.trim() ||
        pub.postId.trim() ||
        resolvePublicationMedia(item, pub, media).record?.source === 'api'
    ) ||
    media.some(record => record.linked_item_id === item.id && record.source !== 'upload')
  );
}
function ordered<T extends { id: string }>(records: T[], ids: string[]): T[] {
  if (ids.length !== records.length || new Set(ids).size !== records.length)
    throw new Error('The order must include every existing entry exactly once.');
  const byId = new Map(records.map(record => [record.id, record]));
  return ids.map(id => {
    const record = byId.get(id);
    if (!record) throw new Error('The entries to reorder have changed.');
    return record;
  });
}
function ideaReceipt(
  item: Item,
  label: string,
  tab: 'Storyboard' | 'Production' | 'Publish' | 'Notes' = 'Production'
): ActionReceipt[] {
  return [{ itemId: item.id, label, href: workspaceLinkHref({ type: 'idea', id: item.id, tab }) }];
}
function viewReceipt(label: string, href: string): ActionReceipt[] {
  return [{ itemId: '', label, href }];
}
function copyIdeaIds(item: Item, id: string): void {
  item.id = id;
  item.storyboard.forEach((entry, index) => {
    entry.id = `${id}-shot-${index}`;
  });
  item.tasks.forEach((task, index) => {
    task.id = `${id}-task-${index}`;
  });
  item.publications.forEach((pub, index) => {
    pub.id = `${id}-publication-${index}`;
  });
}

export function applyWorkspaceAction(
  state: Workspace,
  action: AssistantAction,
  id: string,
  media: MediaRecord[] = []
): ActionReceipt[] {
  if (isAssistantServiceAction(action)) return [];
  if (action.type === 'create_idea') {
    if (action.seriesId && !state.series.some(series => series.id === action.seriesId))
      throw new Error('That series has changed.');
    let item = state.items.find(item => item.id === id);
    if (!item) {
      item = createItem(state, action);
      if (action.tasks.length)
        item.tasks = action.tasks.map(task => ({ ...task, id: '', done: false }));
      copyIdeaIds(item, id);
      state.items.push(item);
      if (action.changes)
        applyWorkspaceAction(
          state,
          { type: 'update_idea', itemId: id, changes: action.changes },
          id,
          media
        );
      if (action.storyboard)
        item.storyboard = action.storyboard.map((entry, index) => ({
          id: `${id}-shot-${index}`,
          title: entry.title || 'A new moment',
          notes: entry.notes || '',
          overlay: entry.overlay || '',
          reference: entry.reference || '',
          done: entry.done === true
        }));
      for (const publication of action.publications || [])
        applyWorkspaceAction(
          state,
          { type: 'update_publication', itemId: id, ...publication },
          id,
          media
        );
      if (action.brief) {
        writeCreativeBrief(item, action.brief, id);
        if (action.brief.cadence) item.cadence = action.brief.cadence;
      }
    }
    return ideaReceipt(item, `Created idea: ${item.title}`, 'Storyboard');
  }
  if (action.type === 'write_creative_brief') {
    const item = assistantItem(state, action.itemId);
    writeCreativeBrief(item, action.brief, id);
    item.updatedAt = new Date().toISOString();
    return ideaReceipt(item, `Updated creative brief: ${item.title}`, 'Storyboard');
  }
  if (action.type === 'delete_unposted_ideas')
    throw new Error('Review the exact unposted ideas before deleting them.');
  if (action.type === 'delete_ideas') {
    const items = action.itemIds.map(itemId => assistantItem(state, itemId));
    if (action.onlyUnposted && items.some(item => assistantIdeaPosted(state, item, media)))
      throw new Error('An idea in this removal list is now posted. Review the updated list first.');
    for (const item of items) deleteIdea(state, item.id);
    return items.map(item => ({ itemId: '', label: `Removed idea: ${item.title}` }));
  }
  if (action.type === 'update_ideas') {
    return action.itemIds.flatMap(itemId =>
      applyWorkspaceAction(
        state,
        { type: 'update_idea', itemId, changes: action.changes },
        id,
        media
      )
    );
  }
  if (action.type === 'reorder') {
    if (action.target === 'ideas') state.items = ordered(state.items, action.ids);
    else if (action.target === 'stages') state.stages = ordered(state.stages, action.ids);
    else {
      const item = assistantItem(state, action.itemId || '');
      if (action.target === 'tasks') item.tasks = ordered(item.tasks, action.ids);
      else item.storyboard = ordered(item.storyboard, action.ids);
      item.updatedAt = new Date().toISOString();
      return ideaReceipt(
        item,
        `Reordered ${action.target}: ${item.title}`,
        action.target === 'tasks' ? 'Production' : 'Storyboard'
      );
    }
    return viewReceipt(`Reordered ${action.target}`, '/ideas/');
  }
  if (action.type === 'create_series' || action.type === 'update_series') {
    const existing =
      action.type === 'update_series'
        ? state.series.find(series => series.id === action.id)
        : undefined;
    if (action.type === 'update_series' && !existing)
      throw new Error('This series is no longer available.');
    const changes =
      action.type === 'create_series'
        ? {
            name: action.name,
            description: action.description,
            format: action.format,
            cadence: action.cadence,
            storyboard: action.storyboard,
            tasks: action.tasks
          }
        : action.changes;
    const form = {
      ...seriesForm(existing),
      ...changes,
      storyboard: changes.storyboard?.join('\n') ?? seriesForm(existing).storyboard,
      tasks: changes.tasks?.join('\n') ?? seriesForm(existing).tasks
    };
    if (action.type === 'create_series' && state.series.some(series => series.id === id))
      return viewReceipt(
        `Created series: ${action.name}`,
        workspaceLinkHref({ type: 'series', id })
      );
    if (!saveSeriesTemplate(state, form, existing?.id))
      throw new Error('The series could not be saved.');
    if (!existing) state.series[state.series.length - 1].id = id;
    return viewReceipt(
      `${existing ? 'Updated' : 'Created'} series: ${form.name}`,
      workspaceLinkHref({ type: 'series', id: existing?.id || id })
    );
  }
  if (action.type === 'delete_series') {
    const series = state.series.find(series => series.id === action.id);
    if (!series) throw new Error('This series is no longer available.');
    state.series = state.series.filter(series => series.id !== action.id);
    for (const item of state.items) if (item.seriesId === action.id) item.seriesId = '';
    return viewReceipt(`Removed series: ${series.name}; its ideas were kept`, '/series/');
  }
  if (action.type === 'create_stage') {
    if (!state.stages.some(stage => stage.id === id)) {
      addStage(state);
      Object.assign(state.stages[state.stages.length - 1], {
        id,
        name: action.name,
        kind: action.kind
      });
    }
    return viewReceipt(`Created stage: ${action.name}`, '/ideas/');
  }
  if (action.type === 'update_stage' || action.type === 'delete_stage') {
    const stage = state.stages.find(stage => stage.id === action.id);
    if (!stage) throw new Error('This stage is no longer available.');
    if (action.type === 'update_stage') Object.assign(stage, action.changes);
    else if (!removeStage(state, stage.id)) throw new Error('Keep at least one workflow stage.');
    return viewReceipt(
      `${action.type === 'update_stage' ? 'Updated' : 'Removed'} stage: ${stage.name}`,
      '/ideas/'
    );
  }
  if (action.type === 'create_calendar_task') {
    if (!state.calendarTasks?.some(task => task.id === id)) {
      if (!saveDayTask(state, { title: action.title, date: action.date, repeat: action.repeat }))
        throw new Error('The day task could not be created.');
      state.calendarTasks![state.calendarTasks!.length - 1].id = id;
    }
    return viewReceipt(`Created day task: ${action.title}`, '/calendar/');
  }
  if (
    [
      'update_calendar_task',
      'delete_calendar_task',
      'complete_calendar_task',
      'move_calendar_task'
    ].includes(action.type) &&
    'id' in action
  ) {
    const task = state.calendarTasks?.find(task => task.id === action.id);
    if (!task) throw new Error('This day task is no longer available.');
    if (action.type === 'update_calendar_task') {
      if (
        !saveDayTask(
          state,
          { title: task.title, date: task.date, repeat: task.repeat, ...action.changes },
          task.id
        )
      )
        throw new Error('The day task could not be updated.');
    } else if (action.type === 'delete_calendar_task') removeDayTask(state, task.id);
    else if (action.type === 'complete_calendar_task') {
      if (!dayTaskOccursOn(task, action.date))
        throw new Error('Choose an actual scheduled occurrence of this day task.');
      completeDayTask(state, task.id, action.date, action.done);
    } else if (action.type === 'move_calendar_task') {
      const current = task.movedDates?.[action.scheduledDate] || action.scheduledDate;
      if (
        current !== action.date &&
        !moveDayTask(state, task.id, action.scheduledDate, action.date)
      )
        throw new Error('This day task occurrence could not be moved.');
    }
    return viewReceipt(
      `${action.type === 'delete_calendar_task' ? 'Removed' : 'Updated'} day task: ${task.title}`,
      '/calendar/'
    );
  }
  if (!('itemId' in action)) throw new Error('Unsupported workspace action.');
  const item = assistantItem(state, action.itemId);
  if (action.type === 'duplicate_idea') {
    let copy = state.items.find(item => item.id === id);
    if (!copy) {
      copy = structuredClone(item);
      copyIdeaIds(copy, id);
      copy.title = action.title;
      copy.stageId = state.stages.find(stage => stage.kind === 'prep')?.id || state.stages[0].id;
      copy.createdAt = copy.updatedAt = new Date().toISOString();
      copy.tasks.forEach(task => {
        task.done = false;
        task.due = '';
      });
      copy.storyboard.forEach(entry => {
        entry.done = false;
      });
      copy.publications.forEach(pub => {
        pub.date = '';
        pub.url = '';
        pub.postId = '';
        pub.state = 'planned';
        pub.publishedAt = null;
        delete pub.linkedPost;
      });
      state.items.push(copy);
    }
    return ideaReceipt(copy, `Copied idea: ${copy.title}`, 'Storyboard');
  }
  if (action.type === 'delete_idea') {
    if (action.onlyUnposted && assistantIdeaPosted(state, item, media))
      throw new Error('This idea is now posted. Review the updated removal first.');
    deleteIdea(state, item.id);
    return [{ itemId: '', label: `Removed idea: ${item.title}` }];
  }
  if (action.type === 'update_idea') {
    const { changes } = action;
    if (changes.stageId && !state.stages.some(stage => stage.id === changes.stageId))
      throw new Error('That stage is no longer available.');
    if (changes.seriesId && !state.series.some(series => series.id === changes.seriesId))
      throw new Error('That series is no longer available.');
    if (changes.seriesId !== undefined) assignItemSeries(item, changes.seriesId, state);
    Object.assign(item, changes);
    item.updatedAt = new Date().toISOString();
    return ideaReceipt(
      item,
      `Updated idea: ${item.title}`,
      changes.notes !== undefined || changes.tags !== undefined ? 'Notes' : 'Storyboard'
    );
  }
  if (action.type === 'update_publication') {
    const publication = item.publications.find(pub => pub.platform === action.platform);
    if (!publication) throw new Error('This platform plan is no longer available.');
    const { date, posted, ...fields } = action.changes;
    if (
      publication.linkedPost &&
      (posted === false || fields.url !== undefined || fields.postId !== undefined)
    )
      throw new Error(
        'Remove the published-post match before changing its verified references or undoing its posted status.'
      );
    if (posted === false && publication.state === 'manually_posted')
      togglePublicationPosted(item, publication.id);
    if (
      date !== undefined &&
      date !== publication.date &&
      !reschedulePublication(item, publication.id, date)
    )
      throw new Error('Undo posted status before moving this publication date.');
    if (fields.url && !/^https?:\/\//i.test(fields.url))
      throw new Error('Use a full HTTP or HTTPS post URL.');
    Object.assign(publication, fields);
    if (posted !== undefined && posted !== (publication.state === 'manually_posted'))
      togglePublicationPosted(item, publication.id);
    item.updatedAt = new Date().toISOString();
    return ideaReceipt(item, `Updated ${action.platform} plan: ${item.title}`, 'Publish');
  }
  if (action.type === 'create_storyboard_entry') {
    if (!item.storyboard.some(entry => entry.id === id)) {
      addStoryboardEntry(item);
      Object.assign(item.storyboard[item.storyboard.length - 1], {
        id,
        title: action.title,
        notes: action.notes,
        overlay: action.overlay,
        reference: action.reference
      });
    }
    item.updatedAt = new Date().toISOString();
    return ideaReceipt(item, `Added storyboard entry: ${action.title}`, 'Storyboard');
  }
  if (action.type === 'update_storyboard_entry' || action.type === 'delete_storyboard_entry') {
    const entry = item.storyboard.find(entry => entry.id === action.entryId);
    if (!entry) throw new Error('A storyboard entry in this plan is no longer available.');
    if (action.type === 'delete_storyboard_entry') removeStoryboardEntry(item, entry.id);
    else Object.assign(entry, action.changes);
    item.updatedAt = new Date().toISOString();
    return ideaReceipt(
      item,
      `${action.type === 'delete_storyboard_entry' ? 'Removed' : 'Updated'} storyboard entry: ${entry.title}`,
      'Storyboard'
    );
  }
  if (action.type === 'create_task') {
    if (!item.tasks.some(task => task.id === id))
      item.tasks.push({
        id,
        title: action.title,
        category: action.category,
        due: action.due,
        priority: action.priority,
        done: false
      });
    item.updatedAt = new Date().toISOString();
    return ideaReceipt(item, `Added task: ${action.title}`);
  }
  if (
    action.type === 'update_task' ||
    action.type === 'delete_task' ||
    action.type === 'prioritize_task' ||
    action.type === 'complete_task'
  ) {
    const task = item.tasks.find(task => task.id === action.taskId);
    if (!task) throw new Error('A task in this plan is no longer available.');
    if (action.type === 'update_task') Object.assign(task, action.changes);
    else if (action.type === 'delete_task') removeTask(item, task.id);
    else if (action.type === 'complete_task') task.done = true;
    else task.priority = 'High';
    item.updatedAt = new Date().toISOString();
    const label =
      action.type === 'complete_task'
        ? 'Completed'
        : action.type === 'prioritize_task'
          ? 'Prioritized'
          : action.type === 'delete_task'
            ? 'Removed'
            : 'Updated';
    return ideaReceipt(item, `${label}: ${task.title}`);
  }
  throw new Error('Unsupported workspace action.');
}
