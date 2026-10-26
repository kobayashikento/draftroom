'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { finishPendingUpload, mediaCommand, resultId } from '../../lib/media-client.ts';
import { isRecord } from '../../supabase/functions/_shared/media-helpers.ts';
import type { MediaController, MediaRecord } from './media.helpers.ts';
import {
  applyPublicationPostLink,
  preparePublicationPostLink,
  removePublicationPostLink
} from './publication-link.helpers.ts';
import {
  blankLibrary,
  LOCAL_MEDIA_KEY,
  localLinkRecord,
  parseMediaSnapshot,
  sameMediaLink,
  validMediaRecord
} from './media.helpers.ts';

export default function useMediaLibrary(onOpenLibrary: () => void): MediaController {
  const { cloud, authUser, notify, state, update } = useWorkspace();
  const [snapshot, setSnapshot] = useState(blankLibrary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const locked = useRef(false);
  const generation = useRef(0);
  const ownerId = authUser?.id;

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setRefreshing(true);
    try {
      let next;
      if (cloud && ownerId) {
        await finishPendingUpload(ownerId);
        next = parseMediaSnapshot(await mediaCommand({ action: 'library' }));
      } else {
        const raw: unknown = JSON.parse(localStorage.getItem(LOCAL_MEDIA_KEY) || '[]');
        if (!Array.isArray(raw) || !raw.every(validMediaRecord))
          throw new Error(
            'Your browser’s library could not be read. Its saved copy has been preserved.'
          );
        next = { ...blankLibrary, media: raw };
      }
      if (generation.current === current) {
        setSnapshot(next);
        setError('');
      }
    } catch (error) {
      if (generation.current === current)
        setError(error instanceof Error ? error.message : 'The library could not be loaded.');
    } finally {
      if (generation.current === current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cloud, ownerId]);

  useEffect(() => {
    setSnapshot(blankLibrary);
    setLoading(true);
    void refresh();
    const visible = () => {
      if (document.visibilityState === 'visible' && !locked.current) void refresh();
    };
    window.addEventListener('online', visible);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      generation.current++;
      window.removeEventListener('online', visible);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);

  async function run<T>(label: string, action: () => Promise<T>): Promise<T> {
    if (locked.current) throw new Error('Let the current library action finish first.');
    locked.current = true;
    setBusy(label);
    setError('');
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setError(
          error instanceof Error ? error.message : 'The library could not complete this request.'
        );
      throw error;
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  function saveLocal(media: MediaRecord[]) {
    localStorage.setItem(LOCAL_MEDIA_KEY, JSON.stringify(media));
    setSnapshot(current => ({ ...current, media }));
  }

  async function saveMediaConnection(record: MediaRecord, linkedItemId: string): Promise<void> {
    if (cloud)
      await mediaCommand({
        action: 'update_media',
        id: record.id,
        linkedItemId,
        archived: Boolean(record.archived_at)
      });
  }

  return {
    ...snapshot,
    loading,
    refreshing,
    error,
    busy,
    cloud: Boolean(cloud),
    refresh,
    openLibrary: onOpenLibrary,
    linkPublication: input =>
      run('Matching published post', async () => {
        const prepared = preparePublicationPostLink(state, snapshot.media, input);
        await saveMediaConnection(prepared.record, input.itemId);
        if (prepared.previousRecord?.linked_item_id === input.itemId)
          await saveMediaConnection(prepared.previousRecord, prepared.previousLinkedItemId);
        if (!cloud)
          saveLocal(
            snapshot.media.map(record =>
              record.id === input.mediaId
                ? { ...record, linked_item_id: input.itemId }
                : record.id === prepared.previousRecord?.id &&
                    record.linked_item_id === input.itemId
                  ? { ...record, linked_item_id: prepared.previousLinkedItemId }
                  : record
            )
          );
        update(draft => applyPublicationPostLink(draft, prepared));
        if (cloud) await refresh();
        notify(`${prepared.record.platform} post matched. This channel is live.`);
      }),
    unlinkPublication: (itemId, publicationId) =>
      run('Removing publication match', async () => {
        const publication = state.items
          .find(item => item.id === itemId)
          ?.publications.find(pub => pub.id === publicationId);
        const link = publication?.linkedPost;
        if (!link) return;
        const record = snapshot.media.find(record => record.id === link.mediaId);
        if (record?.linked_item_id === itemId)
          await saveMediaConnection(record, link.previousLinkedItemId);
        if (!cloud)
          saveLocal(
            snapshot.media.map(record =>
              record.id === link.mediaId && record.linked_item_id === itemId
                ? { ...record, linked_item_id: link.previousLinkedItemId }
                : record
            )
          );
        update(draft => removePublicationPostLink(draft, itemId, publicationId));
        if (cloud) await refresh();
        notify('Publication match removed. The original plan is restored.');
      }),
    connect: platform =>
      run(`Connecting ${platform}`, async () => {
        const result = await mediaCommand({
          action: 'connect',
          platform,
          returnOrigin: window.location.origin
        });
        if (!isRecord(result) || typeof result.url !== 'string')
          throw new Error('The connection link could not be created.');
        const url = new URL(result.url);
        if (
          url.protocol !== 'https:' ||
          !['www.instagram.com', 'www.tiktok.com'].includes(url.hostname)
        )
          throw new Error('The platform returned an invalid connection link.');
        window.location.assign(url.href);
      }),
    sync: (platform, older = false) =>
      run(`Syncing ${platform}`, async () => {
        await mediaCommand({ action: 'sync', platform, older });
        await refresh();
        notify(
          older
            ? 'Older posts added to your library and calendar.'
            : `${platform} posts, calendar and available insights refreshed.`
        );
      }),
    disconnect: platform =>
      run(`Disconnecting ${platform}`, async () => {
        await mediaCommand({ action: 'disconnect', platform });
        await refresh();
        notify(`${platform} disconnected. Imported posts stay in your library.`);
      }),
    importLink: (url, title, linkedItemId) =>
      run('Adding post', async () => {
        let id: string;
        if (cloud)
          id = resultId(await mediaCommand({ action: 'import_link', url, title, linkedItemId }));
        else {
          const existing = snapshot.media.find(record => sameMediaLink(record.permalink, url));
          const record = existing
            ? { ...existing, archived_at: null }
            : localLinkRecord(url, title, linkedItemId);
          saveLocal([record, ...snapshot.media.filter(media => media.id !== record.id)]);
          id = record.id;
        }
        if (cloud) await refresh();
        notify('A little more of your work, all in one place.');
        return id;
      }),
    updateMedia: (record, linkedItemId, archived) =>
      run('Saving library changes', async () => {
        if (cloud) {
          await mediaCommand({ action: 'update_media', id: record.id, linkedItemId, archived });
          await refresh();
        } else
          saveLocal(
            snapshot.media.map(media =>
              media.id === record.id
                ? {
                    ...media,
                    linked_item_id: linkedItemId,
                    archived_at: archived ? new Date().toISOString() : null
                  }
                : media
            )
          );
      })
  };
}
