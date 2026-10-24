'use client';
import type { EditorTab, AssistantMessage } from '../../lib/types.ts';
import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { CheckCheck, ArrowUpRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import { assistantMarkdown } from '../../lib/assistant-markdown.ts';

type AssistantMessagesProps = {
  messages: AssistantMessage[];
  busy: boolean;
  onOpen: (id: string, tab?: EditorTab) => void;
};

export default function AssistantMessages({ messages, busy, onOpen }: AssistantMessagesProps) {
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (end.current?.getClientRects().length)
      end.current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [messages.length, busy]);
  return (
    <div
      role="log"
      aria-label="Conversation with Draftroom"
      aria-live="polite"
      aria-relevant="additions"
      className="assistant-messages"
    >
      {messages.map((message) => (
        <article key={message.id} className={`assistant-message is-${message.role}`}>
          <p className="text-xs font-medium text-muted">
            {message.role === 'user' ? 'You' : 'Draftroom'}
          </p>
          {message.role === 'user' ? (
            <p className="assistant-message-text">{message.text}</p>
          ) : (
            <div className="assistant-markdown">
              <Markdown {...assistantMarkdown}>{message.text}</Markdown>
            </div>
          )}
          {message.receipts && message.receipts.length > 0 && (
            <div className="assistant-receipts">
              {message.receipts.map((receipt, index) => (
                <Button key={index} onClick={() => onOpen(receipt.itemId, 'Production')}>
                  <AppIcon icon={CheckCheck} />
                  <span>{receipt.label}</span>
                  <AppIcon icon={ArrowUpRight} />
                </Button>
              ))}
            </div>
          )}
        </article>
      ))}
      {busy && (
        <p role="status" className="assistant-thinking text-sm text-muted">
          Thinking through your next step<span aria-hidden="true">…</span>
        </p>
      )}
      <div ref={end} />
    </div>
  );
}
