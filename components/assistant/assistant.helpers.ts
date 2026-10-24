import type { RefObject } from 'react';
import type { AssistantMessage, EditorTab, Workspace, WorkspaceRow } from '../../lib/types.ts';
import { assistantMessages } from '../../lib/assistant-actions.ts';

export type SendAssistant = (text: string, retryId?: string) => boolean;
export type FailedAssistantRequest = { text: string; id: string };
export type AssistantController = {
  messages: AssistantMessage[];
  busy: boolean;
  error: string;
  cloud?: boolean;
  storageStatus: string;
  open: (id: string, tab?: EditorTab) => void;
  send: SendAssistant;
  newChat: () => void;
  retry: (() => boolean) | null;
};
export type ComposerKey = { key: string; shiftKey: boolean; nativeEvent: { isComposing: boolean } };

export function assistantBlockedReason(
  cloud: boolean | undefined,
  conflict: WorkspaceRow | null | undefined
): string {
  if (!cloud)
    return 'The assistant needs your signed-in workspace. Open the connected app to chat with Gemini.';
  if (conflict)
    return 'Choose which workspace version to keep before asking the assistant to make changes.';
  return '';
}

export function userAssistantMessage(text: string, id = crypto.randomUUID()): AssistantMessage {
  return { id, role: 'user', text: text.trim(), createdAt: new Date().toISOString() };
}

export function conversationWithMessage(
  state: Workspace,
  message: AssistantMessage
): AssistantMessage[] {
  return [...assistantMessages(state).filter(entry => entry.id !== message.id), message];
}

export function assistantErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The assistant couldn’t respond. Please try again.';
}

export function shouldSubmitAssistantMessage(event: ComposerKey): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing;
}

export function clearAssistantConversation(state: Workspace): void {
  state.assistant = { messages: [] };
}

export type AssistantComposerProps = {
  busy: boolean;
  onSend: SendAssistant;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

export type AssistantMessagesProps = {
  messages: AssistantMessage[];
  busy: boolean;
  onOpen: (id: string, tab?: EditorTab) => void;
};

export type AssistantPanelProps = {
  assistant: AssistantController;
  onClose: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  hidden: boolean;
};

export type AssistantWelcomeProps = { onSend: SendAssistant; disabled: boolean };

export const suggestions = [
  'What should I work on next?',
  'Help me plan next week',
  'Help me create a new reel'
];
