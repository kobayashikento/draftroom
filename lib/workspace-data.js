export const LEGACY_STORAGE_KEY = 'studio-space-v1';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string';
const date = value => string(value) && (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value));

function records(value, check) {
  if (!Array.isArray(value)) return false;
  const ids = new Set();
  return value.every(record => {
    if (!object(record) || !string(record.id) || !record.id || ids.has(record.id) || !check(record)) return false;
    ids.add(record.id);
    return true;
  });
}

export function validateWorkspace(data) {
  const valid = object(data) && data.version === 1 &&
    records(data.stages, stage => string(stage.name) && ['prep', 'ready', 'posted'].includes(stage.kind)) &&
    data.stages.length > 0 &&
    records(data.series, series => string(series.name) && ['Reel', 'Carousel'].includes(series.format) &&
      string(series.cadence) && string(series.description) && Array.isArray(series.storyboard) &&
      series.storyboard.every(string) && Array.isArray(series.tasks) && series.tasks.every(string)) &&
    records(data.items, item => string(item.title) && ['Reel', 'Carousel'].includes(item.format) &&
      data.stages.some(stage => stage.id === item.stageId) &&
      (item.seriesId === '' || data.series.some(series => series.id === item.seriesId)) &&
      ['hook', 'notes', 'tags', 'priority', 'cadence', 'createdAt', 'updatedAt'].every(key => string(item[key])) &&
      records(item.storyboard, entry => ['title', 'notes', 'overlay', 'reference'].every(key => string(entry[key])) && typeof entry.done === 'boolean') &&
      records(item.tasks, task => string(task.title) && string(task.category) && typeof task.done === 'boolean' && date(task.due)) &&
      records(item.publications, publication => ['Instagram', 'TikTok'].includes(publication.platform) && date(publication.date) &&
        ['caption', 'url', 'postId'].every(key => string(publication[key])) &&
        ['planned', 'manually_posted'].includes(publication.state) &&
        (publication.publishedAt === null || string(publication.publishedAt))));
  if (!valid) throw new Error('This workspace file is incomplete or uses an unsupported format. Your existing drafts have not been replaced.');
  return data;
}

export function parseWorkspace(text) {
  return validateWorkspace(JSON.parse(text));
}

export function readLegacyWorkspace(storage) {
  const saved = storage.getItem(LEGACY_STORAGE_KEY);
  return saved === null ? null : parseWorkspace(saved);
}

export function workspaceCacheKey(projectUrl, userId) {
  return `draftroom:v1:${new URL(projectUrl).host}:${userId}`;
}

export function readCache(storage, key) {
  const saved = storage.getItem(key);
  if (saved === null) return null;
  const cache = JSON.parse(saved);
  if (!object(cache) || !Number.isSafeInteger(cache.revision) || cache.revision < 0 || typeof cache.dirty !== 'boolean') {
    throw new Error('The saved browser copy could not be read. It has been preserved for recovery.');
  }
  validateWorkspace(cache.data);
  return cache;
}

export function downloadWorkspace(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'draftroom-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
