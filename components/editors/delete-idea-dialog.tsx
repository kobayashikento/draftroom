'use client';
import type { Item } from '../../lib/types.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import Modal from './modal';

type DeleteIdeaDialogProps = { item: Item; onCancel: () => void; close: () => void };

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
              update((s) => (s.items = s.items.filter((p) => p.id !== item.id)));
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
