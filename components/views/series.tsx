'use client';

import {
  createSeriesEpisode,
  seriesCollections,
  seriesEpisodeDate
} from './series/series.helpers.ts';
import type { Series as ContentSeries } from '../../lib/types.ts';
import { Plus } from 'lucide-react';
import { AppIcon, SeriesIcon, FormatIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import StagePill from '../workspace/stage-pill';
import CoverIllustration from '../workspace/cover-illustration';
import Artwork from '../workspace/artwork';
import { coverSubject } from '../workspace/artwork.helpers.ts';

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
            <div className="series-cover" data-subject={coverSubject(s.id, s.name)}>
              <CoverIllustration subject={coverSubject(s.id, s.name)} />
              <div className="series-icon">
                <SeriesIcon series={s} />
              </div>
              <span className="series-cover-count">
                {related.length} {related.length === 1 ? 'idea' : 'ideas'}
              </span>
            </div>
            <div className="row justify-between">
              <h2>{s.name}</h2>
              <Button className="small" onClick={() => setModal({ type: 'series', id: s.id })}>
                Edit template
              </Button>
            </div>
            <p className="subtitle my-3">{s.description}</p>
            <div className="meta flex items-center gap-2">
              <FormatIcon format={s.format} />
              {s.format} · {s.cadence}
            </div>
            {related.map(p => (
              <div key={p.id} className="record-row series-episode px-0 py-3">
                <div className="list-art">
                  <Artwork item={p} />
                </div>
                <div className="series-episode-copy">
                  <Button className="link" onClick={() => open(p.id)}>
                    {p.title}
                  </Button>
                  <span className="tiny muted">
                    {p.format} · {seriesEpisodeDate(p)}
                  </span>
                </div>
                <StagePill item={p} />
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
