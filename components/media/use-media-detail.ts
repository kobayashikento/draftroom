'use client';

import { useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { useMedia } from './media-context';
import type { MediaDetailProps } from './media.helpers.ts';

export default function useMediaDetail({ record, close }: MediaDetailProps) {
  const library = useMedia();
  const { state, open } = useWorkspace();
  const [error, setError] = useState('');
  const idea =
    state.items.find(item =>
      item.publications.some(pub => pub.linkedPost?.mediaId === record.id)
    ) || state.items.find(item => item.id === record.linked_item_id);
  const publication = idea?.publications.find(pub => pub.platform === record.platform);
  const publicationMatched = publication?.linkedPost?.mediaId === record.id;
  const account = library.accounts.find(account => account.platform === record.platform);
  async function archive() {
    try {
      await library.updateMedia(record, record.linked_item_id, !record.archived_at);
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'This change could not be saved.');
    }
  }
  function linkIdea(value: string) {
    setError('');
    void library
      .updateMedia(record, value, Boolean(record.archived_at))
      .catch(error =>
        setError(error instanceof Error ? error.message : 'The idea could not be linked.')
      );
  }
  function openIdea() {
    if (!idea) return;
    close();
    open(idea.id, 'Production');
  }
  async function markLive() {
    if (!idea || !publication) return;
    setError('');
    try {
      await library.linkPublication({
        itemId: idea.id,
        publicationId: publication.id,
        mediaId: record.id
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The post could not be matched.');
    }
  }
  async function removeMatch() {
    if (!idea || !publication) return;
    setError('');
    try {
      await library.unlinkPublication(idea.id, publication.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The match could not be removed.');
    }
  }
  return {
    library,
    state,
    error,
    idea,
    account,
    archive,
    linkIdea,
    openIdea,
    publication,
    publicationMatched,
    markLive,
    removeMatch
  };
}
