'use client';

import { completedTaskCount } from '../production/production.helpers.ts';
import type { PublicationCardsProps, PublicationCardProps } from './calendar.helpers.ts';
import { CalendarArrowUp, Check, GripVertical } from 'lucide-react';
import { AppIcon, PlatformIcon, FormatIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import StagePill from '../workspace/stage-pill';
import Artwork from '../workspace/artwork';

export function PublicationCards({
  entries,
  compact = false,
  canDrag = false,
  onDragStart,
  onDragEnd
}: PublicationCardsProps) {
  return entries.map(({ p, pub }) => (
    <PublicationCard
      key={pub.id}
      p={p}
      pub={pub}
      compact={compact}
      canDrag={canDrag}
      onDragStart={event => onDragStart?.(event, p, pub)}
      onDragEnd={onDragEnd}
    />
  ));
}

export default function PublicationCard({
  p,
  pub,
  compact,
  canDrag,
  onDragStart,
  onDragEnd
}: PublicationCardProps) {
  const { open, setModal } = useWorkspace();
  const posted = pub.state === 'manually_posted';
  return (
    <article
      className={`planner-card ${compact ? 'is-compact' : ''} ${posted ? 'is-posted' : ''}`}
      draggable={canDrag && !posted}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Button
        className="planner-card-open"
        aria-label={`Edit ${p.title} for ${pub.platform}`}
        title={p.title}
        onClick={() => open(p.id, 'Publish')}
      >
        <div className="planner-card-channel">
          <PlatformIcon platform={pub.platform} />
          <span>{pub.platform}</span>
          {posted ? (
            <AppIcon icon={Check} />
          ) : (
            canDrag && <AppIcon icon={GripVertical} className="planner-grip" />
          )}
        </div>
        <div className="planner-card-art">
          <Artwork item={p} />
        </div>
        <div className="planner-card-copy">
          <h3>{p.title}</h3>
          <span className="planner-card-format">
            <FormatIcon format={p.format} />
            {p.format}
          </span>
          <StagePill item={p} />
        </div>
      </Button>
      <footer>
        <span>
          {posted ? 'Manually posted' : `${completedTaskCount(p)}/${p.tasks.length} tasks`}
        </span>
        {!posted && (
          <Button
            className="icon-button"
            aria-label={`${pub.date ? 'Move' : 'Schedule'} ${p.title} for ${pub.platform}`}
            title="Choose a date"
            onClick={() => setModal({ type: 'reschedule', id: p.id, publicationId: pub.id })}
          >
            <AppIcon icon={CalendarArrowUp} />
          </Button>
        )}
      </footer>
    </article>
  );
}
