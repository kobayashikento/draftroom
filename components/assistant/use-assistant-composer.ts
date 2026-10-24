'use client';

import { useRef, useState } from 'react';
import type { AssistantComposerProps } from './assistant.helpers.ts';
import {
  assistantErrorMessage,
  assistantMessageText,
  validatePlanningFiles
} from './assistant.helpers.ts';

export default function useAssistantComposer({
  busy,
  onSend,
  attachments
}: AssistantComposerProps) {
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  function addFiles(selected: File[]) {
    if (busy || !selected.length) return;
    try {
      const next = [...files, ...selected];
      validatePlanningFiles(next, attachments);
      setFiles(next);
      setError('');
    } catch (error) {
      setError(assistantErrorMessage(error));
    }
  }
  function removeFile(index: number) {
    if (busy) return;
    setFiles(files.filter((_, position) => position !== index));
    setError('');
  }
  async function submit() {
    const text = assistantMessageText(draft, files.length > 0);
    if (busy || !text) return;
    setError('');
    if (await onSend(text, files)) {
      setDraft('');
      setFiles([]);
    }
  }
  return { draft, setDraft, files, fileInput, error, addFiles, removeFile, submit };
}
