'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { finishPendingUpload, mediaCommand, resultId } from '../../lib/media-client.ts';
import { isRecord } from '../../supabase/functions/_shared/media-helpers.ts';
import type { MediaController, MediaRecord } from './media.helpers.ts';
import {
  blankLibrary,
  LOCAL_MEDIA_KEY,
  localLinkRecord,
  parseMediaSnapshot,
  sameMediaLink,
  validMediaRecord
} from './media.helpers.ts';

export default function useMediaLibrary(onOpenLibrary: () => void): MediaController {
  const { cloud, authUser, notify } = useWorkspace();
  const [snapshot, setSnapshot] = useState(blankLibrary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const locked = useRef(false);
  const generation = useRef(0);
  const ownerId = authUser?.id;

  const refresh = useCallback(async () => {
    const current = ++generation.current;
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
      if (generation.current === current) setLoading(false);
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
    document.addEventListener('visibilitychange', visible);
    return () => {
      generation.current++;
      window.removeEventListener('online', visible);
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

  return {
    ...snapshot,
    loading,
    error,
    busy,
    cloud: Boolean(cloud),
    refresh,
    openLibrary: onOpenLibrary,
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
            ? 'Older posts added to your library.'
            : `${platform} posts and available insights refreshed.`
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
