'use client';

import {
  assistantBlockedReason,
  userAssistantMessage,
  conversationWithMessage,
  assistantErrorMessage,
  assistantConversationList,
  unansweredAssistantRequest
} from './assistant.helpers.ts';
import type { AssistantController, AssistantConversationError } from './assistant.helpers.ts';
import type {
  AssistantMessage,
  AssistantAttachment,
  EditorTab,
  Workspace
} from '../../lib/types.ts';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { requestAssistant } from '../../lib/assistant-client.ts';
import { uploadAssistantFiles, removeAssistantFiles } from '../../lib/assistant-uploads.ts';
import {
  assistantMessages,
  assistantAttachments,
  appendAssistantMessage,
  prepareAssistantTurn,
  applyAssistantTurn
} from '../../lib/assistant-actions.ts';
import {
  assistantConversationId,
  selectAssistantConversation,
  startAssistantConversation
} from '../../lib/assistant-conversations.ts';

export default function useAssistant(): AssistantController {
  const { state, update, cloud, conflict, storageStatus, open } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activity, setActivity] = useState('');
  const [notice, setNotice] = useState<AssistantConversationError | null>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef(state);
  const hasConflict = useRef(conflict);
  latest.current = state;
  hasConflict.current = conflict;
  useEffect(() => () => request.current?.abort(), []);
  function setError(message: string, conversationId = assistantConversationId(latest.current)) {
    setNotice(message ? { conversationId, message } : null);
  }

  async function send(text: string, files: File[] = [], retryId?: string): Promise<boolean> {
    text = text.trim();
    if (!text || request.current) return false;
    const blockedReason = assistantBlockedReason(cloud, conflict);
    if (blockedReason) {
      setError(blockedReason);
      return false;
    }
    const controller = new AbortController();
    const conversationId = assistantConversationId(latest.current);
    request.current = controller;
    setBusy(true);
    setUploading(files.length > 0);
    setActivity(
      files.length ? 'Preparing your planning files…' : 'Thinking through your next step…'
    );
    setError('');
    let uploaded: AssistantAttachment[] = [];
    try {
      uploaded = await uploadAssistantFiles(
        files,
        assistantAttachments(latest.current),
        controller.signal,
        setActivity
      );
      controller.signal.throwIfAborted();
      if (hasConflict.current) throw new Error(assistantBlockedReason(cloud, hasConflict.current));
      if (assistantConversationId(latest.current) !== conversationId)
        throw new Error('The selected conversation changed. Open it again before sending.');
      const message = userAssistantMessage(text, retryId);
      const previous = assistantMessages(latest.current).find(entry => entry.id === retryId);
      if (uploaded.length) message.attachments = uploaded;
      else if (previous?.attachments) message.attachments = previous.attachments;
      const snapshot = structuredClone(latest.current);
      const messages = conversationWithMessage(snapshot, message);
      appendAssistantMessage(snapshot, message);
      update(draft => appendAssistantMessage(draft, message));
      setUploading(false);
      setActivity(
        uploaded.length || assistantAttachments(snapshot).length
          ? 'Reading your planning files and thinking through your next step…'
          : 'Thinking through your next step…'
      );
      void respond(message.id, snapshot, messages, controller, conversationId);
      return true;
    } catch (error) {
      if (uploaded.length) await removeAssistantFiles(uploaded).catch(() => {});
      setError(
        controller.signal.aborted
          ? 'Upload cancelled. Your files are still selected.'
          : assistantErrorMessage(error),
        conversationId
      );
      setBusy(false);
      setUploading(false);
      request.current = null;
      return false;
    }
  }
  async function respond(
    id: string,
    snapshot: Workspace,
    messages: AssistantMessage[],
    controller: AbortController,
    conversationId: string
  ) {
    try {
      const response = await requestAssistant(snapshot, messages, controller.signal);
      if (controller.signal.aborted) return;
      if (hasConflict.current)
        throw new Error(
          'Your workspace changed on another device. Resolve the sync conflict, then try again. No assistant actions were applied.'
        );
      const turn = prepareAssistantTurn(latest.current, id, response);
      update(draft => applyAssistantTurn(draft, turn, conversationId));
    } catch (error) {
      if (!controller.signal.aborted) setError(assistantErrorMessage(error), conversationId);
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  function changeConversation(id?: string): boolean {
    if (request.current) return false;
    if (hasConflict.current) {
      setError(assistantBlockedReason(cloud, hasConflict.current));
      return false;
    }
    if (id) update(draft => selectAssistantConversation(draft, id));
    else {
      const conversationId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      update(draft => startAssistantConversation(draft, conversationId, createdAt));
    }
    setError('');
    return true;
  }
  function openReceipt(id: string, tab?: EditorTab) {
    if (latest.current.items.some(item => item.id === id)) open(id, tab);
    else setError('That idea has since been removed. Your conversation is still here.');
  }
  const retryRequest = unansweredAssistantRequest(state);
  const error = notice?.conversationId === assistantConversationId(state) ? notice.message : '';
  return {
    conversationId: assistantConversationId(state),
    conversations: assistantConversationList(state),
    messages: assistantMessages(state),
    busy,
    uploading,
    activity,
    attachments: assistantAttachments(state),
    error:
      error ||
      (!busy && retryRequest
        ? 'Your last message is saved. Its reply was interrupted. Try again to continue this conversation.'
        : ''),
    cloud,
    storageStatus,
    open: openReceipt,
    send,
    newChat: () => changeConversation(),
    selectChat: changeConversation,
    cancelUpload: () => {
      if (uploading) request.current?.abort();
    },
    retry: !busy && retryRequest ? () => send(retryRequest.text, [], retryRequest.id) : null
  };
}
