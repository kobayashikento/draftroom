'use client';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Input, Textarea, Button, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { uid } from '../../lib/model';
import Modal from './modal';

type SeriesEditorProps = { id?: string; close: () => void };

export default function SeriesEditor({ id, close }: SeriesEditorProps) {
  const { state, update, notify } = useWorkspace(),
    s = state.series.find((s) => s.id === id);
  const [form, setForm] = useState({
    name: s?.name || '',
    description: s?.description || '',
    format: s?.format || 'Reel',
    cadence: s?.cadence || 'Weekly',
    storyboard: (s?.storyboard || ['Opening hook', 'Main moment', 'Closing shot']).join('\n'),
    tasks: (s?.tasks || ['Plan shots', 'Film clips', 'Edit video', 'Write caption']).join('\n'),
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = {
      ...form,
      name: form.name.trim(),
      storyboard: form.storyboard.split('\n').filter((x) => x.trim()),
      tasks: form.tasks.split('\n').filter((x) => x.trim()),
    };
    if (!data.name) return;
    update((s) => {
      if (id)
        Object.assign(
          s.series.find((x) => x.id === id)!,
          data,
        );
      else s.series.push({ ...data, id: uid(), icon: 'sparkles' });
    });
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
          <Input
            autoFocus
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field label="Description" wide>
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Default format">
          <Select
            options={['Reel', 'Carousel']}
            value={form.format}
            onChange={(v) => set('format', v)}
          />
        </Field>
        <Field label="Cadence">
          <Input required value={form.cadence} onChange={(e) => set('cadence', e.target.value)} />
        </Field>
        <Field label="Storyboard template · one shot or slide per line" wide>
          <Textarea
            rows={6}
            value={form.storyboard}
            onChange={(e) => set('storyboard', e.target.value)}
          />
        </Field>
        <Field label="Checklist template · one task per line" wide>
          <Textarea rows={5} value={form.tasks} onChange={(e) => set('tasks', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
