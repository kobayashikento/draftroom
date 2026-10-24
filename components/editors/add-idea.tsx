'use client';
import type { Format } from '../../lib/types.ts';
import type { FormEvent } from 'react';
import type { AddIdeaModal } from '../../lib/types.ts';
type AddIdeaProps = { modal: AddIdeaModal; close: () => void };

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Button, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { fmt } from '../../lib/display.ts';
import { createItem } from '../../lib/model';
import Modal from './modal';

export default function AddIdea({ modal, close }: AddIdeaProps) {
  const { state, update, open, notify } = useWorkspace();
  const [title, setTitle] = useState(''),
    [seriesId, setSeriesId] = useState(modal.seriesId || ''),
    [format, setFormat] = useState(
      state.series.find((s) => s.id === modal.seriesId)?.format || 'Reel',
    );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    const p = createItem(state, { title: title.trim(), format, seriesId });
    if (modal.date) {
      const publication =
        p.publications.find((pub) => pub.platform === modal.platform) || p.publications[0];
      publication.date = modal.date;
    }
    update((s) => s.items.push(p));
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
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Format">
          <Select options={['Reel', 'Carousel']} value={format} onChange={(value) => setFormat(value as Format)} />
        </Field>
        <Field label="Series (optional)">
          <Select
            options={[['', 'No series'], ...state.series.map((s) => [s.id, s.name])]}
            value={seriesId}
            onChange={(v) => {
              setSeriesId(v);
              const s = state.series.find((x) => x.id === v);
              if (s) setFormat(s.format);
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
