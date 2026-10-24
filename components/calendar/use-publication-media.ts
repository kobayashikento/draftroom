'use client';

import { useState } from 'react';
import type { Item, Publication } from '../../lib/types.ts';
import { useMedia } from '../media/media-context';
import { assessPublicationMedia } from '../media/publication-media.helpers.ts';

export default function usePublicationMedia(item: Item, publication: Publication) {
  const library = useMedia();
  const [previewOpen, setPreviewOpen] = useState(false);
  return {
    ...assessPublicationMedia(item, publication, library.media),
    previewOpen,
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false)
  };
}
