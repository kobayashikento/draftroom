'use client';

import type { DayTaskEditorProps } from './day-task.helpers.ts';
import { Check, Trash2 } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Field, Input, Select } from '../ui';
import Modal from '../editors/modal';
import { fmt } from '../../lib/display.ts';
import useDayTaskEditor from './use-day-task-editor.ts';

export default function DayTaskEditor(props: DayTaskEditorProps) {
  const editor = useDayTaskEditor(props);
  const { draft } = editor;
  return (
    <Modal
      title={props.id ? 'Edit day task' : 'Make room for the work.'}
      compact
      eyebrow="YOUR DAY"
      onClose={props.onClose}
      footer={
        <>
          {props.id && (
            <Button className="small" onClick={editor.remove}>
              <AppIcon icon={Trash2} />
              {draft.repeat === 'weekly' ? 'Delete weekly task' : 'Delete task'}
            </Button>
          )}
          <Button type="submit" form="day-task" className="primary">
            <AppIcon icon={Check} />
            {props.id ? 'Save task' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="day-task" className="grid gap-4" onSubmit={editor.submit}>
        <p className="text-sm text-muted">
          A task for your day, alongside your content ideas. Try planning, batch filming, or editing
          and prep.
        </p>
        <Field label="What are you working on?">
          <Input
            autoFocus
            required
            maxLength={240}
            placeholder="Batch filming"
            value={draft.title}
            onChange={event => editor.setField('title', event.target.value)}
          />
        </Field>
        <Field label={draft.repeat === 'weekly' ? 'Starts on' : 'Day'}>
          <Input
            type="date"
            required
            value={draft.date}
            onInput={event => editor.setField('date', event.currentTarget.value)}
            onChange={event => editor.setField('date', event.target.value)}
          />
        </Field>
        <Field label="Repeat">
          <Select
            value={draft.repeat}
            options={[
              ['none', 'Does not repeat'],
              ['weekly', 'Every week on this day']
            ]}
            onChange={value => {
              if (value === 'none' || value === 'weekly') editor.setField('repeat', value);
            }}
          />
        </Field>
        {draft.repeat === 'weekly' && draft.date && !editor.error && (
          <p className="text-xs text-muted">
            Repeats every {fmt(draft.date, { weekday: 'long' })}. Check off each week separately.
            {props.id
              ? ' Changes apply to the whole routine. Deleting removes it from every week.'
              : ''}
          </p>
        )}
        {editor.error && (
          <p className="warning text-sm" role="alert">
            {editor.error}
          </p>
        )}
      </form>
    </Modal>
  );
}
