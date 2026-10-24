'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { Workspace } from '../../lib/types.ts';
import type { SocialPlatform } from './media.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { postedSyncPlatforms } from './posted-sync.helpers.ts';
import type { PostedSyncLibrary } from './posted-sync.helpers.ts';

export default function usePostedSync(library: PostedSyncLibrary) {
  const { state, cloud, authUser, notify } = useWorkspace();
  const owner = cloud ? authUser?.id || '' : '';
  const previous = useRef<Workspace | null>(null);
  const observedOwner = useRef(owner);
  const pending = useRef(new Set<SocialPlatform>());
  const active = useRef<{ owner: string; platform: SocialPlatform } | null>(null);
  const mounted = useRef(false);
  const [revision, settled] = useReducer(value => value + 1, 0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current.clear();
    };
  }, []);

  useEffect(() => {
    if (observedOwner.current !== owner) {
      previous.current = null;
      pending.current.clear();
      observedOwner.current = owner;
    }
    const platforms = owner ? postedSyncPlatforms(previous.current, state) : [];
    previous.current = state;
    for (const platform of platforms)
      if (active.current?.owner !== owner || active.current.platform !== platform)
        pending.current.add(platform);

    if (!owner || library.loading || library.busy || active.current) return;
    const connected = new Set(
      library.accounts
        .filter(account => account.status === 'connected')
        .map(account => account.platform)
    );
    for (const platform of pending.current) {
      pending.current.delete(platform);
      if (!connected.has(platform)) continue;
      active.current = { owner, platform };
      notify(`Syncing ${platform} after your posted update…`);
      void library
        .sync(platform)
        .then(() => {
          if (mounted.current && observedOwner.current === owner)
            notify(`${platform} refreshed. Match your published post in Publish.`);
        })
        .catch(() => {
          if (mounted.current && observedOwner.current === owner)
            notify(`Posted status kept. ${platform} sync failed — retry in Library.`);
        })
        .finally(() => {
          active.current = null;
          if (mounted.current) settled();
        });
      break;
    }
  }, [
    state,
    owner,
    library.accounts,
    library.loading,
    library.busy,
    library.sync,
    notify,
    revision
  ]);
}
