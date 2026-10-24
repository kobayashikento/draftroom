'use client';

import { shouldSubmitAssistantMessage } from './assistant.helpers.ts';
import type { AssistantComposerProps } from './assistant.helpers.ts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Textarea } from '../ui';

export default function AssistantComposer({ busy, onSend, inputRef }: AssistantComposerProps) {
  const [draft, setDraft] = useState('');
  function submit(event: FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    if (onSend(draft) !== false) setDraft('');
  }
  return (
    <form className="assistant-composer" onSubmit={submit}>
      <Textarea
        ref={inputRef}
        aria-label="Message Draftroom"
        placeholder="Plan something, or ask me to add a task…"
        value={draft}
        onChange={event => setDraft(event.target.value)}
        maxLength={4000}
        rows={2}
        onKeyDown={event => {
          if (shouldSubmitAssistantMessage(event)) submit(event);
        }}
      />
      <Button
        type="submit"
        className="primary icon-button"
        aria-label="Send message"
        disabled={busy || !draft.trim()}
      >
        <AppIcon icon={ArrowUp} size="md" />
      </Button>
    </form>
  );
}
