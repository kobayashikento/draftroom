import type { Workspace, AssistantMessage } from './types.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import type {
  AssistantContext,
  ChatMessage,
  AssistantAttachment
} from '../supabase/functions/_shared/types.ts';
import { assistantContext } from '../supabase/functions/_shared/assistant-context.ts';
import { assistantIdeaPosted } from './assistant-workspace-actions.ts';
import { assistantConversationList } from '../components/assistant/assistant.helpers.ts';
import { assistantAttachments } from './assistant-actions.ts';
import { dateString } from './model.ts';

export type AssistantRequestBody = {
  actionVersion: 3;
  messages: ChatMessage[];
  attachments: AssistantAttachment[];
  context: AssistantContext;
};
export function assistantRequestBody(
  state: Workspace,
  messages: AssistantMessage[],
  media: MediaRecord[] = []
): AssistantRequestBody {
  const context = assistantContext(
    state,
    dateString(new Date()),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    {
      includeLinks: false,
      query: messages
        .slice(-4)
        .map(message => message.text)
        .join('\n')
    }
  );
  for (const item of context.items) {
    const original = state.items.find(original => original.id === item.id);
    if (original) item.posted = assistantIdeaPosted(state, original, media);
  }
  context.library = media.slice(0, 200).map(record => ({
    id: record.id,
    title: record.title.slice(0, 240),
    platform: record.platform || '',
    source: record.source,
    linkedItemId: record.linked_item_id,
    archived: Boolean(record.archived_at),
    href: `/library/?post=${encodeURIComponent(record.id)}`
  }));
  context.libraryPartial = media.length > 200;
  context.proposals = (state.assistant?.messages || [])
    .filter(message => message.proposal?.status === 'pending')
    .slice(-10)
    .map(message => ({
      messageId: message.id,
      summary: message.proposal!.labels.slice(0, 3).join('; ').slice(0, 1000)
    }));
  context.conversations = assistantConversationList(state)
    .slice(0, 60)
    .map(({ id, title }) => ({ id, title }));
  const body: AssistantRequestBody = {
    actionVersion: 3,
    messages: messages.slice(-16).map(({ role, text }) => ({ role, text })),
    attachments: assistantAttachments(state),
    context
  };
  context.creativeBriefs = messages
    .filter(message => message.role === 'assistant')
    .flatMap(message => message.briefs || [])
    .slice(-8);
  // Leave room beneath the Edge Function's byte limit, including non-ASCII messages.
  while (new TextEncoder().encode(JSON.stringify(body)).length > 150_000) {
    context.partial = true;
    if (context.creativeBriefs.length > 1) context.creativeBriefs.shift();
    else if (body.messages.length > 4) body.messages.shift();
    else if (context.library.length) {
      context.library.pop();
      context.libraryPartial = true;
    } else if (context.calendarTasks?.length) context.calendarTasks.pop();
    else if (context.items.length > 8) context.items.pop();
    else if (context.series.length) context.series.pop();
    else if ((context.details?.length || 0) > 1) context.details!.pop();
    else if (body.messages.length > 1) body.messages.shift();
    else if (context.details?.length) context.details.pop();
    else if (context.items.length > 1) context.items.pop();
    else if (context.creativeBriefs.length) context.creativeBriefs.pop();
    else throw new Error('This request is too large. Please shorten your message.');
  }
  return body;
}
