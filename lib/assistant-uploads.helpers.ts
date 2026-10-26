import type { DetailedError } from 'tus-js-client';

export type AssistantUploadFailure = { status: number; body: string };

export function assistantUploadFailure(error: Error | DetailedError): AssistantUploadFailure {
  const response = 'originalResponse' in error ? error.originalResponse : null;
  return {
    status: response?.getStatus() || 0,
    body: response?.getBody() || ''
  };
}

export function assistantUploadError(name: string, failure: AssistantUploadFailure): string {
  if (/bucket.*not found|nosuchbucket/i.test(failure.body))
    return 'Planning file storage hasn’t been set up for this workspace yet.';
  if (failure.status === 401)
    return 'Your session expired. Sign in again to upload planning files.';
  if (failure.status === 403 || /row.level security|unauthorized/i.test(failure.body))
    return 'Your workspace doesn’t have permission to upload planning files.';
  if (failure.status === 413 || /size.*limit|entity too large|maximum.*size/i.test(failure.body))
    return `Storage rejected the size of ${name}. Try a smaller file; PDFs can be up to 50 MB and images up to 20 MB.`;
  if (failure.status === 415 || /mime.*not supported|invalid.*content.type/i.test(failure.body))
    return `${name} wasn’t accepted as a supported image or PDF. Export it as JPG, PNG, WebP or PDF and try again.`;
  if (failure.status === 429)
    return 'Planning file uploads are busy right now. Wait a moment and try again.';
  if (failure.status >= 500)
    return `File storage is temporarily unavailable. Your file ${name} is still selected; please try again.`;
  if (failure.status >= 400)
    return `Storage couldn’t accept ${name}. Please try attaching it again.`;
  return `Couldn’t upload ${name}. Check your connection and try again.`;
}
