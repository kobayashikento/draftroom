import type { AssistantAttachment } from './types.ts';

export const ASSISTANT_BUCKET = 'assistant-attachments';
export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 50_000_000;
export const MAX_IMAGE_BYTES = 20_000_000;
export const ATTACHMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const attachmentPath = new RegExp(`^(${uuid})/(${uuid})\\.(pdf|jpg|png|webp)$`, 'i');

export function validateAttachments(value: unknown, ownerId?: string): AssistantAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS)
    throw new Error('Use up to 4 planning files per chat. Start a new chat for more.');
  const ids = new Set<string>();
  const paths = new Set<string>();
  let total = 0;
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid planning file.');
    const file = entry as Record<string, unknown>;
    const match = typeof file.path === 'string' ? attachmentPath.exec(file.path) : null;
    if (
      Object.keys(file).some(key => !['id', 'name', 'mimeType', 'size', 'path'].includes(key)) ||
      typeof file.id !== 'string' ||
      !match ||
      match[2] !== file.id ||
      (ownerId !== undefined && match[1] !== ownerId) ||
      typeof file.name !== 'string' ||
      !file.name.trim() ||
      file.name.length > 240 ||
      /[\u0000-\u001f\u007f]/.test(file.name) ||
      typeof file.mimeType !== 'string' ||
      !Object.hasOwn(ATTACHMENT_TYPES, file.mimeType) ||
      ATTACHMENT_TYPES[file.mimeType] !== match[3] ||
      typeof file.size !== 'number' ||
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      ids.has(file.id) ||
      paths.has(file.path as string)
    )
      throw new Error('Invalid planning file. Please attach it again.');
    const limit = file.mimeType === 'application/pdf' ? MAX_ATTACHMENT_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) throw new Error('PDFs can be up to 50 MB; images can be up to 20 MB.');
    total += file.size;
    if (total > MAX_ATTACHMENT_BYTES)
      throw new Error('Keep planning files under 50 MB total per chat. Start a new chat for more.');
    ids.add(file.id);
    paths.add(file.path as string);
    return {
      id: file.id,
      name: file.name.trim(),
      mimeType: file.mimeType,
      size: file.size,
      path: file.path as string
    };
  });
}

export function validAttachments(value: unknown): boolean {
  try {
    validateAttachments(value);
    return true;
  } catch {
    return false;
  }
}

export function attachmentHasSignature(bytes: Uint8Array, mimeType: string): boolean {
  const text = new TextDecoder('latin1').decode(bytes);
  if (mimeType === 'application/pdf') return text.startsWith('%PDF-');
  if (mimeType === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return mimeType === 'image/webp' && text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP';
}
