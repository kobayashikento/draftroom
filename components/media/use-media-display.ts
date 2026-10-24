'use client';

import { useEffect, useState } from 'react';
import { useMedia } from './media-context';
import type { PublicationPreviewProps } from './media.helpers.ts';
import { assessPublicationMedia } from './publication-media.helpers.ts';

export function useMediaThumbnail(url: string) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return { failed, onError: () => setFailed(true) };
}

export function useCallbackCopy(url: string) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  function copy() {
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setCopyError('');
      })
      .catch(() => setCopyError('Select and copy the address above.'));
  }
  return { copied, copyError, copy };
}

export function usePublicationPreview({ item, publication }: PublicationPreviewProps) {
  const library = useMedia();
  const [expanded, setExpanded] = useState(false);
  return {
    ...assessPublicationMedia(item, publication, library.media),
    expanded,
    toggle: () => setExpanded(value => !value)
  };
}
