import type { AssistantAction, JsonSchema } from './types.ts';
import type { AssistantServiceAction } from './assistant-action-types.ts';
import { CREATIVE_BRIEF_SCHEMA, validateCreativeBrief } from './creative-brief.ts';

export const TASK_CATEGORIES = ['plan', 'film', 'photo', 'edit', 'caption', 'publish'] as const;
type FieldRule = { schema: JsonSchema; parse: (value: unknown) => unknown };
type ActionSpec = { fields: Record<string, FieldRule>; optional?: string[]; description: string };
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function validDate(value: string): boolean {
  return (
    value === '' ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value)
  );
}
const text = (max = 240, empty = false): FieldRule => ({
  schema: { type: 'string' },
  parse: value => {
    if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
      throw new Error('Invalid action text.');
    return value.trim();
  }
});
const choices = (values: readonly string[]): FieldRule => ({
  schema: { type: 'string', enum: values },
  parse: value => {
    if (typeof value !== 'string' || !values.includes(value))
      throw new Error('Invalid action choice.');
    return value;
  }
});
const bool: FieldRule = {
  schema: { type: 'boolean' },
  parse: value => {
    if (typeof value !== 'boolean') throw new Error('Invalid action flag.');
    return value;
  }
};
const date = (empty = true): FieldRule => ({
  schema: {
    type: 'string',
    description: empty ? 'YYYY-MM-DD or empty to clear the date' : 'YYYY-MM-DD'
  },
  parse: value => {
    if (typeof value !== 'string' || (!empty && !value) || !validDate(value))
      throw new Error('Invalid action date.');
    return value;
  }
});
const list = (rule: FieldRule, max = 100, nonempty = false): FieldRule => ({
  schema: { type: 'array', maxItems: max, items: rule.schema },
  parse: value => {
    if (!Array.isArray(value) || value.length > max || (nonempty && !value.length))
      throw new Error('Invalid action list.');
    return value.map(rule.parse);
  }
});
function fields(
  value: unknown,
  rules: Record<string, FieldRule>,
  optional: string[] = []
): Record<string, unknown> {
  if (!object(value) || Object.keys(value).some(key => !Object.hasOwn(rules, key)))
    throw new Error('Invalid action fields.');
  const result: Record<string, unknown> = {};
  for (const [key, rule] of Object.entries(rules)) {
    if (value[key] === undefined && optional.includes(key)) continue;
    result[key] = rule.parse(value[key]);
  }
  return result;
}
const schema = (rules: Record<string, FieldRule>, optional: string[] = []): JsonSchema => ({
  type: 'object',
  properties: Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, rule.schema])),
  required: Object.keys(rules).filter(key => !optional.includes(key)),
  additionalProperties: false
});
const patch = (rules: Record<string, FieldRule>): FieldRule => ({
  schema: schema(rules, Object.keys(rules)),
  parse: value => {
    const result = fields(value, rules, Object.keys(rules));
    if (!Object.keys(result).length) throw new Error('Specify at least one change.');
    return result;
  }
});
const id = text(100);
const format = choices(['Reel', 'Carousel']);
const priority = choices(['Normal', 'High']);
const platform = choices(['Instagram', 'TikTok']);
const repeat = choices(['none', 'weekly']);
const stageKind = choices(['prep', 'ready', 'posted']);
const taskFields = { title: text(), category: choices(TASK_CATEGORIES), due: date(), priority };
const ideaFields = {
  title: text(),
  format,
  stageId: id,
  seriesId: text(100, true),
  hook: text(2000, true),
  notes: text(12000, true),
  tags: text(2000, true),
  priority,
  cadence: text(240, true)
};
const storyboardFields = {
  title: text(),
  notes: text(4000, true),
  overlay: text(2000, true),
  reference: text(2000, true),
  done: bool
};
const publicationFields = {
  date: date(),
  caption: text(12000, true),
  url: text(2000, true),
  postId: text(240, true),
  posted: bool
};
const seriesFields = {
  name: text(),
  description: text(4000, true),
  format,
  cadence: text(240, true),
  storyboard: list(text()),
  tasks: list(text())
};
const creativeBrief: FieldRule = { schema: CREATIVE_BRIEF_SCHEMA, parse: validateCreativeBrief };

export const ASSISTANT_ACTIONS: Record<string, ActionSpec> = {
  create_idea: {
    fields: {
      title: text(),
      format,
      brief: creativeBrief,
      seriesId: text(100, true),
      tasks: list({ schema: schema(taskFields), parse: value => fields(value, taskFields) }, 12),
      changes: patch(ideaFields),
      storyboard: list(patch(storyboardFields), 100),
      publications: list(
        {
          schema: schema({ platform, changes: patch(publicationFields) }),
          parse: value => fields(value, { platform, changes: patch(publicationFields) })
        },
        2
      )
    },
    optional: ['changes', 'storyboard', 'publications', 'brief'],
    description:
      'Create an idea; use brief for a complete executable creative plan, saved into its hook, notes, storyboard and draft captions. Do not duplicate brief content in changes/storyboard/publications. An empty tasks list uses the normal checklist.'
  },
  write_creative_brief: {
    fields: { itemId: id, brief: creativeBrief },
    description:
      'Replace the creative plan for an existing idea when requested: hook, notes, complete storyboard and draft captions. Keep its title, format, tasks, workflow, dates and published captions. The brief format must match the idea. Use partial update actions for narrow edits.'
  },
  create_task: { fields: { itemId: id, ...taskFields }, description: 'Add a checklist task.' },
  prioritize_task: {
    fields: { itemId: id, taskId: id },
    description: 'Set a task to High priority.'
  },
  complete_task: { fields: { itemId: id, taskId: id }, description: 'Complete a checklist task.' },
  update_idea: {
    fields: { itemId: id, changes: patch(ideaFields) },
    description: 'Edit only the supplied idea fields; use stageId to move workflow stage.'
  },
  update_ideas: {
    fields: { itemIds: list(id, 1000, true), changes: patch(ideaFields) },
    description: 'Apply the same explicit field changes to several named ideas.'
  },
  duplicate_idea: {
    fields: { itemId: id, title: text() },
    description:
      'Copy an idea into a fresh draft with new IDs and reset tasks and publication status.'
  },
  delete_idea: {
    fields: { itemId: id, onlyUnposted: bool },
    optional: ['onlyUnposted'],
    description:
      'Propose removing one idea and its storyboard, tasks and schedules. Requires review.'
  },
  delete_ideas: {
    fields: { itemIds: list(id, 1000, true), onlyUnposted: bool },
    description: 'Propose removing the exact named ideas. Requires review.'
  },
  delete_unposted_ideas: {
    fields: {},
    description:
      'Propose removing all currently unposted ideas. The app finds the exact targets and protects posted work.'
  },
  update_task: {
    fields: { itemId: id, taskId: id, changes: patch({ ...taskFields, done: bool }) },
    description: 'Rename, reschedule, change category/priority, complete or reopen a task.'
  },
  delete_task: {
    fields: { itemId: id, taskId: id },
    description: 'Propose removing a checklist task.'
  },
  create_storyboard_entry: {
    fields: {
      itemId: id,
      title: text(),
      notes: text(4000, true),
      overlay: text(2000, true),
      reference: text(2000, true)
    },
    description: 'Add a storyboard shot or slide.'
  },
  update_storyboard_entry: {
    fields: { itemId: id, entryId: id, changes: patch(storyboardFields) },
    description: 'Edit a shot/slide or check it off or reopen it.'
  },
  delete_storyboard_entry: {
    fields: { itemId: id, entryId: id },
    description: 'Propose removing a storyboard entry.'
  },
  reorder: {
    fields: {
      target: choices(['ideas', 'tasks', 'storyboard', 'stages']),
      itemId: id,
      ids: list(id, 1000, true)
    },
    optional: ['itemId'],
    description:
      'Reorder the entire selected collection. Supply every existing ID exactly once. Tasks/storyboard require itemId.'
  },
  update_publication: {
    fields: { itemId: id, platform, changes: patch(publicationFields) },
    description:
      'Edit a platform plan: schedule/unschedule, caption/link, or manual posted/undo status. Does not publish to a social network.'
  },
  create_calendar_task: {
    fields: { title: text(), date: date(false), repeat },
    description: 'Create a standalone day task or weekly routine.'
  },
  update_calendar_task: {
    fields: { id, changes: patch({ title: text(), date: date(false), repeat }) },
    description: 'Edit an entire day-task routine.'
  },
  delete_calendar_task: {
    fields: { id },
    description: 'Propose removing a day-task routine and all its occurrences.'
  },
  complete_calendar_task: {
    fields: { id, date: date(false), done: bool },
    description:
      'Complete or reopen a single scheduled occurrence; date is the original occurrence date.'
  },
  move_calendar_task: {
    fields: { id, scheduledDate: date(false), date: date(false) },
    description: 'Move just one occurrence to a different day, keeping the weekly routine.'
  },
  create_series: {
    fields: seriesFields,
    description: 'Create a series and its reusable storyboard/checklist templates.'
  },
  update_series: {
    fields: { id, changes: patch(seriesFields) },
    description: 'Edit a series template without rewriting existing episodes.'
  },
  delete_series: {
    fields: { id },
    description: 'Propose removing a series; its ideas remain and become unassigned.'
  },
  create_stage: { fields: { name: text(), kind: stageKind }, description: 'Add a workflow stage.' },
  update_stage: {
    fields: { id, changes: patch({ name: text(), kind: stageKind }) },
    description: 'Rename a stage or change its behavior.'
  },
  delete_stage: {
    fields: { id },
    description:
      'Propose removing a stage; affected ideas move to the first remaining stage. Cannot remove the final stage.'
  },
  sync_posts: {
    fields: { platform, older: bool },
    description: 'Refresh connected posts/insights, or import older posts.'
  },
  import_post: {
    fields: { url: text(2000), title: text(240, true), itemId: text(100, true) },
    description: 'Import a public Instagram/TikTok link, optionally associated with an idea.'
  },
  update_media: {
    fields: { mediaId: id, itemId: text(100, true), archived: bool },
    optional: ['itemId', 'archived'],
    description:
      'Link/unlink a library post to an idea, archive it or restore it. Does not delete the platform post.'
  },
  link_publication: {
    fields: { itemId: id, platform, mediaId: id },
    description:
      'Match an API-synced published post to its platform plan and mark that channel live.'
  },
  unlink_publication: {
    fields: { itemId: id, platform },
    description: 'Remove a verified publication match and restore the earlier plan.'
  },
  connect_account: {
    fields: { platform },
    description:
      'Start the normal platform login/consent flow. The user completes it on the platform.'
  },
  disconnect_account: {
    fields: { platform },
    description: 'Propose disconnecting an account while keeping its saved posts.'
  },
  navigate: {
    fields: { href: text(2000) },
    description: 'Open a supplied Draftroom workspace URL. External URLs are not supported.'
  },
  open_calendar: {
    fields: { date: date(false), platform: choices(['', 'Instagram', 'TikTok']) },
    description: 'Open the calendar at a requested date/week and optionally filter the channel.'
  },
  export_workspace: { fields: {}, description: 'Download the workspace JSON backup.' },
  retry_sync: { fields: {}, description: 'Retry saving the workspace to the cloud.' },
  sign_out: {
    fields: {},
    description:
      'Start the existing sign-out flow, which first saves or offers recovery of pending workspace changes.'
  },
  new_conversation: {
    fields: {},
    description: 'Start a new chat while retaining the current conversation.'
  },
  open_conversation: {
    fields: { id },
    description: 'Open a previous conversation from the supplied conversation list.'
  },
  review_changes: {
    fields: { messageId: id },
    description: 'Open the existing review for a pending proposal. Does not apply it automatically.'
  },
  show_conversations: { fields: {}, description: 'Show the saved conversation list.' }
};

export function validateAssistantAction(value: unknown): AssistantAction {
  if (
    !object(value) ||
    typeof value.type !== 'string' ||
    !Object.hasOwn(ASSISTANT_ACTIONS, value.type)
  )
    throw new Error('Unsupported assistant action.');
  const spec = ASSISTANT_ACTIONS[value.type];
  const { type, ...values } = value;
  const parsed = fields(values, spec.fields, spec.optional);
  for (const key of ['ids', 'itemIds'])
    if (Array.isArray(parsed[key]) && new Set(parsed[key]).size !== parsed[key].length)
      throw new Error('Each target ID must appear only once.');
  return { type, ...parsed } as AssistantAction;
}

export const LEGACY_ACTION_TYPES = [
  'create_idea',
  'create_task',
  'prioritize_task',
  'complete_task'
];
type AssistantContract = 'legacy' | 'workspace' | 'creative';
export function assistantActionSchema(contract: AssistantContract = 'creative'): JsonSchema {
  return {
    anyOf: Object.entries(ASSISTANT_ACTIONS)
      .filter(([type]) =>
        contract === 'legacy'
          ? LEGACY_ACTION_TYPES.includes(type)
          : contract !== 'workspace' || type !== 'write_creative_brief'
      )
      .map(([type, spec]) => {
        const rules =
          contract === 'legacy' && type === 'create_idea'
            ? {
                title: spec.fields.title,
                format: spec.fields.format,
                seriesId: spec.fields.seriesId,
                tasks: spec.fields.tasks
              }
            : contract === 'workspace' && type === 'create_idea'
              ? Object.fromEntries(Object.entries(spec.fields).filter(([key]) => key !== 'brief'))
              : spec.fields;
        return {
          ...schema(
            { type: choices([type]), ...rules },
            (spec.optional || []).filter(key => Object.hasOwn(rules, key))
          ),
          description:
            type === 'create_idea' && contract !== 'creative'
              ? contract === 'legacy'
                ? 'Create an idea with title, format, seriesId and tasks.'
                : 'Create an idea with optional changes, storyboard entries and platform plans. An empty tasks list uses the normal checklist.'
              : spec.description
        };
      })
  };
}
export const ACTION_SCHEMA = assistantActionSchema();

export function actionRequiresReview(action: AssistantAction): boolean {
  return action.type.startsWith('delete_') || action.type === 'disconnect_account';
}
export function actionChecksPostedWork(action: AssistantAction): boolean {
  return (
    action.type === 'delete_unposted_ideas' ||
    ((action.type === 'delete_idea' || action.type === 'delete_ideas') &&
      action.onlyUnposted === true)
  );
}
export function isAssistantServiceAction(
  action: AssistantAction
): action is AssistantServiceAction {
  return [
    'sync_posts',
    'import_post',
    'update_media',
    'link_publication',
    'unlink_publication',
    'connect_account',
    'disconnect_account',
    'navigate',
    'open_calendar',
    'export_workspace',
    'retry_sync',
    'sign_out',
    'new_conversation',
    'open_conversation',
    'show_conversations',
    'review_changes'
  ].includes(action.type);
}
