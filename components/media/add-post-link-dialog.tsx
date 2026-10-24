'use client';

import { useId } from 'react';
import { Link2 } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Field, Input, Select } from '../ui';
import Modal from '../editors/modal';
import { useWorkspace } from '../workspace/workspace-context';
import usePostLinkImport from './use-post-link-import.ts';
import type { AddPostLinkDialogProps } from './media.helpers.ts';

export default function AddPostLinkDialog({ close, itemId = '', onAdded }: AddPostLinkDialogProps) {
  const { state } = useWorkspace();
  const id = useId();
  const formId = `${id}-post-link-form`;
  const {
    url,
    setUrl,
    title,
    setTitle,
    linkedItemId,
    setLinkedItemId,
    error,
    submitting,
    cancel,
    submit
  } = usePostLinkImport({ close, itemId, onAdded });
  return (
    <Modal
      compact
      title="Bring your published post home."
      eyebrow="ADD A POST LINK"
      onClose={cancel}
      footer={
        <>
          <Button onClick={cancel}>Cancel</Button>
          <Button className="primary" type="submit" form={formId} disabled={submitting}>
            <AppIcon icon={Link2} />
            {submitting ? 'Adding post…' : 'Add to library'}
          </Button>
        </>
      }
    >
      <form id={formId} className="media-import-form" onSubmit={submit}>
        <p className="text-sm text-muted">
          Once you’ve posted from your phone, paste the full Instagram or TikTok post URL here to
          watch it and connect it to an idea. Sync a connected account to fetch its available
          insights.
        </p>
        <Field label="Published post link">
          <Input
            autoFocus
            required
            type="url"
            placeholder="https://www.instagram.com/reel/…"
            value={url}
            maxLength={2000}
            disabled={submitting}
            onChange={event => setUrl(event.target.value)}
          />
        </Field>
        <Field label="Working title (optional)">
          <Input
            value={title}
            maxLength={240}
            disabled={submitting}
            placeholder="Something worth another look…"
            onChange={event => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Connect to an idea (optional)">
          <Select
            value={linkedItemId}
            disabled={submitting}
            options={[['', 'No idea linked'], ...state.items.map(item => [item.id, item.title])]}
            onChange={setLinkedItemId}
          />
        </Field>
        {error && (
          <p className="warning" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
