'use client';

import { shouldSubmitAssistantMessage, planningFileDetails } from './assistant.helpers.ts';
import type { AssistantComposerProps } from './assistant.helpers.ts';
import { ArrowUp, Paperclip } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Textarea } from '../ui';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS
} from '../../supabase/functions/_shared/assistant-attachments.ts';
import useAssistantComposer from './use-assistant-composer.ts';
import AssistantFileList from './assistant-file-list';

export default function AssistantComposer(props: AssistantComposerProps) {
  const { busy, uploading, inputRef, attachments, onCancelUpload } = props;
  const composer = useAssistantComposer(props);
  return (
    <form
      className="assistant-composer"
      onSubmit={event => {
        event.preventDefault();
        void composer.submit();
      }}
    >
      {composer.files.length > 0 && (
        <AssistantFileList
          files={composer.files.map(planningFileDetails)}
          onRemove={composer.removeFile}
          disabled={busy}
        />
      )}
      <div className="assistant-compose-field">
        <Textarea
          ref={inputRef}
          aria-label="Message Draftroom"
          placeholder="Ask about your plans, or attach a planning doc…"
          value={composer.draft}
          onChange={event => composer.setDraft(event.target.value)}
          disabled={busy}
          maxLength={4000}
          rows={2}
          onKeyDown={event => {
            if (shouldSubmitAssistantMessage(event)) {
              event.preventDefault();
              void composer.submit();
            }
          }}
        />
        <Button
          type="submit"
          className="primary icon-button assistant-send-button"
          aria-label="Send message"
          disabled={busy || (!composer.draft.trim() && !composer.files.length)}
        >
          <AppIcon icon={ArrowUp} size="md" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={composer.fileInput}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose planning files"
          disabled={busy}
          onChange={event => {
            composer.addFiles(Array.from(event.target.files || []));
            event.target.value = '';
          }}
        />
        <Button
          className="icon-button"
          aria-label="Attach images or PDFs"
          title="Attach images or PDFs"
          disabled={busy || attachments.length + composer.files.length >= MAX_ATTACHMENTS}
          onClick={() => composer.fileInput.current?.click()}
        >
          <AppIcon icon={Paperclip} />
        </Button>
        <p className="flex-1 text-xs text-muted">
          PDF 50 MB · JPG, PNG, WebP 20 MB
          <br />
          Up to 4 files, 50 MB total per chat
        </p>
        {uploading && <Button onClick={onCancelUpload}>Cancel upload</Button>}
      </div>
      {composer.error && (
        <p className="text-sm" role="alert">
          {composer.error}
        </p>
      )}
    </form>
  );
}
