import type { AssistantReply, ChatMessage, JsonSchema } from './types.ts';
import {
  ACTION_SCHEMA,
  LEGACY_ACTION_TYPES,
  assistantActionSchema,
  validateAssistantAction
} from './assistant-action-contract.ts';
export { TASK_CATEGORIES, validDate } from './assistant-action-contract.ts';
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
function text(value: unknown, name: string, max = 240) {
  if (typeof value !== 'string' || value.length > max || !value.trim())
    throw new Error(`Invalid ${name}.`);
  return value.trim();
}
function oneOf<T extends string>(value: unknown, choices: readonly T[]): T {
  const match = choices.find(choice => choice === value);
  if (!match) throw new Error('Invalid assistant field.');
  return match;
}
export function validateReply(value: unknown): AssistantReply {
  if (!object(value) || !Array.isArray(value.actions) || value.actions.length > 10)
    throw new Error('The assistant returned an unreadable plan. Please try again.');
  return {
    reply: text(value.reply, 'reply', 6000),
    actions: value.actions.map(validateAssistantAction)
  };
}

export function parseReplyJson(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

export function parseAssistantReply(value: string): AssistantReply {
  let parsed: unknown;
  try {
    parsed = parseReplyJson(value);
  } catch (error) {
    const trimmed = value.trim();
    // A complete conversational answer needs no actions. Never repair or extract
    // actions from malformed structured output, including fenced JSON.
    if (/^(?:[\{\[\"]|```)/.test(trimmed)) throw error;
    parsed = { reply: trimmed, actions: [] };
  }
  return validateReply(parsed);
}

export const REPLY_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'A concise answer under 5,000 characters.' },
    actions: { type: 'array', maxItems: 10, items: ACTION_SCHEMA }
  },
  required: ['reply', 'actions'],
  additionalProperties: false
};
export const LEGACY_REPLY_SCHEMA: JsonSchema = {
  ...REPLY_SCHEMA,
  properties: {
    ...REPLY_SCHEMA.properties,
    actions: { type: 'array', maxItems: 10, items: assistantActionSchema(LEGACY_ACTION_TYPES) }
  }
};

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
