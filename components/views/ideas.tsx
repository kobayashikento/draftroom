'use client';

import { filterIdeas, ideaColumns, ideasModes } from './ideas/ideas.helpers.ts';
import type { IdeasMode } from './ideas/ideas.helpers.ts';
import useIdeaFilters from './ideas/use-idea-filters.ts';
import type { Item } from '../../lib/types.ts';
import { useState } from 'react';
import { Input, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import StagePill from '../workspace/stage-pill';
import ContentCard from '../workspace/content-card';
import { today } from '../../lib/display.ts';

export default function Ideas() {
  const { state, updateItem, setModal, open } = useWorkspace();
  const [mode, setMode] = useState<IdeasMode>('Board');
  const { values, setValue } = useIdeaFilters();
  const items = filterIdeas(state.items, values, today());
  const columns = ideaColumns(state, items);
  const stageSelect = (p: Item) => (
    <Select
      aria-label={`Stage for ${p.title}`}
      className="mt-2 w-full"
      options={state.stages.map(s => [s.id, s.name])}
      value={p.stageId}
      onChange={v => updateItem(p.id, item => (item.stageId = v))}
    />
  );
  return (
    <>
      <div className="toolbar">
        <Input
          aria-label="Search ideas"
          placeholder="Search your ideas…"
          value={values.query}
          onChange={e => setValue('query', e.target.value)}
        />
        <Select
          aria-label="Filter stage"
          options={[['', 'All stages'], ...state.stages.map(s => [s.id, s.name])]}
          value={values.stage}
          onChange={value => setValue('stage', value)}
        />
        <Select
          aria-label="Filter format"
          options={[['', 'All formats'], 'Reel', 'Carousel']}
          value={values.format}
          onChange={value => setValue('format', value)}
        />
        <Select
          aria-label="Filter series"
          options={[['', 'All series'], ...state.series.map(s => [s.id, s.name])]}
          value={values.series}
          onChange={value => setValue('series', value)}
        />
        <Select
          aria-label="Filter platform"
          options={[['', 'All platforms'], 'Instagram', 'TikTok']}
          value={values.platform}
          onChange={value => setValue('platform', value)}
        />
        <Select
          aria-label="Filter dates"
          options={[
            ['', 'All dates'],
            ['unscheduled', 'Unscheduled'],
            ['week', 'This week']
          ]}
          value={values.date}
          onChange={value => setValue('date', value)}
        />
        <div className="segmented">
          {ideasModes.map(x => (
            <Button key={x} className={mode === x ? 'active' : ''} onClick={() => setMode(x)}>
              {x}
            </Button>
          ))}
        </div>
        <Button className="small" onClick={() => setModal({ type: 'stages' })}>
          Edit stages
        </Button>
      </div>
      {mode === 'Board' ? (
        <div className="board">
          {columns.map(({ stage: s, items: columnItems }) => (
            <section className="column" key={s.id}>
              <h3>
                {s.name} <span className="muted tiny">{columnItems.length}</span>
              </h3>
              {columnItems.map(p => (
                <div key={p.id}>
                  <ContentCard item={p} />
                  {stageSelect(p)}
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="panel">
          {items.length ? (
            items.map(p => (
              <div key={p.id} className="list-item">
                <Button className="link grow" onClick={() => open(p.id)}>
                  {p.title}
                </Button>
                <span>{p.format}</span>
                <span>{state.series.find(s => s.id === p.seriesId)?.name || 'No series'}</span>
                <StagePill item={p} />
                <div>{stageSelect(p)}</div>
              </div>
            ))
          ) : (
            <div className="empty">No ideas match these filters.</div>
          )}
        </div>
      )}
    </>
  );
}
