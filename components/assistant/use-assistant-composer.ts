'use client';

import { useRef, useState } from 'react';
import type { AssistantComposerDraft, AssistantComposerProps } from './assistant.helpers.ts';
import {
  assistantErrorMessage,
  assistantMessageText,
  validatePlanningFiles
} from './assistant.helpers.ts';

export default function useAssistantComposer({
  busy,
  onSend,
  attachments,
  conversationId
}: AssistantComposerProps) {
  const [drafts, setDrafts] = useState(() => new Map<string, AssistantComposerDraft>());
  const {
    text: draft,
    files,
    error
  } = drafts.get(conversationId) || { text: '', files: [], error: '' };
  function setDraftState(change: Partial<AssistantComposerDraft>) {
    setDrafts(current =>
      new Map(current).set(conversationId, {
        ...(current.get(conversationId) || { text: '', files: [], error: '' }),
        ...change
      })
    );
  }
  const setDraft = (text: string) => setDraftState({ text });
  const setError = (error: string) => setDraftState({ error });
  const fileInput = useRef<HTMLInputElement | null>(null);
  function addFiles(selected: File[]) {
    if (busy || !selected.length) return;
    try {
      const next = [...files, ...selected];
      validatePlanningFiles(next, attachments);
      setDraftState({ files: next, error: '' });
    } catch (error) {
      setError(assistantErrorMessage(error));
    }
  }
  function removeFile(index: number) {
    if (busy) return;
    setDraftState({ files: files.filter((_, position) => position !== index), error: '' });
  }
  async function submit() {
    const text = assistantMessageText(draft, files.length > 0);
    if (busy || !text) return;
    setError('');
    if (await onSend(text, files)) {
      setDraftState({ text: '', files: [], error: '' });
    }
  }
  return { draft, setDraft, files, fileInput, error, addFiles, removeFile, submit };
}
