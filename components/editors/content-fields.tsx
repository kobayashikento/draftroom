'use client';

import { itemFieldSetter, assignItemSeries, isFormat } from './editors.helpers.ts';
import type { ContentFieldsProps } from './editors.helpers.ts';
import { Input, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function ContentFields({ item }: ContentFieldsProps) {
  const { state, updateItem } = useWorkspace();
  const set = itemFieldSetter(item.id, updateItem);
  return (
    <div className="fields">
      <Field label="Working title" wide>
        <Input value={item.title} onChange={e => set('title', e.target.value)} />
      </Field>
      <Field label="Format">
        <Select
          options={['Reel', 'Carousel']}
          value={item.format}
          onChange={v => {
            if (isFormat(v)) set('format', v);
          }}
        />
      </Field>
      <Field label="Workflow stage">
        <Select
          options={state.stages.map(s => [s.id, s.name])}
          value={item.stageId}
          onChange={v => set('stageId', v)}
        />
      </Field>
      <Field label="Series">
        <Select
          options={[['', 'No series'], ...state.series.map(s => [s.id, s.name])]}
          value={item.seriesId}
          onChange={v => updateItem(item.id, p => assignItemSeries(p, v, state))}
        />
      </Field>
      <Field label="Cadence">
        <Input
          placeholder="Your own rhythm"
          value={item.cadence}
          onChange={e => set('cadence', e.target.value)}
        />
      </Field>
      <Field label="Cover hook" wide>
        <Input
          placeholder="The first thing your audience sees…"
          value={item.hook}
          onChange={e => set('hook', e.target.value)}
        />
      </Field>
    </div>
  );
}
