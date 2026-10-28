import type { AssistantMessage, EditorTab, Item, Workspace } from '../../lib/types.ts';
import { assistantConversationContent } from '../../lib/assistant-conversations.ts';
import { applyWorkspaceAction } from '../../lib/assistant-workspace-actions.ts';
import { validateCreativeBrief } from '../../supabase/functions/_shared/creative-brief.ts';

export type AssistantBriefProps = {
  message: AssistantMessage;
  index: number;
  conversationId: string;
  disabled: boolean;
  onOpen: (id: string, tab?: EditorTab) => void;
  onNavigate: () => void;
};
export function assistantBriefItem(
  state: Workspace,
  message: AssistantMessage,
  index: number
): Item | undefined {
  const itemId = message.briefItemIds?.[index] || `${message.id}-brief-${index}`;
  return state.items.find(item => item.id === itemId);
}
export function saveAssistantBrief(
  state: Workspace,
  conversationId: string,
  messageId: string,
  index: number
): void {
  const message = assistantConversationContent(state, conversationId)?.messages.find(
    message => message.id === messageId
  );
  if (!message?.briefs?.[index]) throw new Error('This creative brief is no longer available.');
  if (assistantBriefItem(state, message, index)) return;
  const brief = validateCreativeBrief(message.briefs[index]);
  const receipts = applyWorkspaceAction(
    state,
    {
      type: 'create_idea',
      title: brief.title,
      format: brief.format,
      seriesId: '',
      tasks: [],
      brief
    },
    `${message.id}-brief-${index}`
  );
  message.receipts = [...(message.receipts || []), ...receipts];
  message.briefItemIds ||= message.briefs.map(() => '');
  message.briefItemIds[index] = `${message.id}-brief-${index}`;
}
