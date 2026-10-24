'use client';
import type { RefObject } from 'react';
import type { AssistantController } from './use-assistant.ts';
import { ChevronDown, MessageSquarePlus, Sparkles } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import AssistantWelcome from './assistant-welcome';
import AssistantMessages from './assistant-messages';
import AssistantComposer from './assistant-composer';

type AssistantPanelProps = {
  assistant: AssistantController;
  onClose: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  hidden: boolean;
};

export default function AssistantPanel({
  assistant,
  onClose,
  inputRef,
  hidden,
}: AssistantPanelProps) {
  return (
    <section
      id="draftroom-assistant"
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      className="assistant-panel"
      hidden={hidden}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="assistant-header">
        <span className="assistant-avatar">
          <AppIcon icon={Sparkles} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="assistant-title" className="font-sans text-base font-semibold">
            Draftroom assistant
          </h2>
          <p className="text-xs text-muted">Your ideas, with a little momentum.</p>
        </div>
        <Button
          className="icon-button"
          aria-label="Start a new chat"
          title="Start a new chat; your tasks stay in place"
          disabled={assistant.busy}
          onClick={assistant.newChat}
        >
          <AppIcon icon={MessageSquarePlus} />
        </Button>
        <Button className="icon-button" aria-label="Minimize assistant" onClick={onClose}>
          <AppIcon icon={ChevronDown} />
        </Button>
      </header>
      <div className="assistant-body">
        {!assistant.messages.length && (
          <AssistantWelcome onSend={assistant.send} disabled={assistant.busy} />
        )}
        <AssistantMessages
          messages={assistant.messages}
          busy={assistant.busy}
          onOpen={assistant.open}
        />
        {assistant.error && (
          <div className="assistant-error" role="alert">
            <p>{assistant.error}</p>
            {assistant.retry && <Button onClick={assistant.retry}>Try again</Button>}
          </div>
        )}
      </div>
      <footer className="assistant-footer">
        <AssistantComposer busy={assistant.busy} onSend={assistant.send} inputRef={inputRef} />
        <div className="assistant-footnote text-xs text-muted">
          <span>
            {assistant.cloud ? assistant.storageStatus : 'Connect your workspace to use Gemini'}
          </span>
          <details>
            <summary>About Gemini</summary>
            <p>
              Gemini receives your messages and a summary of idea titles, tasks and dates. Notes and
              captions aren’t sent. Google may use free-tier content to improve its products. AI can
              make mistakes; review changes in your checklist.{' '}
              <a
                href="https://ai.google.dev/gemini-api/docs/pricing"
                target="_blank"
                rel="noreferrer"
              >
                Free tier details
              </a>
            </p>
          </details>
        </div>
      </footer>
    </section>
  );
}
