import type { RefObject } from 'react';
import type {
  AssistantMessage,
  AssistantAttachment,
  AssistantFileDetails,
  EditorTab,
  Workspace,
  WorkspaceRow
} from '../../lib/types.ts';
import { assistantMessages } from '../../lib/assistant-actions.ts';
import { planningFileRecord, planningFileType } from '../../lib/assistant-uploads.ts';
import { validateAttachments } from '../../supabase/functions/_shared/assistant-attachments.ts';

export type SendAssistant = (text: string, files?: File[], retryId?: string) => Promise<boolean>;
export type FailedAssistantRequest = { text: string; id: string };
export type AssistantController = {
  messages: AssistantMessage[];
  busy: boolean;
  uploading: boolean;
  activity: string;
  attachments: AssistantAttachment[];
  error: string;
  cloud?: boolean;
  storageStatus: string;
  open: (id: string, tab?: EditorTab) => void;
  send: SendAssistant;
  newChat: () => Promise<void>;
  cancelUpload: () => void;
  retry: (() => Promise<boolean>) | null;
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

export function unansweredAssistantRequest(state: Workspace): FailedAssistantRequest | null {
  const message = assistantMessages(state).at(-1);
  return message?.role === 'user' ? { id: message.id, text: message.text } : null;
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
  uploading: boolean;
  attachments: AssistantAttachment[];
  onCancelUpload: () => void;
  onSend: SendAssistant;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

export type AssistantMessagesProps = {
  messages: AssistantMessage[];
  hidden: boolean;
  busy: boolean;
  activity: string;
  onOpen: (id: string, tab?: EditorTab) => void;
};

export type AssistantPanelProps = {
  assistant: AssistantController;
  onClose: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  hidden: boolean;
};

export type AssistantWelcomeProps = { onSend: SendAssistant; disabled: boolean };

export type AssistantFileListProps = {
  files: AssistantFileDetails[];
  onRemove?: (index: number) => void;
  disabled?: boolean;
};

export function validatePlanningFiles(files: File[], existing: AssistantAttachment[]): void {
  const owner = '00000000-0000-4000-8000-000000000000';
  validateAttachments([...existing, ...files.map(file => planningFileRecord(file, owner))]);
}

export function planningFileDetails(file: File): AssistantFileDetails {
  return { name: file.name, size: file.size, mimeType: planningFileType(file) };
}

export function planningFileSize(size: number): string {
  return size < 1_000_000
    ? `${Math.max(1, Math.ceil(size / 1000))} KB`
    : `${(size / 1_000_000).toFixed(1)} MB`;
}

export function assistantMessageText(text: string, hasFiles: boolean): string {
  return (
    text.trim() ||
    (hasFiles
      ? 'Please review these planning files, summarize the key ideas and suggest next steps.'
      : '')
  );
}

export const suggestions = [
  'Which of my reels is performing best?',
  'What do my best posts have in common?',
  'What should I work on next?',
  'Help me plan next week'
];
