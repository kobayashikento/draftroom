import type { SocialCommand } from './social-types.ts';
import type { createSocialService } from './social-service.ts';
import { isRecord, isSocialPlatform } from './media-helpers.ts';
import { SocialError } from './social-providers.ts';

export type SocialService = ReturnType<typeof createSocialService>;
export type SocialHandlerOptions = {
  authorize: (request: Request) => Promise<string | null>;
  service: SocialService;
  corsHeaders?: Record<string, string>;
};

function shortString(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit;
}

export function parseSocialCommand(value: unknown): SocialCommand {
  if (!isRecord(value)) throw new SocialError('Choose a media-library action.');
  if (value.action === 'library') return { action: 'library' };
  if (
    value.action === 'connect' &&
    isSocialPlatform(value.platform) &&
    shortString(value.returnOrigin, 300)
  )
    return { action: 'connect', platform: value.platform, returnOrigin: value.returnOrigin };
  if (
    value.action === 'sync' &&
    isSocialPlatform(value.platform) &&
    typeof value.older === 'boolean'
  )
    return { action: 'sync', platform: value.platform, older: value.older };
  if (value.action === 'disconnect' && isSocialPlatform(value.platform))
    return { action: 'disconnect', platform: value.platform };
  if (
    value.action === 'import_link' &&
    shortString(value.url, 2000) &&
    shortString(value.title, 240) &&
    shortString(value.linkedItemId, 100)
  )
    return {
      action: 'import_link',
      url: value.url,
      title: value.title,
      linkedItemId: value.linkedItemId
    };
  if (
    value.action === 'register_upload' &&
    shortString(value.path, 300) &&
    shortString(value.title, 240) &&
    shortString(value.linkedItemId, 100) &&
    (value.duration === null ||
      (typeof value.duration === 'number' &&
        Number.isFinite(value.duration) &&
        value.duration >= 0 &&
        value.duration <= 36000))
  )
    return {
      action: 'register_upload',
      path: value.path,
      title: value.title,
      duration: value.duration,
      linkedItemId: value.linkedItemId
    };
  if (
    value.action === 'update_media' &&
    shortString(value.id, 100) &&
    /^[a-f0-9-]{36}$/.test(value.id) &&
    shortString(value.linkedItemId, 100) &&
    typeof value.archived === 'boolean'
  )
    return {
      action: 'update_media',
      id: value.id,
      linkedItemId: value.linkedItemId,
      archived: value.archived
    };
  throw new SocialError('This media-library request is incomplete or unsupported.');
}

export function createSocialHandler({
  authorize,
  service,
  corsHeaders = {}
}: SocialHandlerOptions) {
  const calls = new Map<string, number[]>();
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST')
      return json({ error: 'Use POST for media-library requests.' }, 405);
    try {
      const ownerId = await authorize(request);
      if (!ownerId)
        throw new SocialError('Sign in to your Draftroom workspace to use the library.', 401);
      const raw = await request.text();
      if (raw.length > 12000) throw new SocialError('This request is too large.', 413);
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new SocialError('The library request could not be read.');
      }
      const command = parseSocialCommand(body);
      if (command.action !== 'library') {
        const recent = (calls.get(ownerId) || []).filter(time => time > Date.now() - 60_000);
        if (recent.length >= 30)
          throw new SocialError('Give the library a moment before trying again.', 429);
        calls.set(ownerId, [...recent, Date.now()]);
      }
      return json(await service.run(ownerId, command));
    } catch (error) {
      return json(
        {
          error:
            error instanceof SocialError
              ? error.message
              : 'Your library could not complete that request. Please try again.'
        },
        error instanceof SocialError ? error.status : 503
      );
    }
  };
}

export function createSocialCallbackHandler(service: SocialService) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET')
      return new Response('Use the account connection link from Draftroom.', { status: 405 });
    try {
      const url = new URL(request.url);
      const destination = await service.callback(
        url.searchParams.get('code') || '',
        url.searchParams.get('state') || '',
        url.searchParams.has('error')
      );
      return new Response(null, {
        status: 303,
        headers: {
          Location: destination,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer'
        }
      });
    } catch (error) {
      return new Response(
        error instanceof SocialError
          ? error.message
          : 'The connection could not be completed. Return to Draftroom and try again.',
        {
          status: error instanceof SocialError ? error.status : 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      );
    }
  };
}
