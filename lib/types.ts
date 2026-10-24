import type {
  AssistantMessage,
  AssistantAttachment,
  Format,
  Priority
} from '../supabase/functions/_shared/types.ts';
export type {
  AssistantMessage,
  AssistantAttachment,
  AssistantFileDetails,
  Format,
  Priority,
  TaskCategory
} from '../supabase/functions/_shared/types.ts';
export type StageKind = 'prep' | 'ready' | 'posted';
export type Platform = 'Instagram' | 'TikTok';
export type Stage = { id: string; name: string; kind: StageKind };
export type Series = {
  id: string;
  name: string;
  format: Format;
  cadence: string;
  description: string;
  icon?: string;
  storyboard: string[];
  tasks: string[];
};
export type StoryboardEntry = {
  id: string;
  title: string;
  notes: string;
  overlay: string;
  reference: string;
  done: boolean;
};
export type Task = {
  id: string;
  title: string;
  category: string;
  done: boolean;
  due: string;
  priority?: Priority;
};
export type CalendarTask = {
  id: string;
  title: string;
  date: string;
  repeat: 'none' | 'weekly';
  completedDates: string[];
  movedDates?: Record<string, string>;
};
export type PublicationReference = {
  url: string;
  postId: string;
  state: 'planned' | 'manually_posted';
  publishedAt: string | null;
};
export type PublishedPostLink = {
  mediaId: string;
  previous: PublicationReference;
  previousStageId: string;
  previousLinkedItemId: string;
};
export type Publication = PublicationReference & {
  id: string;
  platform: Platform;
  date: string;
  caption: string;
  linkedPost?: PublishedPostLink;
};
export type Item = {
  id: string;
  title: string;
  format: Format;
  seriesId: string;
  stageId: string;
  hook: string;
  notes: string;
  tags: string;
  priority: string;
  cadence: string;
  createdAt: string;
  updatedAt: string;
  storyboard: StoryboardEntry[];
  tasks: Task[];
  publications: Publication[];
};
export type Workspace = {
  version: 1;
  stages: Stage[];
  series: Series[];
  items: Item[];
  calendarTasks?: CalendarTask[];
  assistant?: { messages: AssistantMessage[]; attachments?: AssistantAttachment[] };
};
export type PublicationCollection = { publications: Publication[] };
export type ItemOptions = { title: string; format?: Format; seriesId?: string };
export type ProductionTask = { p: Item; t: Task };
export type PublicationEntry = { p: Item; pub: Publication };
export type ProductionGroup = { item: Item; tasks: ProductionTask[] };
export type ProductionQueueOptions = { start?: string; end?: string };
export type ProductionQueue = {
  active: ProductionGroup[];
  completed: ProductionGroup[];
  next: ProductionTask | null;
  remaining: number;
};
export type CalendarMode = 'Week' | 'Month' | 'List';
export type View =
  'Overview' | 'Calendar' | 'Ideas' | 'Production' | 'Library' | 'Series' | 'Analytics';
export type EditorTab = 'Storyboard' | 'Production' | 'Publish' | 'Notes' | 'Analytics';
export type AddIdeaModal = { type: 'add'; seriesId?: string; date?: string; platform?: string };
export type WorkspaceModal =
  | AddIdeaModal
  | { type: 'series'; id?: string }
  | { type: 'stages' }
  | { type: 'reschedule'; id: string; publicationId: string }
  | { type: 'content'; id: string; tab: EditorTab; taskId?: string }
  | { type: 'media'; id: string };
export type OverviewCategory = 'planned' | 'ready' | 'tasks' | 'overdue';
export type OverviewSummary = {
  planned: Item[];
  ready: Item[];
  tasks: ProductionTask[];
  overdue: Item[];
};
export type WorkspaceUpdater = (change: (draft: Workspace) => void) => void;
export type ItemChange = (draft: Item) => void;
export type ItemUpdater = (id: string, change: ItemChange) => void;
export type StorageStatus = 'loading' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
export type WorkspaceRow = { data: Workspace | null; revision: number };
export type WorkspaceCache = { data: Workspace; revision: number; dirty: boolean };
export type WorkspaceSnapshot = {
  data: Workspace | null;
  revision: number;
  dirty: boolean;
  status: StorageStatus;
  error: string;
  cacheError: string;
  conflict: WorkspaceRow | null;
};
export type WorkspaceRepository = {
  load: () => Promise<WorkspaceRow>;
  save: (workspace: Workspace, revision: number) => Promise<WorkspaceRow>;
};
export type CacheStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};
export type ConflictChoice = 'cloud' | 'local';
export type CalendarFilters = {
  platform: string;
  format: string;
  seriesId: string;
  status: string;
  query: string;
};
export type CalendarEntryOptions = Partial<CalendarFilters> & {
  start?: string;
  end?: string;
  unscheduled?: boolean;
};
