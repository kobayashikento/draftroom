'use client';

import { useEffect, useState } from 'react';
import { signedVideoUrl } from '../../lib/media-client.ts';
import { safeHttpsUrl } from '../../supabase/functions/_shared/media-helpers.ts';
import type { MediaRecord } from './media.helpers.ts';
import { playableEmbed } from './media.helpers.ts';

export default function useMediaPlayer(record: MediaRecord) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const direct =
    record.source === 'upload' || (record.platform === 'Instagram' && Boolean(record.media_url));
  const embed = playableEmbed(record);
  useEffect(() => {
    let active = true;
    setUrl('');
    setError('');
    if (direct)
      void signedVideoUrl(record)
        .then(value => {
          if (active) setUrl(safeHttpsUrl(value));
        })
        .catch(error => {
          if (active)
            setError(error instanceof Error ? error.message : 'This clip could not be opened.');
        });
    return () => {
      active = false;
    };
  }, [record.id, record.media_url, record.storage_path, direct, attempt]);
  return {
    url,
    error,
    direct,
    embed,
    attempt,
    retry: () => setAttempt(value => value + 1),
    videoFailed: () =>
      setError(
        record.source === 'upload'
          ? 'Your browser couldn’t play this clip. H.264 MP4 offers the widest support.'
          : 'This platform media link may have expired. Sync the account to refresh it, or open the original post.'
      ),
    imageFailed: () =>
      setError('This preview link may have expired. Sync the account to refresh it.')
  };
}
