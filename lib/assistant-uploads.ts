import { Upload } from 'tus-js-client';
import type { AssistantAttachment } from './types.ts';
import { getSupabaseClient, getSupabaseConfig } from './supabase.ts';
import { assistantUploadError, assistantUploadFailure } from './assistant-uploads.helpers.ts';
import {
  ASSISTANT_BUCKET,
  ATTACHMENT_TYPES,
  attachmentHasSignature,
  validateAttachments
} from '../supabase/functions/_shared/assistant-attachments.ts';

export function planningFileType(file: File): string {
  if (Object.hasOwn(ATTACHMENT_TYPES, file.type)) return file.type;
  // Some browsers leave PDF MIME types empty. The file signature is checked before uploading.
  if (!file.type || file.type === 'application/octet-stream') {
    const extension = file.name.split('.').at(-1)?.toLowerCase();
    if (extension === 'jpeg') return 'image/jpeg';
    return Object.entries(ATTACHMENT_TYPES).find(([, value]) => value === extension)?.[0] || '';
  }
  return '';
}

export function planningFileRecord(file: File, ownerId: string): AssistantAttachment {
  const id = crypto.randomUUID();
  const mimeType = planningFileType(file);
  if (!mimeType) throw new Error('Attach a PDF, JPG, PNG or WebP file.');
  return {
    id,
    name: file.name,
    mimeType,
    size: file.size,
    path: `${ownerId}/${id}.${ATTACHMENT_TYPES[mimeType]}`
  };
}

export function resumableStorageEndpoint(projectUrl: string): string {
  const url = new URL(projectUrl);
  if (url.hostname.endsWith('.supabase.co'))
    url.hostname = url.hostname.replace('.supabase.co', '.storage.supabase.co');
  return `${url.origin}/storage/v1/upload/resumable`;
}

export async function uploadAssistantFiles(
  files: File[],
  existing: AssistantAttachment[],
  signal: AbortSignal,
  onProgress: (message: string) => void
): Promise<AssistantAttachment[]> {
  if (!files.length) return [];
  const client = getSupabaseClient();
  const config = getSupabaseConfig();
  if (!client || !config) throw new Error('Sign in to upload planning files.');
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Sign in again to upload planning files.');
  const records = files.map(file => planningFileRecord(file, data.session!.user.id));
  validateAttachments([...existing, ...records]);
  // Validate every file before starting any transfer.
  for (let index = 0; index < files.length; index++) {
    const bytes = new Uint8Array(await files[index].slice(0, 12).arrayBuffer());
    if (!attachmentHasSignature(bytes, records[index].mimeType))
      throw new Error(
        `${records[index].name} isn’t a readable PDF or supported image. Export it again and retry.`
      );
  }
  const attempted: string[] = [];
  try {
    for (let index = 0; index < files.length; index++) {
      signal.throwIfAborted();
      const record = records[index];
      attempted.push(record.path);
      await new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          signal.removeEventListener('abort', cancel);
          if (error) reject(error);
          else resolve();
        };
        const upload = new Upload(files[index], {
          endpoint: resumableStorageEndpoint(config.url),
          chunkSize: 6 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000],
          // XHR appends duplicate headers; authorization is set once with the current session below.
          headers: { apikey: config.key },
          metadata: {
            bucketName: ASSISTANT_BUCKET,
            objectName: record.path,
            contentType: record.mimeType,
            cacheControl: '0'
          },
          uploadDataDuringCreation: true,
          storeFingerprintForResuming: false,
          onBeforeRequest: async request => {
            signal.throwIfAborted();
            const { data: current, error: sessionError } = await client.auth.getSession();
            if (sessionError || !current.session)
              throw new Error(assistantUploadError(record.name, { status: 401, body: '' }));
            request.setHeader('authorization', `Bearer ${current.session.access_token}`);
            const xhr = request.getUnderlyingObject();
            if (typeof XMLHttpRequest !== 'undefined' && xhr instanceof XMLHttpRequest)
              xhr.timeout = 90_000;
          },
          onProgress: (sent, total) =>
            onProgress(
              `Uploading ${index + 1} of ${files.length}: ${record.name} · ${Math.round((sent / total) * 100)}%`
            ),
          onSuccess: () => finish(),
          onError: error =>
            finish(
              new Error(
                error.message === assistantUploadError(record.name, { status: 401, body: '' })
                  ? error.message
                  : assistantUploadError(record.name, assistantUploadFailure(error))
              )
            )
        });
        function cancel() {
          void upload
            .abort(true)
            .catch(() => {})
            .then(() => finish(new DOMException('Upload cancelled.', 'AbortError')));
        }
        signal.addEventListener('abort', cancel, { once: true });
        upload.start();
      });
    }
    return records;
  } catch (error) {
    // A partially uploaded batch never becomes part of the saved conversation.
    if (attempted.length) await client.storage.from(ASSISTANT_BUCKET).remove(attempted);
    throw error;
  }
}

export async function removeAssistantFiles(files: AssistantAttachment[]): Promise<void> {
  if (!files.length) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Sign in to remove planning files.');
  const { error } = await client.storage
    .from(ASSISTANT_BUCKET)
    .remove(files.map(file => file.path));
  if (error)
    throw new Error(
      'Your planning files couldn’t be removed. Check your connection and try again.'
    );
}
