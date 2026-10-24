'use client';

import { Play, X, TriangleAlert, Image } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import type { PublicationPreviewProps } from './media.helpers.ts';
import { usePublicationPreview } from './use-media-display.ts';
import MediaPlayer from './media-player';
import { freshnessLabel } from './media.helpers.ts';

export default function PublicationPreview({ item, publication }: PublicationPreviewProps) {
  const { record, expanded, toggle, label, description, issues, actualDate } =
    usePublicationPreview({ item, publication });
  if (!record && !issues.length && publication.state !== 'manually_posted') return null;
  return (
    <div className="publication-video-preview">
      <div className="publication-media-check">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted">{description}</p>
        {issues.length > 0 && (
          <div className="publication-media-issues" role="status">
            <p>
              <AppIcon icon={TriangleAlert} /> Check linked post
            </p>
            <ul>
              {issues.map(issue => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        {record?.source === 'api' && (
          <details>
            <summary>Synced post details</summary>
            <p className="text-xs mt-2">Published: {actualDate || 'Unavailable'}</p>
            <p className="text-xs text-muted mt-2">
              {freshnessLabel(record.metrics_updated_at || record.updated_at)}. Sync the account to
              refresh cached post details.
            </p>
            <p className="text-sm mt-2 whitespace-pre-wrap">
              {record.caption || 'No caption supplied by the platform.'}
            </p>
          </details>
        )}
      </div>
      {record && (
        <Button className="small" aria-expanded={expanded} onClick={toggle}>
          <AppIcon icon={expanded ? X : record.media_type === 'video' ? Play : Image} />
          {expanded
            ? 'Close preview'
            : record.media_type === 'video'
              ? 'Watch in Draftroom'
              : 'View in Draftroom'}
        </Button>
      )}
      {expanded && record && <MediaPlayer record={record} />}
    </div>
  );
}
