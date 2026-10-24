import type {
  TaskDraft,
  AssistantReply,
  AssistantAction,
  ChatMessage,
  JsonSchema
} from './types.ts';
export const TASK_CATEGORIES = ['plan', 'film', 'photo', 'edit', 'caption', 'publish'] as const;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value: unknown, name: string, max = 240, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    throw new Error(`Invalid ${name}.`);
  return value.trim();
}
export function validDate(value: string) {
  if (value === '') return true;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function oneOf<T extends string>(value: unknown, choices: readonly T[]): T {
  const match = choices.find(choice => choice === value);
  if (!match) throw new Error('Invalid assistant field.');
  return match;
}
function taskFields(value: unknown): TaskDraft {
  if (!object(value)) throw new Error('Invalid task details.');
  const title = text(value.title, 'task title');
  if (
    !TASK_CATEGORIES.some(category => category === value.category) ||
    !['Normal', 'High'].some(choice => choice === value.priority) ||
    typeof value.due !== 'string' ||
    !validDate(value.due)
  )
    throw new Error('Invalid task details.');
  return {
    title,
    category: oneOf(value.category, TASK_CATEGORIES),
    due: value.due,
    priority: oneOf(value.priority, ['Normal', 'High'] as const)
  };
}
export function validateReply(value: unknown): AssistantReply {
  if (!object(value) || !Array.isArray(value.actions) || value.actions.length > 10)
    throw new Error('The assistant returned an unreadable plan. Please try again.');
  return {
    reply: text(value.reply, 'reply', 6000),
    actions: value.actions.map((action: unknown): AssistantAction => {
      if (!object(action)) throw new Error('Invalid assistant action.');
      if (action.type === 'create_idea') {
        if (
          !['Reel', 'Carousel'].some(choice => choice === action.format) ||
          !Array.isArray(action.tasks) ||
          action.tasks.length > 12
        )
          throw new Error('Invalid idea details.');
        return {
          type: action.type,
          title: text(action.title, 'idea title'),
          format: oneOf(action.format, ['Reel', 'Carousel'] as const),
          seriesId: text(action.seriesId, 'series', 100, true),
          tasks: action.tasks.map(taskFields)
        };
      }
      const itemId = text(action.itemId, 'idea', 100);
      if (action.type === 'create_task')
        return { type: action.type, itemId, ...taskFields(action) };
      if (action.type === 'prioritize_task' || action.type === 'complete_task')
        return { type: action.type, itemId, taskId: text(action.taskId, 'task', 100) };
      throw new Error('Unsupported assistant action.');
    })
  };
}

const string = { type: 'string' };
const taskProperties = {
  title: string,
  category: { type: 'string', enum: TASK_CATEGORIES },
  due: { type: 'string', description: 'YYYY-MM-DD or empty string when no date was requested' },
  priority: { type: 'string', enum: ['Normal', 'High'] }
};
const schema = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});
export const REPLY_SCHEMA = schema({
  reply: string,
  actions: {
    type: 'array',
    maxItems: 10,
    items: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['create_task', 'create_idea', 'prioritize_task', 'complete_task']
        },
        itemId: string,
        taskId: string,
        ...taskProperties,
        format: { type: 'string', enum: ['Reel', 'Carousel'] },
        seriesId: string,
        tasks: { type: 'array', maxItems: 12, items: schema(taskProperties) }
      },
      required: ['type'],
      additionalProperties: false
    }
  }
});

export function validateMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages) || !messages.length || messages.length > 16)
    throw new Error('Send between 1 and 16 messages.');
  const result = messages.map((message: unknown): ChatMessage => {
    if (!object(message) || !['user', 'assistant'].some(choice => choice === message.role))
      throw new Error('Invalid message.');
    return {
      role: oneOf(message.role, ['user', 'assistant'] as const),
      text: text(message.text, 'message', 6000)
    };
  });
  if (result.at(-1)?.role !== 'user') throw new Error('A user message is required.');
  return result;
}
