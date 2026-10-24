'use client';

import {
  assistantBlockedReason,
  userAssistantMessage,
  conversationWithMessage,
  assistantErrorMessage,
  clearAssistantConversation,
  unansweredAssistantRequest
} from './assistant.helpers.ts';
import type { AssistantController, FailedAssistantRequest } from './assistant.helpers.ts';
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

export default function useAssistant(): AssistantController {
  const { state, update, cloud, conflict, storageStatus, open } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activity, setActivity] = useState('');
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<FailedAssistantRequest | null>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef(state);
  const hasConflict = useRef(conflict);
  latest.current = state;
  hasConflict.current = conflict;
  useEffect(() => () => request.current?.abort(), []);

  async function send(text: string, files: File[] = [], retryId?: string): Promise<boolean> {
    text = text.trim();
    if (!text || request.current) return false;
    const blockedReason = assistantBlockedReason(cloud, conflict);
    if (blockedReason) {
      setError(blockedReason);
      return false;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setUploading(files.length > 0);
    setActivity(
      files.length ? 'Preparing your planning files…' : 'Thinking through your next step…'
    );
    setError('');
    setFailed(null);
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
      void respond(message.id, text, snapshot, messages, controller);
      return true;
    } catch (error) {
      if (uploaded.length) await removeAssistantFiles(uploaded).catch(() => {});
      setError(
        controller.signal.aborted
          ? 'Upload cancelled. Your files are still selected.'
          : assistantErrorMessage(error)
      );
      setBusy(false);
      setUploading(false);
      request.current = null;
      return false;
    }
  }
  async function respond(
    id: string,
    text: string,
    snapshot: Workspace,
    messages: AssistantMessage[],
    controller: AbortController
  ) {
    try {
      const response = await requestAssistant(snapshot, messages, controller.signal);
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
  async function newChat() {
    if (request.current) return;
    if (hasConflict.current) {
      setError(assistantBlockedReason(cloud, hasConflict.current));
      return;
    }
    request.current = new AbortController();
    setBusy(true);
    setActivity('Clearing this chat’s planning files…');
    try {
      await removeAssistantFiles(assistantAttachments(latest.current));
      update(clearAssistantConversation);
      setError('');
      setFailed(null);
    } catch (error) {
      setError(assistantErrorMessage(error));
    } finally {
      setBusy(false);
      request.current = null;
    }
  }
  function openReceipt(id: string, tab?: EditorTab) {
    if (latest.current.items.some(item => item.id === id)) open(id, tab);
    else setError('That idea has since been removed. Your conversation is still here.');
  }
  const retryRequest = failed || unansweredAssistantRequest(state);
  return {
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
    newChat,
    cancelUpload: () => {
      if (uploading) request.current?.abort();
    },
    retry: !busy && retryRequest ? () => send(retryRequest.text, [], retryRequest.id) : null
  };
}
