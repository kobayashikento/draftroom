'use client';
import type { Item } from '../../lib/types.ts';
import { useState } from 'react';
import { Input, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import StagePill from '../workspace/stage-pill';
import ContentCard from '../workspace/content-card';
import { today } from '../../lib/display.ts';
import { addDays, monday } from '../../lib/model';

export default function Ideas() {
  const { state, updateItem, setModal, open } = useWorkspace();
  const [mode, setMode] = useState('Board'),
    [query, setQuery] = useState(''),
    [stage, setStage] = useState(''),
    [format, setFormat] = useState(''),
    [series, setSeries] = useState(''),
    [platform, setPlatform] = useState(''),
    [dateFilter, setDateFilter] = useState('');
  const items = state.items.filter(
    (p) =>
      (p.title + ' ' + p.tags).toLowerCase().includes(query.toLowerCase()) &&
      (!stage || p.stageId === stage) &&
      (!format || p.format === format) &&
      (!series || p.seriesId === series) &&
      (!platform || p.publications.some((x) => x.platform === platform && x.date)) &&
      (!dateFilter ||
        (dateFilter === 'unscheduled'
          ? !p.publications.some((x) => x.date)
          : p.publications.some(
              (x) => x.date >= monday(today()) && x.date <= addDays(monday(today()), 6),
            ))),
  );
  const stageSelect = (p: Item) => (
    <Select
      aria-label={`Stage for ${p.title}`}
      className="mt-2 w-full"
      options={state.stages.map((s) => [s.id, s.name])}
      value={p.stageId}
      onChange={(v) => updateItem(p.id, (item) => (item.stageId = v))}
    />
  );
  return (
    <>
      <div className="toolbar">
        <Input
          aria-label="Search ideas"
          placeholder="Search your ideas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label="Filter stage"
          options={[['', 'All stages'], ...state.stages.map((s) => [s.id, s.name])]}
          value={stage}
          onChange={setStage}
        />
        <Select
          aria-label="Filter format"
          options={[['', 'All formats'], 'Reel', 'Carousel']}
          value={format}
          onChange={setFormat}
        />
        <Select
          aria-label="Filter series"
          options={[['', 'All series'], ...state.series.map((s) => [s.id, s.name])]}
          value={series}
          onChange={setSeries}
        />
        <Select
          aria-label="Filter platform"
          options={[['', 'All platforms'], 'Instagram', 'TikTok']}
          value={platform}
          onChange={setPlatform}
        />
        <Select
          aria-label="Filter dates"
          options={[
            ['', 'All dates'],
            ['unscheduled', 'Unscheduled'],
            ['week', 'This week'],
          ]}
          value={dateFilter}
          onChange={setDateFilter}
        />
        <div className="segmented">
          {['Board', 'List'].map((x) => (
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
          {state.stages.map((s) => (
            <section className="column" key={s.id}>
              <h3>
                {s.name}{' '}
                <span className="muted tiny">{items.filter((p) => p.stageId === s.id).length}</span>
              </h3>
              {items
                .filter((p) => p.stageId === s.id)
                .map((p) => (
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
            items.map((p) => (
              <div key={p.id} className="list-item">
                <Button className="link grow" onClick={() => open(p.id)}>
                  {p.title}
                </Button>
                <span>{p.format}</span>
                <span>{state.series.find((s) => s.id === p.seriesId)?.name || 'No series'}</span>
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
