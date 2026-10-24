'use client';

import { Clapperboard } from 'lucide-react';
import { AppIcon } from '../icons';
import type { MediaCoverProps } from './media.helpers.ts';
import { safeHttpsUrl } from '../../supabase/functions/_shared/media-helpers.ts';
import { useMediaThumbnail } from './use-media-display.ts';
import useMediaPlayer from './use-media-player.ts';

export default function MediaArtwork({ record }: MediaCoverProps) {
  const image = safeHttpsUrl(
    record.thumbnail_url || (record.media_type !== 'video' ? record.media_url : '')
  );
  const thumbnail = useMediaThumbnail(image);
  const player = useMediaPlayer(record);
  return (
    <div className="art publication-artwork" data-media-id={record.id}>
      {image && !thumbnail.failed ? (
        <img
          src={image}
          alt={`Linked ${record.platform || 'private clip'}: ${record.title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={thumbnail.onError}
        />
      ) : record.media_type === 'video' && player.direct && player.url && !player.error ? (
        <video
          src={`${player.url.split('#')[0]}#t=0.1`}
          aria-label={`Video still: ${record.title}`}
          muted
          playsInline
          preload="metadata"
          onError={player.videoFailed}
        />
      ) : (
        <div className="publication-artwork-empty">
          <AppIcon icon={Clapperboard} size="md" />
          <span>
            {thumbnail.failed || player.error ? 'Preview unavailable' : 'Open linked post'}
          </span>
        </div>
      )}
    </div>
  );
}
