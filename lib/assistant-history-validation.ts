import { validAttachments } from '../supabase/functions/_shared/assistant-attachments.ts';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value.trim()) && value.length <= 240;

function validMessages(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 60) return false;
  const ids = new Set<string>();
  return value.every(message => {
    if (
      !object(message) ||
      typeof message.id !== 'string' ||
      !message.id ||
      ids.has(message.id) ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.text !== 'string' ||
      message.text.length > 6000 ||
      typeof message.createdAt !== 'string' ||
      !validAttachments(message.attachments) ||
      (message.role !== 'user' && message.attachments !== undefined) ||
      (message.receipts !== undefined &&
        (!Array.isArray(message.receipts) ||
          message.receipts.length > 10 ||
          !message.receipts.every(
            receipt =>
              object(receipt) &&
              typeof receipt.itemId === 'string' &&
              typeof receipt.label === 'string'
          )))
    )
      return false;
    ids.add(message.id);
    return true;
  });
}

export function validAssistantHistory(value: unknown): boolean {
  if (value === undefined) return true;
  if (
    !object(value) ||
    !validMessages(value.messages) ||
    !validAttachments(value.attachments) ||
    (value.conversationId !== undefined && !id(value.conversationId)) ||
    (value.createdAt !== undefined && typeof value.createdAt !== 'string')
  )
    return false;
  if (value.conversations === undefined) return true;
  if (!Array.isArray(value.conversations)) return false;
  const ids = new Set([value.conversationId || 'original-conversation']);
  return value.conversations.every(conversation => {
    if (
      !object(conversation) ||
      !id(conversation.id) ||
      ids.has(conversation.id) ||
      typeof conversation.createdAt !== 'string' ||
      !validMessages(conversation.messages) ||
      !validAttachments(conversation.attachments)
    )
      return false;
    ids.add(conversation.id);
    return true;
  });
}
