import type { AssistantConversation, AssistantConversationContent, Workspace } from './types.ts';

const originalConversationId = 'original-conversation';

export function assistantConversationId(state: Workspace): string {
  return state.assistant?.conversationId || originalConversationId;
}

export function currentAssistantConversation(state: Workspace): AssistantConversation {
  return {
    id: assistantConversationId(state),
    createdAt: state.assistant?.createdAt || state.assistant?.messages[0]?.createdAt || '',
    messages: state.assistant?.messages || [],
    ...(state.assistant?.attachments ? { attachments: state.assistant.attachments } : {})
  };
}

export function assistantConversationContent(
  state: Workspace,
  id = assistantConversationId(state)
): AssistantConversationContent | undefined {
  if (id === assistantConversationId(state)) return state.assistant;
  return state.assistant?.conversations?.find(conversation => conversation.id === id);
}

function archiveCurrent(state: Workspace): AssistantConversation[] {
  const current = currentAssistantConversation(state);
  const conversations = state.assistant?.conversations || [];
  return current.messages.length || current.attachments?.length
    ? [current, ...conversations.filter(conversation => conversation.id !== current.id)]
    : conversations;
}

export function startAssistantConversation(
  state: Workspace,
  id = crypto.randomUUID(),
  createdAt = new Date().toISOString()
): void {
  if (state.assistant?.conversationId && !state.assistant.messages.length) return;
  const conversations = archiveCurrent(state);
  state.assistant = { conversationId: id, createdAt, messages: [], conversations };
}

export function selectAssistantConversation(state: Workspace, id: string): void {
  if (id === assistantConversationId(state)) return;
  const selected = state.assistant?.conversations?.find(conversation => conversation.id === id);
  if (!selected) return;
  const conversations = archiveCurrent(state).filter(conversation => conversation.id !== id);
  state.assistant = {
    conversationId: selected.id,
    createdAt: selected.createdAt,
    messages: selected.messages,
    ...(selected.attachments ? { attachments: selected.attachments } : {}),
    conversations
  };
}
