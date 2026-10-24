import type { MediaRecord, SocialCommand } from '../supabase/functions/_shared/social-types.ts';
import { isRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { getSupabaseClient } from './supabase.ts';

export async function mediaCommand(command: SocialCommand): Promise<unknown> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Sign in to your connected workspace to use cloud media.');
  const { data, error } = await client.functions.invoke('draftroom-social', {
    body: command,
    timeout: 85_000
  });
  if (error) {
    let message = '';
    try {
      const result: unknown = await error.context?.json();
      if (isRecord(result) && typeof result.error === 'string') message = result.error;
    } catch {
      /* Gateway/network responses may not contain JSON. */
    }
    throw new Error(
      message || 'The media library is unavailable. Check your connection and try again.'
    );
  }
  return data;
}

export function resultId(value: unknown): string {
  if (!isRecord(value) || typeof value.id !== 'string')
    throw new Error('The library could not confirm this import. Refresh before trying again.');
  return value.id;
}

export async function signedVideoUrl(record: MediaRecord): Promise<string> {
  if (!record.storage_path) return record.media_url;
  const client = getSupabaseClient();
  if (!client) throw new Error('Sign in to watch this private clip.');
  const { data, error } = await client.storage
    .from('draftroom-media')
    .createSignedUrl(record.storage_path, 600);
  if (error || !data)
    throw new Error('This clip could not be opened. Check your connection and try again.');
  return data.signedUrl;
}

function pendingKey(ownerId: string): string {
  return `draftroom:pending-media:${ownerId}`;
}

export async function finishPendingUpload(ownerId: string): Promise<string | null> {
  const saved = localStorage.getItem(pendingKey(ownerId));
  if (!saved) return null;
  const pending: unknown = JSON.parse(saved);
  if (
    !isRecord(pending) ||
    pending.action !== 'register_upload' ||
    typeof pending.path !== 'string' ||
    !pending.path.startsWith(`${ownerId}/`) ||
    typeof pending.title !== 'string' ||
    typeof pending.linkedItemId !== 'string' ||
    !(pending.duration === null || typeof pending.duration === 'number')
  )
    throw new Error(
      'An unfinished clip import needs attention. Its file has been preserved in private storage.'
    );
  const result = await mediaCommand({
    action: 'register_upload',
    path: pending.path,
    title: pending.title,
    linkedItemId: pending.linkedItemId,
    duration: pending.duration
  });
  const id = resultId(result);
  localStorage.removeItem(pendingKey(ownerId));
  return id;
}
