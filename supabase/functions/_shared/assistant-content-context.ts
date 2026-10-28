import type { AssistantContentDetails, PlanningWorkspace } from './types.ts';

export function assistantContentDetails(
  state: PlanningWorkspace,
  query = ''
): AssistantContentDetails[] {
  if (!query.trim()) return [];
  const search = query.toLocaleLowerCase();
  return state.items
    .map(item => {
      const words = item.title
        .toLocaleLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(word => word.length >= 3);
      const matches = words.filter(word => search.includes(word)).length;
      const score =
        search.includes(item.id.toLowerCase()) || search.includes(item.title.toLowerCase())
          ? 100
          : matches >= Math.max(1, Math.ceil(words.length / 2))
            ? matches
            : 0;
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ item }) => ({
      itemId: item.id,
      hook: (item.hook || '').slice(0, 2000),
      notes: (item.notes || '').slice(0, 8000),
      tags: (item.tags || '').slice(0, 2000),
      cadence: (item.cadence || '').slice(0, 240),
      storyboard: (item.storyboard || []).slice(0, 40).map(entry => ({
        id: entry.id,
        title: entry.title.slice(0, 240),
        done: entry.done,
        notes: (entry.notes || '').slice(0, 1000),
        overlay: (entry.overlay || '').slice(0, 1000),
        reference: (entry.reference || '').slice(0, 1000)
      })),
      publications: item.publications.map(pub => ({
        platform: pub.platform,
        caption: (pub.caption || '').slice(0, 4000)
      })),
      truncated:
        (item.notes || '').length > 8000 ||
        (item.storyboard || []).length > 40 ||
        item.publications.some(pub => (pub.caption || '').length > 4000) ||
        (item.storyboard || []).some(entry =>
          [entry.notes, entry.overlay, entry.reference].some(value => (value || '').length > 1000)
        )
    }));
}

export function validContentDetails(value: unknown): value is AssistantContentDetails[] {
  if (!Array.isArray(value) || value.length > 8) return false;
  const strings = (entry: Record<string, unknown>, keys: string[], max: number) =>
    keys.every(key => typeof entry[key] === 'string' && entry[key].length <= max);
  return value.every(
    entry =>
      entry &&
      typeof entry === 'object' &&
      strings(entry, ['itemId', 'hook', 'notes', 'tags', 'cadence'], 8000) &&
      typeof entry.truncated === 'boolean' &&
      Array.isArray(entry.storyboard) &&
      entry.storyboard.length <= 40 &&
      entry.storyboard.every(
        (shot: Record<string, unknown>) =>
          shot &&
          typeof shot === 'object' &&
          strings(shot, ['id', 'title', 'notes', 'overlay', 'reference'], 1000) &&
          typeof shot.done === 'boolean'
      ) &&
      Array.isArray(entry.publications) &&
      entry.publications.length <= 2 &&
      entry.publications.every(
        (pub: Record<string, unknown>) =>
          pub && typeof pub === 'object' && strings(pub, ['platform', 'caption'], 4000)
      )
  );
}
