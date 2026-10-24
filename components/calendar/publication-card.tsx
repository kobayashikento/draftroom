'use client';

import { completedTaskCount } from '../production/production.helpers.ts';
import type { PublicationCardsProps, PublicationCardProps } from './calendar.helpers.ts';
import {
  CalendarArrowUp,
  Check,
  GripVertical,
  Image,
  Images,
  Film,
  TriangleAlert,
  Play
} from 'lucide-react';
import { AppIcon, PlatformIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import StagePill from '../workspace/stage-pill';
import PublicationArtwork from './publication-artwork';
import usePublicationMedia from './use-publication-media.ts';
import MediaDetail from '../media/media-detail';

export function PublicationCards({ entries, compact = false, drag }: PublicationCardsProps) {
  return entries.map(({ p, pub }) => (
    <PublicationCard key={pub.id} p={p} pub={pub} compact={compact} drag={drag} />
  ));
}

export default function PublicationCard({ p, pub, compact, drag }: PublicationCardProps) {
  const { open, setModal } = useWorkspace();
  const media = usePublicationMedia(p, pub);
  const posted = pub.state === 'manually_posted';
  return (
    <article
      className={`planner-card ${compact ? 'is-compact' : ''} ${posted ? 'is-posted' : ''}`}
      draggable={false}
      data-movable={Boolean(drag && !posted)}
      {...(!posted
        ? drag?.handlers({ type: 'publication', itemId: p.id, publicationId: pub.id })
        : {})}
    >
      <Button
        className="planner-card-open"
        draggable={false}
        aria-label={`Edit ${p.title} for ${pub.platform}`}
        title={`${p.title}. ${media.label}. ${media.description} ${media.issues.join(' ')}`}
        aria-description={media.issues.length ? media.issues.join(' ') : media.description}
        onClick={() => open(p.id, 'Publish')}
      >
        <div className="planner-card-channel">
          <PlatformIcon platform={pub.platform} />
          <span>{pub.platform}</span>
          {posted ? (
            <AppIcon icon={Check} />
          ) : (
            drag && <AppIcon icon={GripVertical} className="planner-grip" />
          )}
        </div>
        <div className="planner-card-art" draggable={false}>
          <PublicationArtwork item={p} record={media.record} />
        </div>
        <div className="planner-card-copy">
          <h3>{p.title}</h3>
          <span className="planner-card-format">
            <AppIcon
              icon={media.format === 'Photo' ? Image : media.format === 'Carousel' ? Images : Film}
            />
            {media.format}
          </span>
          <StagePill item={p} />
          {media.issues.length > 0 && (
            <span className="publication-review" title={media.issues.join(' ')}>
              <AppIcon icon={TriangleAlert} />
              Check linked post
              <span className="sr-only">{media.issues.join(' ')}</span>
            </span>
          )}
        </div>
      </Button>
      <footer>
        <span title={media.description}>
          {posted || media.confirmed
            ? media.label
            : `${completedTaskCount(p)}/${p.tasks.length} tasks`}
        </span>
        {media.record && (
          <Button
            className="icon-button"
            aria-label={`Preview linked ${pub.platform} post for ${p.title}`}
            title="Preview linked media"
            onClick={media.openPreview}
          >
            <AppIcon icon={media.record.media_type === 'video' ? Play : Image} />
          </Button>
        )}
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
      {media.previewOpen && media.record && (
        <MediaDetail record={media.record} close={media.closePreview} readOnly />
      )}
    </article>
  );
}
