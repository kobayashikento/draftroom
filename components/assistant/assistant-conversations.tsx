'use client';

import { MessageSquare, MessageSquarePlus, Check } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import type { AssistantConversationsProps } from './assistant.helpers.ts';
import { assistantConversationDate } from './assistant.helpers.ts';

export default function AssistantConversations({
  conversations,
  selectedId,
  disabled,
  onSelect,
  onNew
}: AssistantConversationsProps) {
  return (
    <section className="assistant-conversations" aria-label="Conversations">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-base font-semibold">Your conversations</h3>
        {onNew && (
          <Button onClick={onNew} disabled={disabled}>
            <AppIcon icon={MessageSquarePlus} />
            New chat
          </Button>
        )}
      </div>
      <p className="text-sm text-muted">Pick up where you left off.</p>
      <ul className="assistant-conversation-list">
        {conversations.map(conversation => (
          <li key={conversation.id}>
            <Button
              className="assistant-conversation"
              aria-current={conversation.id === selectedId ? 'true' : undefined}
              disabled={disabled}
              onClick={() => onSelect(conversation.id)}
            >
              <AppIcon icon={MessageSquare} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{conversation.title}</span>
                <span className="mt-1 block text-xs text-muted">
                  {conversation.messageCount
                    ? `${conversation.messageCount} messages`
                    : 'Ready for a fresh idea'}
                  {conversation.updatedAt &&
                    ` · ${assistantConversationDate(conversation.updatedAt)}`}
                </span>
              </span>
              {conversation.id === selectedId && <AppIcon icon={Check} />}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
