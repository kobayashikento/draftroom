'use client';

import { createSeriesEpisode, seriesCollections } from './series/series.helpers.ts';
import type { Series as ContentSeries } from '../../lib/types.ts';
import { Plus } from 'lucide-react';
import { AppIcon, SeriesIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import StagePill from '../workspace/stage-pill';

export default function Series() {
  const { state, update, setModal, open, notify } = useWorkspace();
  function episode(s: ContentSeries) {
    const p = createSeriesEpisode(state, s);
    update(d => d.items.push(p));
    open(p.id);
    notify('One fresh episode, ready for your ideas.');
  }
  return (
    <>
      <div className="toolbar">
        <Button onClick={() => setModal({ type: 'series' })}>
          <AppIcon icon={Plus} />
          New series
        </Button>
      </div>
      <div className="series-grid">
        {seriesCollections(state).map(({ series: s, items: related }) => (
          <section className="panel series-card" key={s.id}>
            <div className="series-icon">
              <SeriesIcon series={s} />
            </div>
            <div className="row justify-between">
              <h2>{s.name}</h2>
              <Button className="small" onClick={() => setModal({ type: 'series', id: s.id })}>
                Edit template
              </Button>
            </div>
            <p className="subtitle my-3">{s.description}</p>
            <div className="meta">
              {s.format} · {s.cadence} · {related.length} {related.length === 1 ? 'idea' : 'ideas'}
            </div>
            {related.map(p => (
              <div key={p.id} className="list-item px-0 py-3">
                <Button className="link grow" onClick={() => open(p.id)}>
                  {p.title}
                </Button>
                <span className="tiny">
                  {p.format} · {p.cadence || s.cadence}
                </span>
                <StagePill item={p} />
                <span className="tiny">
                  {p.publications.find(x => x.date)?.date || 'Unscheduled'}
                </span>
              </div>
            ))}
            <div className="row mt-6">
              <Button className="primary small" onClick={() => episode(s)}>
                <AppIcon icon={Plus} />
                Create next episode
              </Button>
              <Button className="small" onClick={() => setModal({ type: 'add', seriesId: s.id })}>
                Add idea to series
              </Button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
