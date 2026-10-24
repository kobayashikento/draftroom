import type { Workspace, AssistantMessage } from './types.ts';
import { validateReply } from '../supabase/functions/_shared/assistant-protocol.ts';
import { getSupabaseClient } from './supabase.ts';
import { assistantContext } from '../supabase/functions/_shared/assistant-context.ts';
import { dateString } from './model.ts';

export async function requestAssistant(
  state: Workspace,
  messages: AssistantMessage[],
  signal: AbortSignal
) {
  const client = getSupabaseClient();
  if (!client)
    throw new Error(
      'The assistant needs a signed-in Supabase workspace. Open the connected app to use Gemini.'
    );
  const { data, error } = await client.functions.invoke('draftroom-assistant', {
    body: {
      messages: messages.slice(-16).map(({ role, text }) => ({ role, text })),
      context: assistantContext(
        state,
        dateString(new Date()),
        Intl.DateTimeFormat().resolvedOptions().timeZone
      )
    },
    signal,
    timeout: 55_000
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
