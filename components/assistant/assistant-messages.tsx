'use client';

import type { AssistantMessagesProps } from './assistant.helpers.ts';
import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { CheckCheck, ArrowUpRight, ClipboardList } from 'lucide-react';
import NextLink from 'next/link';
import { Link } from '@chakra-ui/react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import { assistantLinkedMarkdown } from './assistant-links.helpers.ts';
import useAssistantLinks from './use-assistant-links.ts';
import AssistantReferenceLink from './assistant-reference-link';
import AssistantFileList from './assistant-file-list';

export default function AssistantMessages({
  conversationId,
  messages,
  hidden,
  busy,
  activity,
  onOpen,
  onNavigate,
  onReview
}: AssistantMessagesProps) {
  const references = useAssistantLinks();
  const markdown = assistantLinkedMarkdown(references, ({ href, children }) => (
    <AssistantReferenceLink href={href} index={references} onNavigate={onNavigate}>
      {children}
    </AssistantReferenceLink>
  ));
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if ((messages.length || busy) && end.current?.getClientRects().length)
      end.current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [messages.length, busy, hidden, conversationId]);
  return (
    <div
      role="log"
      aria-label="Conversation with Draftroom"
      aria-live="polite"
      aria-relevant="additions"
      className="assistant-messages"
    >
      {messages.map(message => (
        <article key={message.id} className={`assistant-message is-${message.role}`}>
          <p className="text-xs font-medium text-muted">
            {message.role === 'user' ? 'You' : 'Draftroom'}
          </p>
          {message.role === 'user' ? (
            <p className="assistant-message-text">{message.text}</p>
          ) : (
            <div className="assistant-markdown">
              <Markdown {...markdown}>{message.text}</Markdown>
            </div>
          )}
          {message.attachments?.length ? <AssistantFileList files={message.attachments} /> : null}
          {message.proposal?.status === 'pending' && (
            <div className="assistant-proposal">
              <span className="text-sm text-muted">
                {message.proposal.labels.length} proposed changes · waiting for your review
              </span>
              <Button onClick={() => onReview(message.id)} disabled={busy}>
                <AppIcon icon={ClipboardList} />
                Review changes
              </Button>
            </div>
          )}
          {message.receipts && message.receipts.length > 0 && (
            <div className="assistant-receipts">
              {message.receipts.map((receipt, index) =>
                receipt.href ? (
                  <Link asChild key={index} className="assistant-action-receipt">
                    <NextLink href={receipt.href} scroll={false} prefetch={false}>
                      <AppIcon icon={CheckCheck} />
                      <span>{receipt.label}</span>
                      <AppIcon icon={ArrowUpRight} />
                    </NextLink>
                  </Link>
                ) : receipt.itemId ? (
                  <Button key={index} onClick={() => onOpen(receipt.itemId, 'Production')}>
                    <AppIcon icon={CheckCheck} />
                    <span>{receipt.label}</span>
                    <AppIcon icon={ArrowUpRight} />
                  </Button>
                ) : (
                  <div key={index} className="assistant-action-receipt">
                    <AppIcon icon={CheckCheck} />
                    <span>{receipt.label}</span>
                  </div>
                )
              )}
            </div>
          )}
        </article>
      ))}
      {busy && (
        <p role="status" className="assistant-thinking text-sm text-muted">
          {activity}
        </p>
      )}
      <div ref={end} />
    </div>
  );
}
