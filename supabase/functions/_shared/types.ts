import type { PerformanceContext } from './social-types.ts';
import type { CreativeBrief } from './creative-brief.ts';
import type {
  WorkspaceEditAction,
  AssistantServiceAction,
  IdeaChanges,
  StoryboardChanges,
  PublicationChanges,
  AssistantPlatform
} from './assistant-action-types.ts';

export type Format = 'Reel' | 'Carousel';
export type Priority = 'Normal' | 'High';
export type TaskCategory = 'plan' | 'film' | 'photo' | 'edit' | 'caption' | 'publish';
export type TaskDraft = { title: string; category: TaskCategory; due: string; priority: Priority };
export type CreateTaskAction = TaskDraft & { type: 'create_task'; itemId: string };
export type CreateIdeaAction = {
  type: 'create_idea';
  title: string;
  format: Format;
  seriesId: string;
  tasks: TaskDraft[];
  changes?: IdeaChanges;
  storyboard?: StoryboardChanges[];
  publications?: { platform: AssistantPlatform; changes: PublicationChanges }[];
  brief?: CreativeBrief;
};
export type ExistingTaskAction = {
  type: 'prioritize_task' | 'complete_task';
  itemId: string;
  taskId: string;
};
export type AssistantAction =
  | CreateTaskAction
  | CreateIdeaAction
  | ExistingTaskAction
  | WorkspaceEditAction
  | AssistantServiceAction;
export type AssistantReply = {
  reply: string;
  actions: AssistantAction[];
  briefs?: CreativeBrief[];
};
export type ChatMessage = { role: 'user' | 'assistant'; text: string };
export type AssistantFileDetails = {
  name: string;
  mimeType: string;
  size: number;
};
export type AssistantAttachment = AssistantFileDetails & {
  id: string;
  path: string;
};
export type GeminiAttachment = { name: string; mimeType: string; uri: string };
export type ActionReceipt = { itemId: string; label: string; href?: string };
export type AssistantProposal = {
  actions: AssistantAction[];
  labels: string[];
  status: 'pending' | 'applied' | 'cancelled';
};
export type AssistantMessage = ChatMessage & {
  id: string;
  createdAt: string;
  receipts?: ActionReceipt[];
  attachments?: AssistantAttachment[];
  proposal?: AssistantProposal;
  briefs?: CreativeBrief[];
  briefItemIds?: string[];
};
export type PlanningTask = {
  id: string;
  title: string;
  category: string;
  due: string;
  done: boolean;
  priority?: string;
};
export type PlanningStoryboardEntry = {
  id: string;
  title: string;
  done: boolean;
  notes?: string;
  overlay?: string;
  reference?: string;
};
export type PlanningPublication = {
  platform: string;
  date: string;
  state: string;
  id?: string;
  url?: string;
  postId?: string;
  caption?: string;
};
export type PlanningCalendarTask = {
  id: string;
  title: string;
  date: string;
  repeat: 'none' | 'weekly';
  completedDates: string[];
  movedDates?: Record<string, string>;
};
export type AssistantContentDetails = {
  itemId: string;
  hook: string;
  notes: string;
  tags: string;
  cadence: string;
  storyboard: PlanningStoryboardEntry[];
  publications: { platform: string; caption: string }[];
  truncated: boolean;
};
export type AssistantLibraryPost = {
  id: string;
  title: string;
  platform: string;
  source: string;
  linkedItemId: string;
  archived: boolean;
  href: string;
};
export type AssistantConversationReference = { id: string; title: string };
export type PlanningItem = {
  id: string;
  title: string;
  format: string;
  stageId: string;
  seriesId: string;
  priority: string;
  tasks: PlanningTask[];
  publications: PlanningPublication[];
  storyboard?: PlanningStoryboardEntry[];
  hook?: string;
  notes?: string;
  tags?: string;
  cadence?: string;
  posted?: boolean;
};
export type PlanningStage = { id: string; name: string; kind: string };
export type PlanningSeries = {
  id: string;
  name: string;
  format: string;
  description?: string;
  cadence?: string;
  storyboard?: string[];
  tasks?: string[];
};
export type PlanningWorkspace = {
  items: PlanningItem[];
  stages: PlanningStage[];
  series: PlanningSeries[];
  calendarTasks?: PlanningCalendarTask[];
};
export type AssistantContext = PlanningWorkspace & {
  today: string;
  timezone: string;
  totalIdeas: number;
  partial: boolean;
  performance?: PerformanceContext;
  links: AssistantNavigationLink[];
  details?: AssistantContentDetails[];
  library?: AssistantLibraryPost[];
  libraryPartial?: boolean;
  conversations?: AssistantConversationReference[];
  proposals?: { messageId: string; summary: string }[];
  creativeBriefs?: CreativeBrief[];
};
export type AssistantNavigationLink = {
  type: 'idea' | 'task' | 'series' | 'view';
  id: string;
  title: string;
  href: string;
  parentTitle?: string;
};
export type AssistantContextOptions = { includeLinks?: boolean; query?: string };
export type AssistantRequest = { context: AssistantContext; messages: ChatMessage[] };
export type JsonSchema = {
  type?: string;
  anyOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: readonly string[];
  description?: string;
  items?: JsonSchema;
  maxItems?: number;
  minItems?: number;
};
export type GeminiPart = { text?: string; thought?: boolean };
export type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[];
};
