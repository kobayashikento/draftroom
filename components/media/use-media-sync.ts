'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { Workspace } from '../../lib/types.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { postedSyncPlatforms } from './posted-sync.helpers.ts';
import { appOpenSyncDue, nextMediaSyncRequest } from './media-sync.helpers.ts';
import type { MediaSyncLibrary, MediaSyncQueue, MediaSyncRequest } from './media-sync.helpers.ts';

export default function useMediaSync(library: MediaSyncLibrary) {
  const { state, cloud, authUser, notify } = useWorkspace();
  const owner = cloud ? authUser?.id || '' : '';
  const previous = useRef<Workspace | null>(null);
  const observedOwner = useRef(owner);
  const pending = useRef<MediaSyncQueue>(new Map());
  const checkOnOpen = useRef(true);
  const active = useRef<(MediaSyncRequest & { owner: string }) | null>(null);
  const mounted = useRef(false);
  const [revision, settled] = useReducer(value => value + 1, 0);

  useEffect(() => {
    mounted.current = true;
    const opened = () => {
      if (document.visibilityState !== 'visible') return;
      checkOnOpen.current = true;
      settled();
    };
    window.addEventListener('focus', opened);
    window.addEventListener('online', opened);
    document.addEventListener('visibilitychange', opened);
    return () => {
      mounted.current = false;
      pending.current.clear();
      window.removeEventListener('focus', opened);
      window.removeEventListener('online', opened);
      document.removeEventListener('visibilitychange', opened);
    };
  }, []);

  useEffect(() => {
    if (observedOwner.current !== owner) {
      previous.current = null;
      pending.current.clear();
      checkOnOpen.current = true;
      observedOwner.current = owner;
    }
    const platforms = owner ? postedSyncPlatforms(previous.current, state) : [];
    previous.current = state;
    for (const platform of platforms)
      if (active.current?.owner !== owner || active.current.platform !== platform)
        pending.current.set(platform, 'posted');

    if (
      !owner ||
      library.loading ||
      library.refreshing ||
      library.busy ||
      active.current ||
      document.visibilityState !== 'visible' ||
      !navigator.onLine
    )
      return;
    if (checkOnOpen.current) {
      checkOnOpen.current = false;
      if (!library.error)
        for (const account of library.accounts)
          if (appOpenSyncDue(account) && !pending.current.has(account.platform))
            pending.current.set(account.platform, 'open');
    }
    // Recheck the timestamp after waiting: another sync may have reset the buffer.
    const request = nextMediaSyncRequest(pending.current, library.accounts);
    if (!request) return;
    const { platform, reason } = request;
    active.current = { owner, ...request };
    if (reason === 'posted') notify(`Syncing ${platform} after your posted update…`);
    void library
      .sync(platform)
      .then(() => {
        if (mounted.current && observedOwner.current === owner && reason === 'posted')
          notify(`${platform} refreshed. Match your published post in Publish.`);
      })
      .catch(() => {
        if (mounted.current && observedOwner.current === owner)
          notify(
            reason === 'posted'
              ? `Posted status kept. ${platform} sync failed — retry in Library.`
              : `${platform} could not sync. Your saved posts are kept — retry in Library.`
          );
      })
      .finally(() => {
        active.current = null;
        if (mounted.current) settled();
      });
  }, [
    state,
    owner,
    library.accounts,
    library.loading,
    library.refreshing,
    library.busy,
    library.error,
    library.sync,
    notify,
    revision
  ]);
}
