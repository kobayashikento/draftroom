'use client';

import Modal from '../editors/modal';
import { Button } from '../ui';
import type { AssistantActionReviewModalProps } from './assistant-actions.helpers.ts';

export default function AssistantActionReviewModal({
  review,
  busy,
  onConfirm,
  onCancel,
  onClose
}: AssistantActionReviewModalProps) {
  return (
    <Modal
      title="Review these changes"
      onClose={() => {
        if (!busy) onClose();
      }}
      compact
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            Cancel changes
          </Button>
          <Button className="danger" onClick={onConfirm} disabled={busy || Boolean(review.error)}>
            {busy ? 'Applying changes…' : 'Apply changes'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <span className="text-sm text-muted">{review.description}</span>
        <div
          className="flex max-h-80 flex-col gap-3 overflow-y-auto"
          role="list"
          aria-label="Proposed changes"
        >
          {review.labels.map((label, index) => (
            <div
              key={index}
              role="listitem"
              className="assistant-proposal-row rounded-lg p-3 text-sm"
            >
              {label}
            </div>
          ))}
        </div>
        {review.error && (
          <span role="alert" className="text-sm">
            {review.error} Nothing has been removed. Ask for an updated plan.
          </span>
        )}
      </div>
    </Modal>
  );
}
