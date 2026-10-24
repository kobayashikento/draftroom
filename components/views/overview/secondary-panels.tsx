'use client';

import type { SecondaryPanelsProps } from './overview.helpers.ts';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';
import { useWorkspace } from '../../workspace/workspace-context';
import Artwork from '../../workspace/artwork';
import TaskRow from '../../workspace/task-row';

export default function SecondaryPanels({ work, ready, navigate }: SecondaryPanelsProps) {
  const { state, open } = useWorkspace();
  return (
    <div className="lower">
      <section>
        <div className="section-head">
          <h2>A little work, a little progress</h2>
          <span>{work.length} tasks left</span>
        </div>
        <div className="panel">
          {work.length ? (
            work.slice(0, 4).map(({ p, t }) => <TaskRow key={t.id} item={p} task={t} />)
          ) : (
            <div className="empty">You’re all caught up.</div>
          )}
          <div className="mt-4">
            <Button className="link" onClick={() => navigate('Production')}>
              See your production list <AppIcon icon={ArrowRight} />
            </Button>
          </div>
        </div>
      </section>
      <section>
        <div className="section-head">
          <h2>Ready when you are</h2>
          <AppIcon icon={Sparkles} />
        </div>
        <div className="panel readybox">
          <p className="subtitle">The making is done. Your next post is waiting.</p>
          {ready.length ? (
            ready.map(p => (
              <div key={p.id}>
                <div className="ready-entry">
                  <div className="miniart">
                    <Artwork item={p} />
                  </div>
                  <div>
                    <h3>{p.title}</h3>
                    <span className="tiny muted">
                      {p.format} ·{' '}
                      {state.series.find(s => s.id === p.seriesId)?.name || 'No series'}
                    </span>
                  </div>
                </div>
                <Button className="small" onClick={() => open(p.id, 'Publish')}>
                  Review & publish <AppIcon icon={ArrowRight} />
                </Button>
              </div>
            ))
          ) : (
            <p className="subtitle mt-6">Move a finished idea to Ready to find it here.</p>
          )}
        </div>
        <p className="quote">
          Make a little space for your creativity. <AppIcon icon={Heart} />
        </p>
      </section>
    </div>
  );
}
