'use client';

import { captureIdea, isFormat } from './editors.helpers.ts';
import type { AddIdeaProps } from './editors.helpers.ts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Button, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { fmt } from '../../lib/display.ts';
import Modal from './modal';

export default function AddIdea({ modal, close }: AddIdeaProps) {
  const { state, update, open, notify } = useWorkspace();
  const [title, setTitle] = useState('');
  const [seriesId, setSeriesId] = useState(modal.seriesId || '');
  const [format, setFormat] = useState(
    state.series.find(s => s.id === modal.seriesId)?.format || 'Reel'
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const p = captureIdea(state, { title, format, seriesId }, modal);
    if (!p) return;
    update(s => s.items.push(p));
    open(p.id, modal.date ? 'Publish' : 'Storyboard');
    notify('A new idea has a home.');
  }
  return (
    <Modal
      title="A spark of something good."
      onClose={close}
      footer={
        <>
          <span className="tiny muted">
            {modal.date
              ? `${modal.platform || 'Instagram'} · ${fmt(modal.date)}`
              : 'Start small. Add the details later.'}
          </span>
          <Button type="submit" form="new-idea" className="primary">
            Create idea <AppIcon icon={ArrowRight} />
          </Button>
        </>
      }
    >
      <form id="new-idea" onSubmit={submit} className="fields">
        <Field label="What’s your idea?" wide>
          <Input
            required
            autoFocus
            placeholder="A little idea goes a long way…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Format">
          <Select
            options={['Reel', 'Carousel']}
            value={format}
            onChange={value => {
              if (isFormat(value)) setFormat(value);
            }}
          />
        </Field>
        <Field label="Series (optional)">
          <Select
            options={[['', 'No series'], ...state.series.map(s => [s.id, s.name])]}
            value={seriesId}
            onChange={v => {
              setSeriesId(v);
              const s = state.series.find(x => x.id === v);
              if (s) setFormat(s.format);
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
