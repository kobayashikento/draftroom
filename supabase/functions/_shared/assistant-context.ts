import type { PlanningWorkspace, AssistantContext } from './types.ts';
// Only these planning fields leave Draftroom. Captions, notes, email and credentials stay out.
export function assistantContext(
  state: PlanningWorkspace,
  today: string,
  timezone: string,
): AssistantContext {
  const clip = (value: unknown, max = 240) => String(value || '').slice(0, max);
  const items = state.items.slice(0, 150).map((item) => ({
    id: clip(item.id, 100),
    title: clip(item.title),
    format: clip(item.format),
    stageId: clip(item.stageId, 100),
    seriesId: clip(item.seriesId, 100),
    priority: clip(item.priority),
    tasks: item.tasks.slice(0, 40).map((task) => ({
      id: clip(task.id, 100),
      title: clip(task.title),
      category: clip(task.category),
      due: clip(task.due, 10),
      done: task.done === true,
      priority: task.priority === 'High' ? 'High' : 'Normal',
    })),
    publications: item.publications.slice(0, 2).map(({ platform, date, state }) => ({
      platform: clip(platform, 20),
      date: clip(date, 10),
      state: clip(state, 30),
    })),
  }));
  return {
    today,
    timezone: clip(timezone, 80),
    totalIdeas: state.items.length,
    partial:
      state.items.length > 150 ||
      state.stages.length > 30 ||
      state.series.length > 60 ||
      state.items.some((item) => item.tasks.length > 40),
    stages: state.stages
      .slice(0, 30)
      .map(({ id, name, kind }) => ({ id: clip(id, 100), name: clip(name), kind: clip(kind, 20) })),
    series: state.series.slice(0, 60).map(({ id, name, format }) => ({
      id: clip(id, 100),
      name: clip(name),
      format: clip(format, 20),
    })),
    items,
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: Record<string, unknown>, fields: string[]) =>
  fields.every((field) => typeof value[field] === 'string');
const records = (value: unknown, check: (entry: Record<string, unknown>) => boolean) =>
  Array.isArray(value) && value.every((entry: unknown) => object(entry) && check(entry));
function planningWorkspace(value: unknown): value is PlanningWorkspace & Record<string, unknown> {
  return (
    object(value) &&
    records(value.stages, (stage) => strings(stage, ['id', 'name', 'kind'])) &&
    records(value.series, (series) => strings(series, ['id', 'name', 'format'])) &&
    records(
      value.items,
      (item) =>
        strings(item, ['id', 'title', 'format', 'stageId', 'seriesId', 'priority']) &&
        records(
          item.tasks,
          (task) =>
            strings(task, ['id', 'title', 'category', 'due']) &&
            typeof task.done === 'boolean' &&
            (task.priority === undefined || typeof task.priority === 'string'),
        ) &&
        records(item.publications, (publication) =>
          strings(publication, ['platform', 'date', 'state']),
        ),
    )
  );
}
export function validateContext(context: unknown): AssistantContext {
  if (
    !object(context) ||
    !planningWorkspace(context) ||
    context.items.length > 150 ||
    !context.stages.length ||
    context.stages.length > 30 ||
    context.series.length > 60 ||
    typeof context.today !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(context.today) ||
    typeof context.timezone !== 'string' ||
    context.items.some((item) => item.tasks.length > 40 || item.publications.length > 2)
  )
    throw new Error('Invalid workspace context.');
  const result = assistantContext(context, context.today, context.timezone);
  result.partial = context.partial === true || result.partial;
  result.totalIdeas =
    typeof context.totalIdeas === 'number' && Number.isSafeInteger(context.totalIdeas)
      ? context.totalIdeas
      : result.totalIdeas;
  return result;
}
