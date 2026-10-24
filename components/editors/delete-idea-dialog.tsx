'use client';

import { deleteIdea } from './editors.helpers.ts';
import type { DeleteIdeaDialogProps } from './editors.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import Modal from './modal';

export default function DeleteIdeaDialog({ item, onCancel, close }: DeleteIdeaDialogProps) {
  const { update, notify } = useWorkspace();
  return (
    <Modal
      title="Delete this idea?"
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Keep idea</Button>
          <Button
            className="danger"
            onClick={() => {
              update(s => deleteIdea(s, item.id));
              close();
              notify('Idea deleted.');
            }}
          >
            Delete idea
          </Button>
        </>
      }
    >
      <p>{item.title} and its storyboard, tasks, and schedules will be removed.</p>
    </Modal>
  );
}
