'use client';

import { ExternalLink, Film, RefreshCw } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import type { MediaPlayerProps } from './media.helpers.ts';
import useMediaPlayer from './use-media-player.ts';

export default function MediaPlayer({ record }: MediaPlayerProps) {
  const { url, error, direct, embed, attempt, retry, videoFailed, imageFailed } =
    useMediaPlayer(record);
  return (
    <div
      className={`media-player ${record.media_type === 'image' || record.media_type === 'carousel' ? 'media-player-image' : ''}`}
    >
      {error ? (
        <div className="media-player-message" role="status">
          <AppIcon icon={Film} size="lg" />
          <p>{error}</p>
          <Button onClick={retry}>
            <AppIcon icon={RefreshCw} />
            Try preview again
          </Button>
        </div>
      ) : direct ? (
        url ? (
          record.media_type === 'video' ? (
            <video
              key={`${record.id}-${attempt}`}
              src={url}
              controls
              playsInline
              preload="metadata"
              aria-label={record.title}
              onError={videoFailed}
            />
          ) : (
            <img src={url} alt={record.title} onError={imageFailed} />
          )
        ) : (
          <div className="media-player-message" role="status">
            Opening your clip…
          </div>
        )
      ) : embed ? (
        <iframe
          key={record.id}
          src={embed}
          title={`Watch ${record.title}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="media-player-message">
          <AppIcon icon={Film} size="lg" />
          <p>A preview isn’t available for this post.</p>
        </div>
      )}
      {record.permalink && (
        <a className="media-original-link" href={record.permalink} target="_blank" rel="noreferrer">
          <AppIcon icon={ExternalLink} />
          Open original on {record.platform}
        </a>
      )}
      {!direct && (
        <p className="media-embed-note text-xs">
          Platform previews may need cookies or permission from the creator. The original link is
          always available.
        </p>
      )}
    </div>
  );
}
