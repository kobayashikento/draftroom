import type { AssistantAttachment, GeminiAttachment } from './types.ts';
import { attachmentHasSignature } from './assistant-attachments.ts';

const GOOGLE_API = 'https://generativelanguage.googleapis.com';
type GeminiFile = { name: string; uri: string; state: string };
export type GeminiFileSession = { files: GeminiAttachment[]; dispose: () => Promise<void> };
export type AttachmentLoader = (
  request: Request,
  attachment: AssistantAttachment
) => Promise<Response>;
type GeminiFileOptions = {
  request: Request;
  attachments: AssistantAttachment[];
  load: AttachmentLoader;
  apiKey: string;
  fetcher: typeof fetch;
  signal: AbortSignal;
};

function fileMetadata(value: unknown): GeminiFile {
  if (!value || typeof value !== 'object') throw new Error('Invalid file response.');
  const file = value as Record<string, unknown>;
  if (
    typeof file.name !== 'string' ||
    !/^files\/[a-zA-Z0-9_-]+$/.test(file.name) ||
    file.uri !== `${GOOGLE_API}/v1beta/${file.name}` ||
    typeof file.state !== 'string'
  )
    throw new Error('Invalid file response.');
  return { name: file.name, uri: file.uri as string, state: file.state };
}

// Forward the binary stream without base64 or buffering a large PDF in Edge memory.
export function checkedAttachmentStream(
  source: Response,
  file: AssistantAttachment
): ReadableStream<Uint8Array> {
  if (!source.ok || !source.body) throw new Error('The planning file could not be downloaded.');
  let length = 0;
  let signature = new Uint8Array(0);
  let checked = false;
  return source.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        length += chunk.byteLength;
        if (length > file.size) throw new Error('The planning file size has changed.');
        if (!checked) {
          const combined = new Uint8Array(signature.length + chunk.length);
          combined.set(signature);
          combined.set(chunk, signature.length);
          signature = combined;
          if (signature.length < 12) return;
          if (!attachmentHasSignature(signature.subarray(0, 12), file.mimeType))
            throw new Error('The planning file format is invalid.');
          checked = true;
          controller.enqueue(signature);
          signature = new Uint8Array(0);
        } else controller.enqueue(chunk);
      },
      flush() {
        if (!checked || length !== file.size) throw new Error('The planning file is incomplete.');
      }
    })
  );
}

export async function prepareGeminiFiles({
  request,
  attachments,
  load,
  apiKey,
  fetcher,
  signal
}: GeminiFileOptions): Promise<GeminiFileSession> {
  const names: string[] = [];
  const files: GeminiAttachment[] = [];
  async function dispose() {
    await Promise.allSettled(
      names.map(name =>
        fetcher(`${GOOGLE_API}/v1beta/${name}`, {
          method: 'DELETE',
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(3000)
        })
      )
    );
  }
  try {
    for (const attachment of attachments) {
      const source = await load(request, attachment);
      const stream = checkedAttachmentStream(source, attachment);
      let start: Response;
      try {
        start = await fetcher(`${GOOGLE_API}/upload/v1beta/files`, {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': String(attachment.size),
            'X-Goog-Upload-Header-Content-Type': attachment.mimeType
          },
          body: JSON.stringify({ file: { display_name: attachment.name } }),
          signal
        });
      } catch (error) {
        await stream.cancel().catch(() => {});
        throw error;
      }
      const uploadUrl = start.headers.get('x-goog-upload-url');
      if (!start.ok || !uploadUrl || new URL(uploadUrl).origin !== GOOGLE_API) {
        await stream.cancel().catch(() => {});
        throw new Error('File upload unavailable.');
      }
      const uploaded = await fetcher(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': String(attachment.size),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: stream,
        signal,
        ...{ duplex: 'half' }
      });
      if (!uploaded.ok) throw new Error('File upload failed.');
      const result: unknown = await uploaded.json();
      let file = fileMetadata(
        result && typeof result === 'object' && 'file' in result ? result.file : undefined
      );
      names.push(file.name);
      for (let attempt = 0; file.state === 'PROCESSING' && attempt < 60; attempt++) {
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
        signal.throwIfAborted();
        const status = await fetcher(`${GOOGLE_API}/v1beta/${file.name}`, {
          headers: { 'x-goog-api-key': apiKey },
          signal
        });
        if (!status.ok) throw new Error('File status unavailable.');
        file = fileMetadata(await status.json());
      }
      if (file.state !== 'ACTIVE') throw new Error('File is not ready.');
      files.push({ name: attachment.name, mimeType: attachment.mimeType, uri: file.uri });
    }
    return { files, dispose };
  } catch {
    await dispose();
    throw new Error(
      'The planning files couldn’t be read yet. Try again, or split a large PDF into smaller files (up to 1,000 pages). Scanned PDFs and images are supported.'
    );
  }
}
