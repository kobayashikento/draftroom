'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../workspace/workspace-context';
import { useMedia } from '../media/media-context';
import type { ActionReceipt } from '../../supabase/functions/_shared/types.ts';
import type { AssistantTurn } from '../../lib/assistant-actions.ts';
import type { AssistantReviewTarget } from './assistant-actions.helpers.ts';
import {
  assistantActionReview,
  currentAssistantReviewTarget
} from './assistant-actions.helpers.ts';
import {
  actionRequiresReview,
  actionChecksPostedWork,
  isAssistantServiceAction
} from '../../supabase/functions/_shared/assistant-action-contract.ts';
import {
  applyAssistantTurn,
  appendAssistantMessage,
  cancelAssistantProposal,
  confirmAssistantProposal,
  prepareAssistantTurn,
  previewAssistantTurn,
  proposalAssistantTurn
} from '../../lib/assistant-actions.ts';
import { validateReply } from '../../supabase/functions/_shared/assistant-protocol.ts';
import { executeAssistantServiceAction } from '../../lib/assistant-service-actions.helpers.ts';
import {
  startAssistantConversation,
  selectAssistantConversation
} from '../../lib/assistant-conversations.ts';

export default function useAssistantActions() {
  const workspace = useWorkspace();
  const library = useMedia();
  const router = useRouter();
  const latest = useRef({ workspace, library });
  latest.current = { workspace, library };
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewTarget, setReviewTarget] = useState<AssistantReviewTarget | null>(null);
  const [historyRequest, setHistoryRequest] = useState(0);

  function checkWorkspace() {
    if (latest.current.workspace.conflict)
      throw new Error('Resolve the workspace sync conflict before applying changes.');
  }
  async function runServices(turn: AssistantTurn, receipts: ActionReceipt[]) {
    for (const change of turn.changes) {
      checkWorkspace();
      if (!isAssistantServiceAction(change.action)) continue;
      const { workspace, library } = latest.current;
      receipts.push(
        await executeAssistantServiceAction(
          {
            state: workspace.state,
            library,
            navigate: href => router.push(href, { scroll: false }),
            openCalendar: (date, platform) => {
              workspace.setWeek(date);
              workspace.setPlatform(platform);
              router.push('/calendar/', { scroll: false });
            },
            retrySync: workspace.retrySync,
            signOut: workspace.signOut,
            openReview: messageId =>
              setReviewTarget(currentAssistantReviewTarget(workspace.state, messageId)),
            showConversations: () => setHistoryRequest(current => current + 1),
            newConversation: () => {
              const id = crypto.randomUUID();
              const createdAt = new Date().toISOString();
              workspace.update(draft => startAssistantConversation(draft, id, createdAt));
            },
            openConversation: id =>
              workspace.update(draft => selectAssistantConversation(draft, id))
          },
          change.action
        )
      );
    }
  }
  async function runResponse(
    requestId: string,
    response: unknown,
    conversationId: string
  ): Promise<void> {
    checkWorkspace();
    const { workspace, library } = latest.current;
    if (
      (library.loading || library.error) &&
      validateReply(response).actions.some(actionChecksPostedWork)
    )
      throw new Error(
        'Refresh the library before removing unposted ideas so published work can be checked.'
      );
    const turn = prepareAssistantTurn(workspace.state, requestId, response, library.media);
    previewAssistantTurn(workspace.state, turn, library.media);
    if (turn.changes.some(change => actionRequiresReview(change.action))) {
      workspace.update(draft =>
        applyAssistantTurn(draft, turn, conversationId, { media: library.media })
      );
      return;
    }
    const receipts: ActionReceipt[] = [];
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await runServices(turn, receipts);
      checkWorkspace();
      latest.current.workspace.update(draft =>
        applyAssistantTurn(draft, turn, conversationId, {
          media: latest.current.library.media,
          receipts
        })
      );
    } catch (failure) {
      const detail = failure instanceof Error ? failure.message : 'The action could not finish.';
      latest.current.workspace.update(draft =>
        appendAssistantMessage(
          draft,
          {
            id: `${requestId}-reply`,
            role: 'assistant',
            createdAt: new Date().toISOString(),
            receipts,
            text: receipts.length
              ? `${detail} The completed actions are listed below; remaining changes were not applied.`
              : `${detail} No workspace changes were applied.`
          },
          conversationId
        )
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function confirmReview(): Promise<void> {
    if (!reviewTarget || running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    const receipts: ActionReceipt[] = [];
    try {
      checkWorkspace();
      const { workspace, library } = latest.current;
      const turn = proposalAssistantTurn(
        workspace.state,
        reviewTarget.messageId,
        reviewTarget.conversationId
      );
      if (
        (library.loading || library.error) &&
        turn.changes.some(change => actionChecksPostedWork(change.action))
      )
        throw new Error(
          'Refresh the library before removing unposted ideas so published work can be checked.'
        );
      previewAssistantTurn(workspace.state, turn, library.media);
      await runServices(turn, receipts);
      checkWorkspace();
      latest.current.workspace.update(draft =>
        confirmAssistantProposal(draft, reviewTarget.messageId, reviewTarget.conversationId, {
          media: latest.current.library.media,
          receipts
        })
      );
      setReviewTarget(null);
    } catch (failure) {
      setError(
        `${failure instanceof Error ? failure.message : 'These changes could not be applied.'}${receipts.length ? ' Some external actions completed; review their current state before retrying.' : ''}`
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  function cancelReview() {
    if (!reviewTarget || running.current) return;
    workspace.update(draft =>
      cancelAssistantProposal(draft, reviewTarget.messageId, reviewTarget.conversationId)
    );
    setReviewTarget(null);
    setError('');
  }
  const review = assistantActionReview(workspace.state, library.media, reviewTarget);
  return {
    runResponse,
    running,
    busy,
    error,
    historyRequest,
    review: review ? { ...review, error: review.error || error } : null,
    reviewProposal: (messageId: string) => {
      setError('');
      setReviewTarget(currentAssistantReviewTarget(workspace.state, messageId));
    },
    closeReview: () => {
      if (!running.current) setReviewTarget(null);
    },
    cancelReview,
    confirmReview
  };
}
