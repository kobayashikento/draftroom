import type { EditorTab, View } from './types.ts';
import { viewPaths } from './navigation.ts';

export type WorkspaceLink =
  | { type: 'post'; id: string }
  | { type: 'idea'; id: string; tab: EditorTab; taskId?: string }
  | { type: 'series'; id: string }
  | { type: 'view'; view: View };

const tabs: EditorTab[] = ['Storyboard', 'Production', 'Publish', 'Notes', 'Analytics'];
const linkKeys = ['post', 'idea', 'tab', 'task', 'series'];
const validId = (id: string | null): id is string =>
  Boolean(id && id.length <= 100 && !/[\u0000-\u001f\u007f]/.test(id));

export function workspaceLinkHref(link: WorkspaceLink): string {
  if (link.type === 'view') return viewPaths[link.view];
  if (link.type === 'post') return `${viewPaths.Library}?${new URLSearchParams({ post: link.id })}`;
  if (link.type === 'series')
    return `${viewPaths.Series}?${new URLSearchParams({ series: link.id })}`;
  const query = new URLSearchParams({ idea: link.id, tab: link.tab });
  if (link.taskId) query.set('task', link.taskId);
  return `${link.tab === 'Production' ? viewPaths.Production : viewPaths.Ideas}?${query}`;
}

export function parseWorkspaceLink(href: string): WorkspaceLink | null {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\')) return null;
  const url = new URL(href, 'https://draftroom.invalid');
  const view = Object.entries(viewPaths).find(([, path]) => path === url.pathname)?.[0] as
    View | undefined;
  if (!view || url.hash || [...url.searchParams.keys()].some(key => !linkKeys.includes(key)))
    return null;
  if (linkKeys.some(key => url.searchParams.getAll(key).length > 1)) return null;
  const post = url.searchParams.get('post');
  const idea = url.searchParams.get('idea');
  const series = url.searchParams.get('series');
  if ([post, idea, series].filter(value => value !== null).length > 1) return null;
  if (validId(post) && view === 'Library' && url.searchParams.size === 1)
    return { type: 'post', id: post };
  if (validId(series) && view === 'Series' && url.searchParams.size === 1)
    return { type: 'series', id: series };
  if (validId(idea) && ['Ideas', 'Production'].includes(view)) {
    const tab = url.searchParams.get('tab') || 'Storyboard';
    const taskId = url.searchParams.get('task');
    if (
      !tabs.includes(tab as EditorTab) ||
      (taskId !== null && (!validId(taskId) || tab !== 'Production'))
    )
      return null;
    return { type: 'idea', id: idea, tab: tab as EditorTab, ...(taskId ? { taskId } : {}) };
  }
  return url.searchParams.size ? null : { type: 'view', view };
}

export function clearWorkspaceLink(href: string): string {
  const url = new URL(href, 'https://draftroom.invalid');
  linkKeys.forEach(key => url.searchParams.delete(key));
  return `${url.pathname}${url.search}${url.hash}`;
}
