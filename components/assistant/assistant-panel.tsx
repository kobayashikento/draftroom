'use client';

import type { AssistantPanelProps } from './assistant.helpers.ts';
import { ArrowLeft, ChevronDown, MessagesSquare, MessageSquarePlus, Sparkles } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import AssistantWelcome from './assistant-welcome';
import AssistantMessages from './assistant-messages';
import AssistantComposer from './assistant-composer';
import AssistantFileList from './assistant-file-list';
import AssistantConversations from './assistant-conversations';
import useAssistantHistory from './use-assistant-history.ts';

export default function AssistantPanel({
  assistant,
  onClose,
  inputRef,
  hidden
}: AssistantPanelProps) {
  const history = useAssistantHistory({ assistant, inputRef });
  return (
    <section
      id="draftroom-assistant"
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      className="assistant-panel"
      hidden={hidden}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="assistant-header">
        {history.showHistory ? (
          <Button
            className="icon-button"
            aria-label="Back to conversation"
            onClick={history.returnToChat}
          >
            <AppIcon icon={ArrowLeft} />
          </Button>
        ) : (
          <span className="assistant-avatar">
            <AppIcon icon={Sparkles} size="md" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 id="assistant-title" className="font-sans text-base font-semibold">
            Draftroom assistant
          </h2>
          <p className="truncate text-xs text-muted">
            {history.showHistory
              ? 'Your conversations, kept together.'
              : assistant.conversations.find(
                  conversation => conversation.id === assistant.conversationId
                )?.title || 'New conversation'}
          </p>
        </div>
        <Button
          className="icon-button"
          aria-label="Show conversations"
          aria-pressed={history.showHistory}
          onClick={() => history.setShowHistory(!history.showHistory)}
          title="Show conversations"
        >
          <AppIcon icon={MessagesSquare} />
        </Button>
        <Button
          className="icon-button"
          aria-label="Start a new chat"
          title="Start a new chat; your previous conversations stay saved"
          disabled={assistant.busy}
          onClick={history.newChat}
        >
          <AppIcon icon={MessageSquarePlus} />
        </Button>
        <Button className="icon-button" aria-label="Minimize assistant" onClick={onClose}>
          <AppIcon icon={ChevronDown} />
        </Button>
      </header>
      <div className="assistant-body" hidden={history.showHistory}>
        {!assistant.messages.length && (
          <AssistantWelcome
            onSend={assistant.send}
            disabled={assistant.busy}
            showSuggestions={
              !assistant.conversations.some(conversation => conversation.messageCount > 0)
            }
          />
        )}
        {!assistant.messages.length &&
          assistant.conversations.some(conversation => conversation.messageCount > 0) && (
            <AssistantConversations
              conversations={assistant.conversations.filter(
                conversation => conversation.messageCount > 0
              )}
              selectedId={assistant.conversationId}
              disabled={assistant.busy}
              onSelect={history.selectChat}
            />
          )}
        <AssistantMessages
          conversationId={assistant.conversationId}
          messages={assistant.messages}
          hidden={hidden || history.showHistory}
          busy={assistant.busy}
          activity={assistant.activity}
          onOpen={assistant.open}
          onNavigate={onClose}
          onReview={assistant.reviewProposal}
        />
        {assistant.error && (
          <div className="assistant-error" role="alert">
            <p>{assistant.error}</p>
            {assistant.retry && <Button onClick={assistant.retry}>Try again</Button>}
          </div>
        )}
      </div>
      {history.showHistory && (
        <div className="assistant-body">
          <AssistantConversations
            conversations={assistant.conversations}
            selectedId={assistant.conversationId}
            disabled={assistant.busy}
            onSelect={history.selectChat}
            onNew={history.newChat}
          />
        </div>
      )}
      <footer className="assistant-footer" hidden={history.showHistory}>
        {assistant.attachments.length > 0 && (
          <details className="assistant-documents text-xs">
            <summary>
              {assistant.attachments.length} planning{' '}
              {assistant.attachments.length === 1 ? 'file' : 'files'} available in this chat
            </summary>
            <AssistantFileList files={assistant.attachments} />
          </details>
        )}
        <AssistantComposer
          conversationId={assistant.conversationId}
          busy={assistant.busy}
          uploading={assistant.uploading}
          attachments={assistant.attachments}
          onCancelUpload={assistant.cancelUpload}
          onSend={assistant.send}
          inputRef={inputRef}
        />
        <div className="assistant-footnote text-xs text-muted">
          <span>
            {assistant.cloud ? assistant.storageStatus : 'Connect your workspace to use Gemini'}
          </span>
          <details>
            <summary>About Gemini</summary>
            <p>
              Gemini receives your messages, attached files, planning metadata, conversation titles
              and creative details for ideas referenced in this conversation. Files stay in private
              storage with their conversation for follow-up questions. Synced post captions and
              measured results help Gemini compare performance and plan; social video files aren’t
              sent. Related notes, hooks, storyboard text and draft captions help it read and edit
              the work you ask about. Google may use free-tier content to improve its products. AI
              can make mistakes; review changes in your checklist.{' '}
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
