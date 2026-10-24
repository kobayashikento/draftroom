'use client';

import Artwork from '../workspace/artwork';
import MediaArtwork from '../media/media-artwork';
import type { PublicationArtworkProps } from '../media/publication-media.helpers.ts';

export default function PublicationArtwork({ item, record }: PublicationArtworkProps) {
  return record ? (
    <MediaArtwork key={record.id} record={record} />
  ) : (
    <div className="publication-draft-art">
      <Artwork item={item} />
      <span>Draft cover</span>
    </div>
  );
}
