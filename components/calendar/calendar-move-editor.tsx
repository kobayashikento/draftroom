'use client';

import type { CalendarMoveEditorProps } from './calendar-move.helpers.ts';
import { Button, Field, Input } from '../ui';
import Modal from '../editors/modal';
import useCalendarMove from './use-calendar-move.ts';

export default function CalendarMoveEditor(props: CalendarMoveEditorProps) {
  const move = useCalendarMove(props);
  return (
    <Modal
      compact
      title="Choose a date"
      eyebrow={move.details?.title}
      onClose={props.onClose}
      footer={
        <Button
          type="submit"
          form="move-calendar-item"
          className="primary"
          disabled={!move.details || !move.date || move.date === move.details.date}
        >
          Move to this day
        </Button>
      }
    >
      <form id="move-calendar-item" className="grid gap-4" onSubmit={move.submit}>
        {move.details ? (
          <>
            <Field label="Move to">
              <Input
                type="date"
                required
                autoFocus
                max="9999-12-31"
                value={move.date}
                onInput={event => move.setDate(event.currentTarget.value)}
                onChange={event => move.setDate(event.target.value)}
              />
            </Field>
            <p className="text-sm text-muted">{move.details.description}</p>
          </>
        ) : (
          <p className="text-sm text-muted">This item has changed or can no longer be moved.</p>
        )}
        {move.error && (
          <p className="warning text-sm" role="alert">
            {move.error}
          </p>
        )}
      </form>
    </Modal>
  );
}
