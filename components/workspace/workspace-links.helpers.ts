import type { Workspace, WorkspaceModal } from '../../lib/types.ts';
import type { WorkspaceLink } from '../../lib/workspace-links.ts';
import type { MediaRecord } from '../media/media.helpers.ts';

export function linkedWorkspaceModal(
  link: WorkspaceLink,
  state: Workspace,
  media: MediaRecord[]
): WorkspaceModal | null {
  if (link.type === 'post')
    return media.some(post => post.id === link.id) ? { type: 'media', id: link.id } : null;
  if (link.type === 'series')
    return state.series.some(series => series.id === link.id)
      ? { type: 'series', id: link.id }
      : null;
  if (link.type === 'idea') {
    const item = state.items.find(item => item.id === link.id);
    if (!item || (link.taskId && !item.tasks.some(task => task.id === link.taskId))) return null;
    return {
      type: 'content',
      id: link.id,
      tab: link.tab,
      ...(link.taskId ? { taskId: link.taskId } : {})
    };
  }
  return null;
}

export function sameWorkspaceModal(
  first: WorkspaceModal | null,
  second: WorkspaceModal | null
): boolean {
  if (
    !first ||
    !second ||
    first.type !== second.type ||
    !('id' in first) ||
    !('id' in second) ||
    first.id !== second.id
  )
    return false;
  if (first.type === 'content' && second.type === 'content')
    return first.tab === second.tab && first.taskId === second.taskId;
  return true;
}
