'use client';

import Artwork from '../workspace/artwork';
import MediaArtwork from './media-artwork';
import { useMedia } from './media-context';
import { assessPublicationMedia } from './publication-media.helpers.ts';
import type { ItemPostConnectionProps } from './publication-link.helpers.ts';

export default function ItemPostArtwork({ item }: ItemPostConnectionProps) {
  const library = useMedia();
  const match = item.publications
    .map(pub => assessPublicationMedia(item, pub, library.media))
    .find(assessment => assessment.confirmed);
  return match?.record ? <MediaArtwork record={match.record} /> : <Artwork item={item} />;
}
