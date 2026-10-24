'use client';

import { useMemo, useState } from 'react';
import { useMedia } from './media-context';
import { useWorkspace } from '../workspace/workspace-context';
import { assessPublicationMedia } from './publication-media.helpers.ts';
import {
  filterPublishedPostCandidates,
  publishedPostCandidates
} from './publication-link.helpers.ts';
import type { PublicationPostLinkProps } from './publication-link.helpers.ts';

export default function usePublicationPostLinker({ item, publication }: PublicationPostLinkProps) {
  const library = useMedia();
  const { state, setModal } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const assessment = assessPublicationMedia(item, publication, library.media);
  const selectedId = selected || publication.linkedPost?.mediaId || assessment.record?.id || '';
  const allCandidates = useMemo(
    () => publishedPostCandidates(state, library.media, item, publication),
    [state, library.media, item, publication]
  );
  const candidates = filterPublishedPostCandidates(allCandidates, query);
  const account = library.accounts.find(account => account.platform === publication.platform);
  const busy = Boolean(library.busy);
  async function link() {
    setError('');
    try {
      await library.linkPublication({
        itemId: item.id,
        publicationId: publication.id,
        mediaId: selectedId
      });
      setExpanded(false);
      setSelected('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'This post could not be matched.');
    }
  }
  async function unlink() {
    setError('');
    try {
      await library.unlinkPublication(item.id, publication.id);
      setSelected('');
      setExpanded(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'This match could not be removed.');
    }
  }
  async function sync() {
    setError('');
    try {
      await library.sync(publication.platform);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Posts could not be refreshed.');
    }
  }
  function openLibrary() {
    setModal(null);
    library.openLibrary();
  }
  return {
    library,
    expanded,
    setExpanded,
    query,
    setQuery,
    selectedId,
    setSelected,
    error,
    candidates,
    assessment,
    busy,
    account,
    link,
    unlink,
    sync,
    openLibrary
  };
}
