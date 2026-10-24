'use client';
import type { Item, Format } from '../../lib/types.ts';
type ContentFieldsProps = { item: Item };

import { Input, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function ContentFields({ item }: ContentFieldsProps) {
  const { state, updateItem } = useWorkspace();
  const set = <K extends keyof Item>(key: K, value: Item[K]) => updateItem(item.id, (p) => (p[key] = value));
  return (
    <div className="fields">
      <Field label="Working title" wide>
        <Input value={item.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Format">
        <Select
          options={['Reel', 'Carousel']}
          value={item.format}
          onChange={(v) => set('format', v as Format)}
        />
      </Field>
      <Field label="Workflow stage">
        <Select
          options={state.stages.map((s) => [s.id, s.name])}
          value={item.stageId}
          onChange={(v) => set('stageId', v)}
        />
      </Field>
      <Field label="Series">
        <Select
          options={[['', 'No series'], ...state.series.map((s) => [s.id, s.name])]}
          value={item.seriesId}
          onChange={(v) =>
            updateItem(item.id, (p) => {
              p.seriesId = v;
              p.cadence = state.series.find((s) => s.id === v)?.cadence || p.cadence;
            })
          }
        />
      </Field>
      <Field label="Cadence">
        <Input
          placeholder="Your own rhythm"
          value={item.cadence}
          onChange={(e) => set('cadence', e.target.value)}
        />
      </Field>
      <Field label="Cover hook" wide>
        <Input
          placeholder="The first thing your audience sees…"
          value={item.hook}
          onChange={(e) => set('hook', e.target.value)}
        />
      </Field>
    </div>
  );
}
