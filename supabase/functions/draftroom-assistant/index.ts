import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2.118.0/cors';
import { createAssistantHandler, AssistantError } from '../_shared/assistant-handler.ts';

const handler = createAssistantHandler({
  apiKey: Deno.env.get('GEMINI_API_KEY')?.trim(),
  model: Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite',
  corsHeaders,
  authorize: async (request: Request) => {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return null;
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
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
  },
});

Deno.serve(handler);
