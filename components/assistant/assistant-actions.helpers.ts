import type { Workspace } from '../../lib/types.ts';
import type { MediaRecord } from '../media/media.helpers.ts';
import {
  assistantConversationContent,
  assistantConversationId
} from '../../lib/assistant-conversations.ts';
import { previewAssistantTurn, proposalAssistantTurn } from '../../lib/assistant-actions.ts';

export type AssistantReviewTarget = { messageId: string; conversationId: string };
export type AssistantActionReview = AssistantReviewTarget & {
  labels: string[];
  error: string;
  description: string;
};
export type AssistantActionReviewModalProps = {
  review: AssistantActionReview;
  busy: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
};

export function assistantActionReview(
  state: Workspace,
  media: MediaRecord[],
  target: AssistantReviewTarget | null
): AssistantActionReview | null {
  if (!target) return null;
  const message = assistantConversationContent(state, target.conversationId)?.messages.find(
    message => message.id === target.messageId
  );
  if (message?.proposal?.status !== 'pending') return null;
  let labels = message.proposal.labels;
  let error = '';
  try {
    labels = previewAssistantTurn(
      state,
      proposalAssistantTurn(state, target.messageId, target.conversationId),
      media
    ).labels;
  } catch (failure) {
    error =
      failure instanceof Error ? failure.message : 'The workspace has changed. Ask for a new plan.';
  }
  return {
    ...target,
    labels,
    error,
    description: message.proposal.actions.some(action =>
      ['delete_idea', 'delete_ideas'].includes(action.type)
    )
      ? 'Removing an idea also removes its storyboard, checklist and planned dates. Social posts and library files are kept.'
      : 'Check the exact changes below before applying them to your workspace.'
  };
}

export function currentAssistantReviewTarget(
  state: Workspace,
  messageId: string
): AssistantReviewTarget {
  return { messageId, conversationId: assistantConversationId(state) };
}
