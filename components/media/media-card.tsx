'use client';

import { Clapperboard, Eye, Film, Heart, Play } from 'lucide-react';
import { AppIcon, PlatformIcon } from '../icons';
import { Button } from '../ui';
import type { MediaCardProps, MediaCoverProps } from './media.helpers.ts';
import { durationLabel, formatMetric, mediaDate } from './media.helpers.ts';
import { useMediaThumbnail } from './use-media-display.ts';

export function MediaCover({ record }: MediaCoverProps) {
  const { failed, onError } = useMediaThumbnail(record.thumbnail_url);
  return (
    <div className={`media-cover media-cover-${record.platform?.toLowerCase() || 'upload'}`}>
      {record.thumbnail_url && !failed ? (
        <img
          src={record.thumbnail_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={onError}
        />
      ) : (
        <div className="media-cover-art" aria-hidden="true">
          <span className="media-art-orbit" />
          <AppIcon icon={record.source === 'upload' ? Film : Clapperboard} size="lg" />
          <span className="media-art-caption">
            {record.source === 'upload' ? 'made by you' : 'a little moment'}
          </span>
        </div>
      )}
      <span className="media-play">
        <AppIcon icon={Play} size="md" />
      </span>
      {record.duration !== null && (
        <span className="media-duration">{durationLabel(record.duration)}</span>
      )}
      <span className="media-source-tag">
        {record.platform ? <PlatformIcon platform={record.platform} /> : <AppIcon icon={Film} />}{' '}
        {record.platform || 'Your clip'}
      </span>
    </div>
  );
}

export default function MediaCard({ record, onOpen }: MediaCardProps) {
  return (
    <article className="media-card">
      <Button className="media-card-open" onClick={onOpen} aria-label={`Watch ${record.title}`}>
        <MediaCover record={record} />
        <div className="media-card-copy">
          <p className="text-xs text-muted">
            {record.source === 'upload'
              ? 'PRIVATE CLIP'
              : record.source === 'api'
                ? 'CONNECTED POST'
                : 'SAVED POST LINK'}
          </p>
          <h3 className="text-base">{record.title}</h3>
          <p className="text-xs text-muted">
            {record.published_at
              ? mediaDate(record.published_at)
              : record.source === 'upload'
                ? `Added ${mediaDate(record.created_at)}`
                : 'Ready to watch'}
          </p>
        </div>
      </Button>
      <div className="media-card-stats">
        <span title="Lifetime views">
          <AppIcon icon={Eye} />
          {formatMetric(record.metrics.views)}
          <span className="sr-only"> views</span>
        </span>
        <span title="Likes">
          <AppIcon icon={Heart} />
          {formatMetric(record.metrics.likes)}
          <span className="sr-only"> likes</span>
        </span>
        <span className="media-card-state">
          {record.linked_item_id
            ? 'Idea linked'
            : record.source === 'api'
              ? 'Insights synced'
              : 'Preview available'}
        </span>
      </div>
    </article>
  );
}
