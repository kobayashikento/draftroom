'use client';

import {
  assistantBlockedReason,
  userAssistantMessage,
  conversationWithMessage,
  assistantErrorMessage,
  clearAssistantConversation
} from './assistant.helpers.ts';
import type { AssistantController, FailedAssistantRequest } from './assistant.helpers.ts';
import type { AssistantMessage, EditorTab } from '../../lib/types.ts';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { requestAssistant } from '../../lib/assistant-client.ts';
import {
  assistantMessages,
  appendAssistantMessage,
  prepareAssistantTurn,
  applyAssistantTurn
} from '../../lib/assistant-actions.ts';

export default function useAssistant(): AssistantController {
  const { state, update, cloud, conflict, storageStatus, open } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<FailedAssistantRequest | null>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef(state);
  const hasConflict = useRef(conflict);
  latest.current = state;
  hasConflict.current = conflict;
  useEffect(() => () => request.current?.abort(), []);

  function send(text: string, retryId?: string): boolean {
    text = text.trim();
    if (!text || request.current) return false;
    const blockedReason = assistantBlockedReason(cloud, conflict);
    if (blockedReason) {
      setError(blockedReason);
      return false;
    }
    const message = userAssistantMessage(text, retryId);
    const { id } = message;
    const messages = conversationWithMessage(latest.current, message);
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setFailed(null);
    update(draft => appendAssistantMessage(draft, message));
    void respond(id, text, messages, controller);
    return true;
  }
  async function respond(
    id: string,
    text: string,
    messages: AssistantMessage[],
    controller: AbortController
  ) {
    try {
      const response = await requestAssistant(latest.current, messages, controller.signal);
      if (controller.signal.aborted) return;
      if (hasConflict.current)
        throw new Error(
          'Your workspace changed on another device. Resolve the sync conflict, then try again. No assistant actions were applied.'
        );
      const turn = prepareAssistantTurn(latest.current, id, response);
      update(draft => applyAssistantTurn(draft, turn));
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(assistantErrorMessage(error));
        setFailed({ text, id });
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  function newChat() {
    if (request.current) return;
    update(clearAssistantConversation);
    setError('');
    setFailed(null);
  }
  function openReceipt(id: string, tab?: EditorTab) {
    if (latest.current.items.some(item => item.id === id)) open(id, tab);
    else setError('That idea has since been removed. Your conversation is still here.');
  }
  return {
    messages: assistantMessages(state),
    busy,
    error,
    cloud,
    storageStatus,
    open: openReceipt,
    send,
    newChat,
    retry: failed ? () => send(failed.text, failed.id) : null
  };
}
