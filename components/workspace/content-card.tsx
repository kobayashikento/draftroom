'use client';
import type { Item } from '../../lib/types.ts';
import { PlatformIcon } from '../icons';
import { useWorkspace } from './workspace-context';
import { Button } from '../ui';
import StagePill from './stage-pill';
import Artwork from './artwork';
import { fmt } from '../../lib/display.ts';

type ContentCardProps = { item: Item };

export default function ContentCard({ item }: ContentCardProps) {
  const { state, open } = useWorkspace();
  const series = state.series.find((s) => s.id === item.seriesId);
  const dates = item.publications
    .filter((p) => p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <article className="card">
      <Button className="open-card" aria-label={`Open ${item.title}`} onClick={() => open(item.id)}>
        <Artwork item={item} />
        <div className="card-body">
          <div className="meta">{series?.name || 'A new little idea'}</div>
          <h3>{item.title}</h3>
          <StagePill item={item} />
          <div className="card-foot">
            <span className="card-progress">
              {dates.length ? (
                <span className="platform-icons">
                  {dates.map((pub) => (
                    <PlatformIcon key={pub.id} platform={pub.platform} labelled />
                  ))}
                </span>
              ) : (
                'Unscheduled'
              )}
              <span aria-hidden="true">·</span>
              <span>
                {item.tasks.filter((t) => t.done).length}/{item.tasks.length} tasks
              </span>
            </span>
            <span>{dates[0] ? fmt(dates[0].date) : 'No date yet'}</span>
          </div>
        </div>
      </Button>
    </article>
  );
}
