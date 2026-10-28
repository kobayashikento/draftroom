import type { Format, Priority, TaskCategory } from './types.ts';

export type AssistantPlatform = 'Instagram' | 'TikTok';
export type AssistantStageKind = 'prep' | 'ready' | 'posted';
export type AssistantRepeat = 'none' | 'weekly';
export type IdeaChanges = {
  title?: string;
  format?: Format;
  stageId?: string;
  seriesId?: string;
  hook?: string;
  notes?: string;
  tags?: string;
  priority?: Priority;
  cadence?: string;
};
export type TaskChanges = {
  title?: string;
  category?: TaskCategory;
  due?: string;
  done?: boolean;
  priority?: Priority;
};
export type StoryboardChanges = {
  title?: string;
  notes?: string;
  overlay?: string;
  reference?: string;
  done?: boolean;
};
export type PublicationChanges = {
  date?: string;
  caption?: string;
  url?: string;
  postId?: string;
  posted?: boolean;
};
export type SeriesChanges = {
  name?: string;
  description?: string;
  format?: Format;
  cadence?: string;
  storyboard?: string[];
  tasks?: string[];
};
export type StageChanges = { name?: string; kind?: AssistantStageKind };
export type CalendarTaskChanges = { title?: string; date?: string; repeat?: AssistantRepeat };
export type WorkspaceEditAction =
  | { type: 'update_idea'; itemId: string; changes: IdeaChanges }
  | { type: 'update_ideas'; itemIds: string[]; changes: IdeaChanges }
  | { type: 'duplicate_idea'; itemId: string; title: string }
  | { type: 'delete_idea'; itemId: string; onlyUnposted?: boolean }
  | { type: 'delete_ideas'; itemIds: string[]; onlyUnposted: boolean }
  | { type: 'delete_unposted_ideas' }
  | { type: 'update_task'; itemId: string; taskId: string; changes: TaskChanges }
  | { type: 'delete_task'; itemId: string; taskId: string }
  | {
      type: 'create_storyboard_entry';
      itemId: string;
      title: string;
      notes: string;
      overlay: string;
      reference: string;
    }
  | { type: 'update_storyboard_entry'; itemId: string; entryId: string; changes: StoryboardChanges }
  | { type: 'delete_storyboard_entry'; itemId: string; entryId: string }
  | {
      type: 'reorder';
      target: 'ideas' | 'tasks' | 'storyboard' | 'stages';
      itemId?: string;
      ids: string[];
    }
  | {
      type: 'update_publication';
      itemId: string;
      platform: AssistantPlatform;
      changes: PublicationChanges;
    }
  | { type: 'create_calendar_task'; title: string; date: string; repeat: AssistantRepeat }
  | { type: 'update_calendar_task'; id: string; changes: CalendarTaskChanges }
  | { type: 'delete_calendar_task'; id: string }
  | { type: 'complete_calendar_task'; id: string; date: string; done: boolean }
  | { type: 'move_calendar_task'; id: string; scheduledDate: string; date: string }
  | {
      type: 'create_series';
      name: string;
      description: string;
      format: Format;
      cadence: string;
      storyboard: string[];
      tasks: string[];
    }
  | { type: 'update_series'; id: string; changes: SeriesChanges }
  | { type: 'delete_series'; id: string }
  | { type: 'create_stage'; name: string; kind: AssistantStageKind }
  | { type: 'update_stage'; id: string; changes: StageChanges }
  | { type: 'delete_stage'; id: string };

export type AssistantServiceAction =
  | { type: 'sync_posts'; platform: AssistantPlatform; older: boolean }
  | { type: 'import_post'; url: string; title: string; itemId: string }
  | { type: 'update_media'; mediaId: string; itemId?: string; archived?: boolean }
  | { type: 'link_publication'; itemId: string; platform: AssistantPlatform; mediaId: string }
  | { type: 'unlink_publication'; itemId: string; platform: AssistantPlatform }
  | { type: 'connect_account'; platform: AssistantPlatform }
  | { type: 'disconnect_account'; platform: AssistantPlatform }
  | { type: 'navigate'; href: string }
  | { type: 'open_calendar'; date: string; platform: '' | AssistantPlatform }
  | { type: 'export_workspace' }
  | { type: 'retry_sync' }
  | { type: 'sign_out' }
  | { type: 'new_conversation' }
  | { type: 'open_conversation'; id: string }
  | { type: 'show_conversations' }
  | { type: 'review_changes'; messageId: string };
