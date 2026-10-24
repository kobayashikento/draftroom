import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2.118.0/cors';
import { createAssistantHandler, AssistantError } from '../_shared/assistant-handler.ts';
import { ASSISTANT_BUCKET } from '../_shared/assistant-attachments.ts';
import type { Database } from '../../../lib/database.types.ts';
import { performanceContext } from '../_shared/media-helpers.ts';

function scopedClient(request: Request) {
  return createClient<Database>(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const handler = createAssistantHandler({
  apiKey: Deno.env.get('GEMINI_API_KEY')?.trim(),
  model: Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite',
  corsHeaders,
  loadPerformance: async (request, ownerId) => {
    const client = scopedClient(request);
    const [media, accounts] = await Promise.all([
      client
        .from('draftroom_media')
        .select('*', { count: 'exact' })
        .eq('owner_id', ownerId)
        .is('archived_at', null)
        .order('published_at', { ascending: false })
        .limit(200),
      client.from('draftroom_social_accounts').select('*').eq('owner_id', ownerId)
    ]);
    if (media.error || accounts.error) throw new Error('Performance could not be loaded.');
    return performanceContext(media.data || [], accounts.data || [], (media.count || 0) > 200);
  },
  loadAttachment: async (request, attachment) => {
    const bucket = scopedClient(request).storage.from(ASSISTANT_BUCKET);
    const { data: info, error: infoError } = await bucket.info(attachment.path);
    if (
      infoError ||
      !info ||
      info.size !== attachment.size ||
      info.contentType !== attachment.mimeType
    )
      throw new AssistantError(
        'The planning file is missing or has changed. Attach it again.',
        400
      );
    const { data, error } = await bucket.createSignedUrl(attachment.path, 180);
    if (error || !data)
      throw new AssistantError('Your planning file is unavailable. Try again.', 503);
    return fetch(data.signedUrl, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)])
    });
  },
  authorize: async (request: Request) => {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return null;
    const client = scopedClient(request);
    const {
      data: { user },
      error
    } = await client.auth.getUser(authorization.slice(7));
    if (error || !user) return null;
    // Use the caller's RLS-scoped client, never a service-role client.
    const { data, error: workspaceError } = await client
      .from('draftroom_workspaces')
      .select('owner_id')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (workspaceError)
      throw new AssistantError('Your workspace is unavailable. Try again shortly.', 503);
    if (!data) throw new AssistantError('This account does not have a Draftroom workspace.', 403);
    return user.id;
  }
});

Deno.serve(handler);
