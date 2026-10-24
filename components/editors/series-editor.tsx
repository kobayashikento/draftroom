'use client';

import { seriesForm, saveSeriesTemplate } from './series.helpers.ts';
import type { SeriesForm } from './series.helpers.ts';
import { isFormat } from './editors.helpers.ts';
import type { SeriesEditorProps } from './editors.helpers.ts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Input, Textarea, Button, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import Modal from './modal';

export default function SeriesEditor({ id, close }: SeriesEditorProps) {
  const { state, update, notify } = useWorkspace();
  const s = state.series.find(s => s.id === id);
  const [form, setForm] = useState(() => seriesForm(s));
  const set = <K extends keyof SeriesForm>(key: K, value: SeriesForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) return;
    update(draft => saveSeriesTemplate(draft, form, id));
    close();
    notify('Series template saved.');
  }
  return (
    <Modal
      title={id ? 'Shape your series.' : 'A new creative rhythm.'}
      onClose={close}
      footer={
        <>
          <span className="tiny muted">Templates apply to future episodes.</span>
          <Button type="submit" className="primary" form="series-form">
            Save series
          </Button>
        </>
      }
    >
      <form id="series-form" className="fields" onSubmit={submit}>
        <Field label="Series name" wide>
          <Input autoFocus required value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Description" wide>
          <Input value={form.description} onChange={e => set('description', e.target.value)} />
        </Field>
        <Field label="Default format">
          <Select
            options={['Reel', 'Carousel']}
            value={form.format}
            onChange={v => {
              if (isFormat(v)) set('format', v);
            }}
          />
        </Field>
        <Field label="Cadence">
          <Input required value={form.cadence} onChange={e => set('cadence', e.target.value)} />
        </Field>
        <Field label="Storyboard template · one shot or slide per line" wide>
          <Textarea
            rows={6}
            value={form.storyboard}
            onChange={e => set('storyboard', e.target.value)}
          />
        </Field>
        <Field label="Checklist template · one task per line" wide>
          <Textarea rows={5} value={form.tasks} onChange={e => set('tasks', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
