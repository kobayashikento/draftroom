'use client';

import { Check, Link2 } from 'lucide-react';
import { Badge, Button } from '../ui';
import { AppIcon, PlatformIcon } from '../icons';
import { useMedia } from './media-context';
import { useWorkspace } from '../workspace/workspace-context';
import type { ItemPostConnectionProps } from './publication-link.helpers.ts';
import { liveItemPublications } from './publication-link.helpers.ts';

export function LivePostBadges({ item }: ItemPostConnectionProps) {
  const library = useMedia();
  const publications = liveItemPublications(item, library.media);
  if (!publications.length) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {publications.map(publication => (
        <Badge
          key={publication.id}
          className="pill inline-flex items-center gap-1"
          title="Published post confirmed at the last account sync"
        >
          <PlatformIcon platform={publication.platform} />
          Live on {publication.platform}
          <AppIcon icon={Check} />
        </Badge>
      ))}
    </span>
  );
}

export default function ItemPostConnection({ item, onLink }: ItemPostConnectionProps) {
  const { open } = useWorkspace();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LivePostBadges item={item} />
      <Button className="small" onClick={onLink || (() => open(item.id, 'Publish'))}>
        <AppIcon icon={Link2} /> Link published post
      </Button>
    </div>
  );
}
