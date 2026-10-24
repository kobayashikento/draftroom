'use client';
import type { AssistantMessage, EditorTab } from '../../lib/types.ts';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { requestAssistant } from '../../lib/assistant-client.ts';
import {
  assistantMessages,
  appendAssistantMessage,
  prepareAssistantTurn,
  applyAssistantTurn,
} from '../../lib/assistant-actions.ts';

export type SendAssistant = (text: string, retryId?: string) => boolean;
export type AssistantController = ReturnType<typeof useAssistant>;

export default function useAssistant() {
  const { state, update, cloud, conflict, storageStatus, open } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<{ text: string; id: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef(state);
  const hasConflict = useRef(conflict);
  latest.current = state;
  hasConflict.current = conflict;
  useEffect(() => () => request.current?.abort(), []);

  function send(text: string, retryId?: string): boolean {
    text = text.trim();
    if (!text || request.current) return false;
    if (!cloud) {
      setError(
        'The assistant needs your signed-in workspace. Open the connected app to chat with Gemini.',
      );
      return false;
    }
    if (conflict) {
      setError(
        'Choose which workspace version to keep before asking the assistant to make changes.',
      );
      return false;
    }
    const id = retryId || crypto.randomUUID();
    const message: AssistantMessage = {
      id,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    const messages = [
      ...assistantMessages(latest.current).filter((entry) => entry.id !== id),
      message,
    ];
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setFailed(null);
    update((draft) => appendAssistantMessage(draft, message));
    void respond(id, text, messages, controller);
    return true;
  }
  async function respond(
    id: string,
    text: string,
    messages: AssistantMessage[],
    controller: AbortController,
  ) {
    try {
      const response = await requestAssistant(latest.current, messages, controller.signal);
      if (controller.signal.aborted) return;
      if (hasConflict.current)
        throw new Error(
          'Your workspace changed on another device. Resolve the sync conflict, then try again. No assistant actions were applied.',
        );
      const turn = prepareAssistantTurn(latest.current, id, response);
      update((draft) => applyAssistantTurn(draft, turn));
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof Error
            ? error.message
            : 'The assistant couldn’t respond. Please try again.',
        );
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
    update((draft) => {
      draft.assistant = { messages: [] };
    });
    setError('');
    setFailed(null);
  }
  function openReceipt(id: string, tab?: EditorTab) {
    if (latest.current.items.some((item) => item.id === id)) open(id, tab);
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
    retry: failed ? () => send(failed.text, failed.id) : null,
  };
}
