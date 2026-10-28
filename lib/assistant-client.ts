import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import type { Workspace, AssistantMessage } from './types.ts';
import { validateReply } from '../supabase/functions/_shared/assistant-protocol.ts';
import { getSupabaseClient } from './supabase.ts';
import { assistantRequestBody } from './assistant-client.helpers.ts';

export async function requestAssistant(
  state: Workspace,
  messages: AssistantMessage[],
  signal: AbortSignal,
  media: MediaRecord[] = []
) {
  const client = getSupabaseClient();
  if (!client)
    throw new Error(
      'The assistant needs a signed-in Supabase workspace. Open the connected app to use Gemini.'
    );
  const body = assistantRequestBody(state, messages, media);
  const { data, error } = await client.functions.invoke('draftroom-assistant', {
    body,
    signal,
    timeout: 140_000
  });
  if (error) {
    let message;
    try {
      message = (await error.context?.json())?.error;
    } catch {
      /* Network and gateway errors have no JSON body. */
    }
    throw new Error(
      message || 'Couldn’t reach the assistant. Check your connection and try again.'
    );
  }
  return validateReply(data);
}
