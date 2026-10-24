'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useMedia } from './media-context';
import type { AddPostLinkDialogProps } from './media.helpers.ts';

export default function usePostLinkImport({ close, itemId = '', onAdded }: AddPostLinkDialogProps) {
  const library = useMedia();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [linkedItemId, setLinkedItemId] = useState(itemId);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function cancel() {
    active.current = false;
    close();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const id = await library.importLink(url, title, linkedItemId);
      if (active.current) {
        onAdded?.(id);
        close();
      }
    } catch (error) {
      if (active.current)
        setError(error instanceof Error ? error.message : 'Your post link could not be added.');
    } finally {
      if (active.current) setSubmitting(false);
    }
  }
  return {
    url,
    setUrl,
    title,
    setTitle,
    linkedItemId,
    setLinkedItemId,
    error,
    submitting,
    cancel,
    submit
  };
}
