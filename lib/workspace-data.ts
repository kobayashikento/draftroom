import type { Workspace, CacheStorage, WorkspaceCache } from './types.ts';
import { validAttachments } from '../supabase/functions/_shared/assistant-attachments.ts';
import { dateString, parseDate } from './model.ts';
export const LEGACY_STORAGE_KEY = 'studio-space-v1';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === 'string';
const date = (value: unknown) =>
  string(value) && (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value));
const calendarDate = (value: unknown): value is string =>
  string(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateString(parseDate(value)) === value;

function records(
  value: unknown,
  check: (record: Record<string, unknown>) => boolean
): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every(record => {
    if (!object(record) || !string(record.id) || !record.id || ids.has(record.id) || !check(record))
      return false;
    ids.add(record.id);
    return true;
  });
}

const included = (choices: readonly unknown[], value: unknown) => choices.includes(value);
export function validateWorkspace(data: unknown): Workspace {
  const stages = object(data) && records(data.stages, () => true) ? data.stages : [];
  const series = object(data) && records(data.series, () => true) ? data.series : [];
  const valid =
    object(data) &&
    data.version === 1 &&
    (data.calendarTasks === undefined ||
      records(
        data.calendarTasks,
        task =>
          string(task.title) &&
          Boolean(task.title.trim()) &&
          task.title.length <= 240 &&
          calendarDate(task.date) &&
          included(['none', 'weekly'], task.repeat) &&
          Array.isArray(task.completedDates) &&
          task.completedDates.every(calendarDate) &&
          new Set(task.completedDates).size === task.completedDates.length &&
          (task.movedDates === undefined ||
            (task.repeat === 'weekly' &&
              object(task.movedDates) &&
              Object.entries(task.movedDates).every(
                ([from, to]) =>
                  calendarDate(from) &&
                  calendarDate(to) &&
                  from !== to &&
                  from >= String(task.date) &&
                  parseDate(from).getDay() === parseDate(String(task.date)).getDay()
              ))) &&
          task.completedDates.every(
            date =>
              date >= String(task.date) &&
              (task.repeat === 'weekly'
                ? parseDate(date).getDay() === parseDate(String(task.date)).getDay()
                : date === task.date)
          )
      )) &&
    (data.assistant === undefined ||
      (object(data.assistant) &&
        validAttachments(data.assistant.attachments) &&
        records(
          data.assistant.messages,
          message =>
            included(['user', 'assistant'], message.role) &&
            string(message.text) &&
            message.text.length <= 6000 &&
            string(message.createdAt) &&
            validAttachments(message.attachments) &&
            (message.role === 'user' || message.attachments === undefined) &&
            (message.receipts === undefined ||
              (Array.isArray(message.receipts) &&
                message.receipts.length <= 10 &&
                message.receipts.every(
                  receipt => object(receipt) && string(receipt.itemId) && string(receipt.label)
                )))
        ) &&
        data.assistant.messages.length <= 60)) &&
    records(
      data.stages,
      stage => string(stage.name) && included(['prep', 'ready', 'posted'], stage.kind)
    ) &&
    data.stages.length > 0 &&
    records(
      data.series,
      series =>
        string(series.name) &&
        included(['Reel', 'Carousel'], series.format) &&
        string(series.cadence) &&
        string(series.description) &&
        Array.isArray(series.storyboard) &&
        series.storyboard.every(string) &&
        Array.isArray(series.tasks) &&
        series.tasks.every(string)
    ) &&
    records(
      data.items,
      item =>
        string(item.title) &&
        included(['Reel', 'Carousel'], item.format) &&
        stages.some(stage => stage.id === item.stageId) &&
        (item.seriesId === '' || series.some(series => series.id === item.seriesId)) &&
        ['hook', 'notes', 'tags', 'priority', 'cadence', 'createdAt', 'updatedAt'].every(key =>
          string(item[key])
        ) &&
        records(
          item.storyboard,
          entry =>
            ['title', 'notes', 'overlay', 'reference'].every(key => string(entry[key])) &&
            typeof entry.done === 'boolean'
        ) &&
        records(
          item.tasks,
          task =>
            string(task.title) &&
            string(task.category) &&
            typeof task.done === 'boolean' &&
            date(task.due) &&
            (task.priority === undefined || included(['Normal', 'High'], task.priority))
        ) &&
        records(
          item.publications,
          publication =>
            included(['Instagram', 'TikTok'], publication.platform) &&
            date(publication.date) &&
            ['caption', 'url', 'postId'].every(key => string(publication[key])) &&
            included(['planned', 'manually_posted'], publication.state) &&
            (publication.publishedAt === null || string(publication.publishedAt))
        )
    );
  if (!valid)
    throw new Error(
      'This workspace file is incomplete or uses an unsupported format. Your existing drafts have not been replaced.'
    );
  return data as Workspace;
}

export function parseWorkspace(text: string) {
  return validateWorkspace(JSON.parse(text));
}

export function readLegacyWorkspace(storage: CacheStorage) {
  const saved = storage.getItem(LEGACY_STORAGE_KEY);
  return saved === null ? null : parseWorkspace(saved);
}

export function workspaceCacheKey(projectUrl: string, userId: string) {
  return `draftroom:v1:${new URL(projectUrl).host}:${userId}`;
}

export function readCache(storage: CacheStorage, key: string): WorkspaceCache | null {
  const saved = storage.getItem(key);
  if (saved === null) return null;
  const cache: unknown = JSON.parse(saved);
  if (
    !object(cache) ||
    typeof cache.revision !== 'number' ||
    !Number.isSafeInteger(cache.revision) ||
    cache.revision < 0 ||
    typeof cache.dirty !== 'boolean'
  ) {
    throw new Error(
      'The saved browser copy could not be read. It has been preserved for recovery.'
    );
  }
  return { data: validateWorkspace(cache.data), revision: cache.revision, dirty: cache.dirty };
}

export function downloadWorkspace(data: Workspace) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'draftroom-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
