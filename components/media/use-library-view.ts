'use client';

import { useEffect, useRef, useState } from 'react';
import { useMedia } from './media-context';
import { useWorkspace } from '../workspace/workspace-context';
import type { MediaFilters } from './media.helpers.ts';
import { defaultMediaFilters, filterMedia } from './media.helpers.ts';
import { isSocialPlatform } from '../../supabase/functions/_shared/media-helpers.ts';

export default function useLibraryView() {
  const library = useMedia();
  const { notify } = useWorkspace();
  const [filters, setFilters] = useState(defaultMediaFilters);
  const [addingLink, setAddingLink] = useState(false);
  const [selected, setSelected] = useState('');
  const handledCallback = useRef(false);
  const records = filterMedia(library.media, filters);
  const active = library.media.filter(record => !record.archived_at);
  const measured = active.filter(record => record.source === 'api' && record.metrics_updated_at);
  const selectedRecord = library.media.find(record => record.id === selected);
  const allArchived =
    Boolean(library.media.length) &&
    !active.length &&
    !filters.archived &&
    !filters.query &&
    filters.scope === 'all';
  useEffect(() => {
    if (library.loading || handledCallback.current) return;
    const url = new URL(window.location.href);
    const result = url.searchParams.get('social');
    if (!result) return;
    handledCallback.current = true;
    const platform = url.searchParams.get('platform');
    url.searchParams.delete('social');
    url.searchParams.delete('platform');
    url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
    if (
      result === 'connected' &&
      isSocialPlatform(platform) &&
      library.accounts.some(
        account => account.platform === platform && account.status === 'connected'
      )
    )
      void library.sync(platform).catch(() => {});
    else
      notify(
        result === 'cancelled'
          ? 'Connection cancelled. Your library is right here.'
          : 'The connection did not finish. Check the developer-app setup and try again.'
      );
  }, [library.loading, library.accounts, library.sync, notify]);
  const changeFilter = <K extends keyof MediaFilters>(key: K, value: MediaFilters[K]) =>
    setFilters(current => ({ ...current, [key]: value }));

  function added(id: string) {
    setFilters(defaultMediaFilters);
    setSelected(id);
  }
  return {
    library,
    filters,
    setFilters,
    addingLink,
    setAddingLink,
    setSelected,
    records,
    active,
    measured,
    selectedRecord,
    allArchived,
    changeFilter,
    added
  };
}
