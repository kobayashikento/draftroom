import type {
  PlanningWorkspace,
  AssistantContext,
  AssistantNavigationLink,
  AssistantContextOptions
} from './types.ts';
import { workspaceLinkHref } from '../../../lib/workspace-links.ts';
import { viewPaths } from '../../../lib/navigation.ts';
import { assistantContentDetails, validContentDetails } from './assistant-content-context.ts';
import { validDate } from './assistant-action-contract.ts';
// Planning metadata is always bounded. Creative details are included only for ideas referenced by the conversation.
export function assistantContext(
  state: PlanningWorkspace,
  today: string,
  timezone: string,
  options: AssistantContextOptions = {}
): AssistantContext {
  const clip = (value: unknown, max = 240) => String(value || '').slice(0, max);
  const details = assistantContentDetails(state, options.query);
  const focused = new Set(details.map(detail => detail.itemId));
  const items = [...state.items]
    .sort((a, b) => Number(focused.has(b.id)) - Number(focused.has(a.id)))
    .slice(0, 150)
    .map(item => ({
      id: clip(item.id, 100),
      title: clip(item.title),
      format: clip(item.format),
      stageId: clip(item.stageId, 100),
      seriesId: clip(item.seriesId, 100),
      priority: clip(item.priority),
      posted: item.posted === true,
      storyboard: (item.storyboard || []).slice(0, 40).map(entry => ({
        id: clip(entry.id, 100),
        title: clip(entry.title),
        done: entry.done === true
      })),
      tasks: item.tasks.slice(0, 40).map(task => ({
        id: clip(task.id, 100),
        title: clip(task.title),
        category: clip(task.category),
        due: clip(task.due, 10),
        done: task.done === true,
        priority: task.priority === 'High' ? 'High' : 'Normal'
      })),
      publications: item.publications
        .slice(0, 2)
        .map(({ platform, date, state, id, url, postId }) => ({
          ...(id ? { id: clip(id, 100) } : {}),
          url: clip(url, 2000),
          postId: clip(postId),
          platform: clip(platform, 20),
          date: clip(date, 10),
          state: clip(state, 30)
        }))
    }));
  const series = state.series
    .slice(0, 60)
    .map(({ id, name, format, description, cadence, storyboard, tasks }) => ({
      description: clip(description, 1000),
      cadence: clip(cadence),
      storyboard: (storyboard || []).slice(0, 100).map(value => clip(value)),
      tasks: (tasks || []).slice(0, 100).map(value => clip(value)),
      id: clip(id, 100),
      name: clip(name),
      format: clip(format, 20)
    }));
  const links: AssistantNavigationLink[] =
    options.includeLinks === false
      ? []
      : [
          ...items.flatMap(item => [
            {
              type: 'idea' as const,
              id: item.id,
              title: item.title,
              href: workspaceLinkHref({ type: 'idea', id: item.id, tab: 'Storyboard' })
            },
            ...item.tasks.map(task => ({
              type: 'task' as const,
              id: task.id,
              title: task.title,
              parentTitle: item.title,
              href: workspaceLinkHref({
                type: 'idea',
                id: item.id,
                tab: 'Production',
                taskId: task.id
              })
            }))
          ]),
          ...series.map(series => ({
            type: 'series' as const,
            id: series.id,
            title: series.name,
            href: workspaceLinkHref({ type: 'series', id: series.id })
          })),
          ...Object.entries(viewPaths).map(([view, href]) => ({
            type: 'view' as const,
            id: view,
            title: view,
            href
          }))
        ];
  return {
    today,
    timezone: clip(timezone, 80),
    details,
    calendarTasks: (state.calendarTasks || []).slice(0, 200).map(task => ({
      id: clip(task.id, 100),
      title: clip(task.title),
      date: clip(task.date, 10),
      repeat: task.repeat,
      completedDates: task.completedDates.slice(-366),
      ...(task.movedDates
        ? { movedDates: Object.fromEntries(Object.entries(task.movedDates).slice(-366)) }
        : {})
    })),
    totalIdeas: state.items.length,
    partial:
      state.items.length > 150 ||
      (state.calendarTasks || []).length > 200 ||
      state.stages.length > 30 ||
      state.series.length > 60 ||
      state.items.some(item => item.tasks.length > 40),
    stages: state.stages
      .slice(0, 30)
      .map(({ id, name, kind }) => ({ id: clip(id, 100), name: clip(name), kind: clip(kind, 20) })),
    series,
    links,
    items
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: Record<string, unknown>, fields: string[]) =>
  fields.every(field => typeof value[field] === 'string');
const records = (value: unknown, check: (entry: Record<string, unknown>) => boolean) =>
  Array.isArray(value) && value.every((entry: unknown) => object(entry) && check(entry));
function planningWorkspace(value: unknown): value is PlanningWorkspace & Record<string, unknown> {
  return (
    object(value) &&
    records(value.stages, stage => strings(stage, ['id', 'name', 'kind'])) &&
    records(
      value.series,
      series =>
        strings(series, ['id', 'name', 'format']) &&
        (series.description === undefined || typeof series.description === 'string') &&
        (series.cadence === undefined || typeof series.cadence === 'string') &&
        ['storyboard', 'tasks'].every(
          key =>
            series[key] === undefined ||
            (Array.isArray(series[key]) &&
              series[key].every((value: unknown) => typeof value === 'string'))
        )
    ) &&
    (value.calendarTasks === undefined ||
      records(
        value.calendarTasks,
        task =>
          strings(task, ['id', 'title', 'date']) &&
          validDate(String(task.date)) &&
          Boolean(task.date) &&
          ['none', 'weekly'].includes(String(task.repeat)) &&
          Array.isArray(task.completedDates) &&
          task.completedDates.every(
            (date: unknown) => typeof date === 'string' && Boolean(date) && validDate(date)
          ) &&
          (task.movedDates === undefined ||
            (object(task.movedDates) &&
              Object.entries(task.movedDates).every(
                ([from, to]) =>
                  validDate(from) && typeof to === 'string' && Boolean(to) && validDate(to)
              )))
      )) &&
    records(
      value.items,
      item =>
        strings(item, ['id', 'title', 'format', 'stageId', 'seriesId', 'priority']) &&
        (item.posted === undefined || typeof item.posted === 'boolean') &&
        (item.storyboard === undefined ||
          records(
            item.storyboard,
            entry => strings(entry, ['id', 'title']) && typeof entry.done === 'boolean'
          )) &&
        records(
          item.tasks,
          task =>
            strings(task, ['id', 'title', 'category', 'due']) &&
            typeof task.done === 'boolean' &&
            (task.priority === undefined || typeof task.priority === 'string')
        ) &&
        records(
          item.publications,
          publication =>
            strings(publication, ['platform', 'date', 'state']) &&
            ['id', 'url', 'postId'].every(
              key => publication[key] === undefined || typeof publication[key] === 'string'
            )
        )
    )
  );
}
export function validateContext(context: unknown): AssistantContext {
  if (
    !object(context) ||
    !planningWorkspace(context) ||
    context.items.length > 150 ||
    (context.calendarTasks || []).length > 200 ||
    !context.stages.length ||
    context.stages.length > 30 ||
    context.series.length > 60 ||
    typeof context.today !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(context.today) ||
    typeof context.timezone !== 'string' ||
    context.items.some(item => item.tasks.length > 40 || item.publications.length > 2)
  )
    throw new Error('Invalid workspace context.');
  const result = assistantContext(context, context.today, context.timezone);
  if (context.details !== undefined) {
    if (!validContentDetails(context.details)) throw new Error('Invalid creative details.');
    result.details = context.details.filter(detail =>
      result.items.some(item => item.id === detail.itemId)
    );
  }
  if (context.library !== undefined) {
    if (
      !Array.isArray(context.library) ||
      !records(
        context.library,
        post =>
          strings(post, ['id', 'title', 'platform', 'source', 'linkedItemId', 'href']) &&
          typeof post.archived === 'boolean'
      ) ||
      context.library.length > 200
    )
      throw new Error('Invalid library context.');
    result.library = context.library.map((post: Record<string, unknown>) => ({
      id: String(post.id).slice(0, 100),
      title: String(post.title).slice(0, 240),
      platform: String(post.platform).slice(0, 20),
      source: String(post.source).slice(0, 20),
      linkedItemId: String(post.linkedItemId).slice(0, 100),
      archived: post.archived === true,
      href: workspaceLinkHref({ type: 'post', id: String(post.id).slice(0, 100) })
    }));
    result.libraryPartial = context.libraryPartial === true;
  }
  if (context.conversations !== undefined) {
    if (
      !Array.isArray(context.conversations) ||
      !records(context.conversations, conversation => strings(conversation, ['id', 'title'])) ||
      context.conversations.length > 60
    )
      throw new Error('Invalid conversation context.');
    result.conversations = context.conversations.map((conversation: Record<string, unknown>) => ({
      id: String(conversation.id).slice(0, 100),
      title: String(conversation.title).slice(0, 240)
    }));
  }
  if (context.proposals !== undefined) {
    if (
      !Array.isArray(context.proposals) ||
      context.proposals.length > 10 ||
      !records(context.proposals, proposal => strings(proposal, ['messageId', 'summary']))
    )
      throw new Error('Invalid proposal context.');
    result.proposals = context.proposals.map((proposal: Record<string, unknown>) => ({
      messageId: String(proposal.messageId).slice(0, 100),
      summary: String(proposal.summary).slice(0, 1000)
    }));
  }
  result.partial = context.partial === true || result.partial;
  result.totalIdeas =
    typeof context.totalIdeas === 'number' && Number.isSafeInteger(context.totalIdeas)
      ? context.totalIdeas
      : result.totalIdeas;
  return result;
}
