'use client';

import { contentCardDetails } from './workspace.helpers.ts';
import type { ContentCardProps } from './workspace.helpers.ts';
import { PlatformIcon } from '../icons';
import { useWorkspace } from './workspace-context';
import { Button } from '../ui';
import StagePill from './stage-pill';
import ItemPostArtwork from '../media/item-post-artwork';
import { fmt } from '../../lib/display.ts';
import { LivePostBadges } from '../media/item-post-connection';

export default function ContentCard({ item }: ContentCardProps) {
  const { state, open } = useWorkspace();
  const { series, dates, done } = contentCardDetails(state, item);
  return (
    <article className="card">
      <Button className="open-card" aria-label={`Open ${item.title}`} onClick={() => open(item.id)}>
        <ItemPostArtwork item={item} />
        <div className="card-body">
          <div className="meta">{series || 'A new little idea'}</div>
          <h3>{item.title}</h3>
          <StagePill item={item} />
          <LivePostBadges item={item} />
          <div className="card-foot">
            <span className="card-progress">
              {dates.length ? (
                <span className="platform-icons">
                  {dates.map(pub => (
                    <PlatformIcon key={pub.id} platform={pub.platform} labelled />
                  ))}
                </span>
              ) : (
                'Unscheduled'
              )}
              <span aria-hidden="true">·</span>
              <span>
                {done}/{item.tasks.length} tasks
              </span>
            </span>
            <span>{dates[0] ? fmt(dates[0].date) : 'No date yet'}</span>
          </div>
          <progress
            className="task-progress-bar"
            value={done}
            max={item.tasks.length || 1}
            aria-label={`Checklist progress for ${item.title}`}
          />
        </div>
      </Button>
    </article>
  );
}
