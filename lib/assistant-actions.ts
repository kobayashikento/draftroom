import type { Workspace, AssistantMessage, AssistantAttachment } from './types.ts';
import type {
  AssistantAction,
  ActionReceipt,
  AssistantProposal
} from '../supabase/functions/_shared/types.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import type { CreativeBrief } from '../supabase/functions/_shared/creative-brief.ts';
import { validateAttachments } from '../supabase/functions/_shared/assistant-attachments.ts';
import { validateReply } from '../supabase/functions/_shared/assistant-protocol.ts';
import {
  actionRequiresReview,
  isAssistantServiceAction,
  validateAssistantAction
} from '../supabase/functions/_shared/assistant-action-contract.ts';
import {
  assistantConversationContent,
  assistantConversationId
} from './assistant-conversations.ts';
import { applyWorkspaceAction, assistantIdeaPosted } from './assistant-workspace-actions.ts';
import { validateWorkspace } from './workspace-data.ts';
import { assistantServiceLabel } from './assistant-service-actions.helpers.ts';
import {
  preparePublicationPostLink,
  applyPublicationPostLink,
  removePublicationPostLink
} from '../components/media/publication-link.helpers.ts';

export type PreparedAssistantAction = { id: string; action: AssistantAction };
export type AssistantTurn = {
  requestId: string;
  reply: string;
  changes: PreparedAssistantAction[];
  briefs?: CreativeBrief[];
  briefItemIds?: string[];
};
export type AssistantApplyOptions = {
  media?: MediaRecord[];
  confirmed?: boolean;
  receipts?: ActionReceipt[];
};
export type AssistantActionPreview = {
  labels: string[];
  receipts: ActionReceipt[];
  workspace: Workspace;
};
const reviewVerbs: Record<string, string> = {
  Removed: 'Remove',
  Created: 'Create',
  Updated: 'Update',
  Added: 'Add',
  Copied: 'Copy',
  Reordered: 'Reorder'
};

export function assistantMessages(state: Workspace): AssistantMessage[] {
  return state.assistant?.messages || [];
}
export function assistantAttachments(state: Workspace): AssistantAttachment[] {
  return state.assistant?.attachments || [];
}
export function appendAssistantMessage(
  state: Workspace,
  message: AssistantMessage,
  conversationId = assistantConversationId(state)
) {
  state.assistant ||= { messages: [] };
  const conversation = assistantConversationContent(state, conversationId);
  if (!conversation) throw new Error('This conversation is no longer available.');
  if (message.attachments?.length) {
    const files = new Map((conversation.attachments || []).map(file => [file.id, file]));
    for (const file of message.attachments) files.set(file.id, file);
    conversation.attachments = validateAttachments([...files.values()]);
  }
  conversation.messages = [
    ...conversation.messages.filter(entry => entry.id !== message.id),
    message
  ].slice(-60);
}

export function prepareAssistantTurn(
  state: Workspace,
  requestId: string,
  response: unknown,
  media: MediaRecord[] = []
): AssistantTurn {
  const { reply, actions, briefs } = validateReply(response);
  const normalized: AssistantAction[] = actions.flatMap(action => {
    if (action.type !== 'delete_unposted_ideas') return [action];
    const itemIds = state.items
      .filter(item => !assistantIdeaPosted(state, item, media))
      .map(item => item.id);
    return itemIds.length ? [{ type: 'delete_ideas' as const, itemIds, onlyUnposted: true }] : [];
  });
  const changes = normalized.map((action, index) => ({
    id: `assistant-${requestId}-${index}`,
    action
  }));
  const plans = changes.flatMap(({ id, action }) =>
    (action.type === 'create_idea' || action.type === 'write_creative_brief') && action.brief
      ? [{ brief: action.brief, itemId: action.type === 'create_idea' ? id : action.itemId }]
      : []
  );
  return {
    requestId,
    briefs: [...plans.map(plan => plan.brief), ...(briefs || [])].slice(0, 8),
    briefItemIds: [...plans.map(plan => plan.itemId), ...(briefs || []).map(() => '')].slice(0, 8),
    reply:
      actions.some(action => action.type === 'delete_unposted_ideas') && !normalized.length
        ? 'There are no unposted ideas to remove. Your posted work was kept.'
        : reply,
    changes
  };
}

export function previewAssistantTurn(
  state: Workspace,
  turn: AssistantTurn,
  media: MediaRecord[] = []
): AssistantActionPreview {
  const workspace = structuredClone(state);
  const receipts: ActionReceipt[] = [];
  const labels: string[] = [];
  for (const change of turn.changes) {
    const { action } = change;
    if (isAssistantServiceAction(action)) {
      labels.push(assistantServiceLabel(workspace, media, action));
      if (action.type === 'link_publication' || action.type === 'unlink_publication') {
        const publication = workspace.items
          .find(item => item.id === action.itemId)!
          .publications.find(pub => pub.platform === action.platform)!;
        if (action.type === 'link_publication')
          applyPublicationPostLink(
            workspace,
            preparePublicationPostLink(workspace, media, {
              itemId: action.itemId,
              publicationId: publication.id,
              mediaId: action.mediaId
            })
          );
        else removePublicationPostLink(workspace, action.itemId, publication.id);
      }
    } else {
      const applied = applyWorkspaceAction(workspace, action, change.id, media);
      receipts.push(...applied);
      labels.push(
        ...applied.map(receipt =>
          receipt.label.replace(
            /^(Removed|Created|Updated|Added|Copied|Reordered)/,
            word => reviewVerbs[word] || word
          )
        )
      );
    }
  }
  validateWorkspace(workspace);
  return { labels, receipts, workspace };
}
function checkServiceReceipts(turn: AssistantTurn, receipts: ActionReceipt[] = []): void {
  if (
    turn.changes.filter(change => isAssistantServiceAction(change.action)).length !==
    receipts.length
  )
    throw new Error('The external actions have not all been confirmed by the app.');
}

function commitWorkspace(state: Workspace, workspace: Workspace): void {
  state.items = workspace.items;
  state.series = workspace.series;
  state.stages = workspace.stages;
  if (workspace.calendarTasks) state.calendarTasks = workspace.calendarTasks;
}

export function applyAssistantTurn(
  state: Workspace,
  turn: AssistantTurn,
  conversationId = assistantConversationId(state),
  options: AssistantApplyOptions = {}
) {
  state.assistant ||= { messages: [] };
  const conversation = assistantConversationContent(state, conversationId);
  if (!conversation) throw new Error('This conversation is no longer available.');
  if (conversation.messages.some(message => message.id === `${turn.requestId}-reply`)) return;
  let receipts: ActionReceipt[] = [];
  let proposal: AssistantProposal | undefined;
  let text = turn.reply;
  try {
    const preview = previewAssistantTurn(state, turn, options.media);
    if (!options.confirmed && turn.changes.some(change => actionRequiresReview(change.action))) {
      proposal = {
        status: 'pending',
        actions: turn.changes.map(change => change.action),
        labels: preview.labels
      };
      text = 'I’ve prepared these changes for your review. Nothing has been removed yet.';
    } else {
      checkServiceReceipts(turn, options.receipts);
      commitWorkspace(state, preview.workspace);
      receipts = [...preview.receipts, ...(options.receipts || [])];
    }
  } catch (error) {
    receipts = options.receipts || [];
    text = `${error instanceof Error ? error.message : 'This plan could not be applied.'} ${receipts.length ? 'The completed external operations are listed below; remaining workspace changes were not applied.' : 'No changes were made.'} Please ask again with the updated workspace.`;
  }
  appendAssistantMessage(
    state,
    {
      id: `${turn.requestId}-reply`,
      role: 'assistant',
      text,
      receipts,
      ...(turn.briefs?.length ? { briefs: turn.briefs, briefItemIds: turn.briefItemIds } : {}),
      ...(proposal ? { proposal } : {}),
      createdAt: new Date().toISOString()
    },
    conversationId
  );
}

export function proposalAssistantTurn(
  state: Workspace,
  messageId: string,
  conversationId = assistantConversationId(state)
): AssistantTurn {
  const message = assistantConversationContent(state, conversationId)?.messages.find(
    message => message.id === messageId
  );
  if (!message?.proposal || message.proposal.status !== 'pending')
    throw new Error('This proposal is no longer awaiting review.');
  const requestId = message.id.endsWith('-reply') ? message.id.slice(0, -6) : message.id;
  return {
    requestId,
    reply: message.text,
    changes: message.proposal.actions.map((value, index) => ({
      id: `assistant-${requestId}-${index}`,
      action: validateAssistantAction(value)
    }))
  };
}

export function confirmAssistantProposal(
  state: Workspace,
  messageId: string,
  conversationId = assistantConversationId(state),
  options: AssistantApplyOptions = {}
): void {
  const turn = proposalAssistantTurn(state, messageId, conversationId);
  const preview = previewAssistantTurn(state, turn, options.media);
  checkServiceReceipts(turn, options.receipts);
  commitWorkspace(state, preview.workspace);
  const message = assistantConversationContent(state, conversationId)!.messages.find(
    message => message.id === messageId
  )!;
  message.proposal!.status = 'applied';
  message.receipts = [...preview.receipts, ...(options.receipts || [])];
  message.text = 'Your reviewed changes were applied.';
}

export function cancelAssistantProposal(
  state: Workspace,
  messageId: string,
  conversationId = assistantConversationId(state)
): void {
  const message = assistantConversationContent(state, conversationId)?.messages.find(
    message => message.id === messageId
  );
  if (message?.proposal?.status === 'pending') {
    message.proposal.status = 'cancelled';
    message.text = 'Changes cancelled. Your workspace items were kept.';
  }
}
