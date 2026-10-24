'use client';

import { canReschedulePublication } from './publication.helpers.ts';
import type { RescheduleEditorProps } from './editors.helpers.ts';
import { useState } from 'react';
import { Input, Button, Field } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { reschedulePublication } from '../calendar/calendar.helpers.ts';
import Modal from './modal';

export default function RescheduleEditor({ item, publication, close }: RescheduleEditorProps) {
  const { updateItem, notify } = useWorkspace();
  const [date, setDate] = useState(publication.date);
  function save(nextDate: string) {
    if (!canReschedulePublication(publication, nextDate)) {
      notify('Choose a valid date for an unposted plan.');
      return;
    }
    updateItem(item.id, draft => reschedulePublication(draft, publication.id, nextDate));
    close();
    notify(nextDate ? 'Your plan has a new date.' : 'Plan moved to Unscheduled.');
  }
  return (
    <Modal
      compact
      title="Make a little room."
      eyebrow={`${publication.platform} · ${item.title}`}
      onClose={close}
      footer={
        <>
          <Button
            className="link"
            disabled={!publication.date || publication.state === 'manually_posted'}
            onClick={() => save('')}
          >
            Move to Unscheduled
          </Button>
          <Button
            className="primary"
            type="submit"
            form="reschedule-plan"
            disabled={!date || publication.state === 'manually_posted'}
          >
            Save date
          </Button>
        </>
      }
    >
      <form
        id="reschedule-plan"
        onSubmit={event => {
          event.preventDefault();
          if (date) save(date);
        }}
      >
        <Field label="Planned publication date">
          <Input
            autoFocus
            required
            type="date"
            max="9999-12-31"
            value={date}
            onInput={e => setDate(e.currentTarget.value)}
            onChange={e => setDate(e.target.value)}
          />
        </Field>
        <p className="footnote">
          This updates only the {publication.platform} plan. Your other channel dates and checklist
          stay as they are.
        </p>
      </form>
    </Modal>
  );
}
