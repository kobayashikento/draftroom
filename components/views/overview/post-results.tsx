'use client';
import type { Item, OverviewCategory } from '../../../lib/types.ts';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';
import { useWorkspace } from '../../workspace/workspace-context';
import Artwork from '../../workspace/artwork';
import StagePill from '../../workspace/stage-pill';
import { addDays } from '../../../lib/model';
import { fmt } from '../../../lib/display.ts';
import { overduePublications } from '../../../lib/overview.ts';

type PostResultsProps = {
  items: Item[];
  selected: OverviewCategory;
  week: string;
  currentDate: string;
};

export default function PostResults({ items, selected, week, currentDate }: PostResultsProps) {
  const { state, open } = useWorkspace();
  return (
    <div className="panel overview-post-list">
      {items.map((item) => {
        const series = state.series.find((series) => series.id === item.seriesId);
        const dates =
          selected === 'overdue'
            ? overduePublications(item, currentDate)
            : selected === 'planned'
              ? item.publications.filter(
                  (publication) =>
                    publication.state !== 'manually_posted' &&
                    publication.date &&
                    publication.date >= week &&
                    publication.date <= addDays(week, 6),
                )
              : [];
        return (
          <Button
            key={item.id}
            className="overview-post-row"
            aria-label={`Open ${item.title}`}
            onClick={() => open(item.id, selected === 'planned' ? 'Storyboard' : 'Publish')}
          >
            <span className="miniart">
              <Artwork item={item} />
            </span>
            <span className="overview-post-copy">
              <span className="overview-post-title">{item.title}</span>
              <span className="tiny muted">
                {item.format} · {series?.name || 'No series'}
              </span>
              {dates.length > 0 && (
                <span className="overview-post-dates">
                  {dates
                    .map((publication) => `${publication.platform} · ${fmt(publication.date)}`)
                    .join(' / ')}
                </span>
              )}
            </span>
            <StagePill item={item} />
            <AppIcon icon={ArrowRight} />
          </Button>
        );
      })}
    </div>
  );
}
