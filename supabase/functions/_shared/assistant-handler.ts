import type { ChatMessage, GeminiResponse } from './types.ts';
import { validateContext } from './assistant-context.ts';
import { parseAssistantReply, validateMessages } from './assistant-protocol.ts';
import { geminiRequest } from './assistant-prompt.ts';
import { validateAttachments } from './assistant-attachments.ts';
import { prepareGeminiFiles } from './assistant-files.ts';
import type { AttachmentLoader, GeminiFileSession } from './assistant-files.ts';
import type { PerformanceContext } from './social-types.ts';
import { unavailablePerformance } from './assistant-performance.ts';
import { LEGACY_ACTION_TYPES } from './assistant-action-contract.ts';

const MAX_BODY = 160_000;
export class AssistantError extends Error {
  status: number;
  providerStatus?: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new AssistantError('A message is required.', 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) {
      await reader.cancel();
      throw new AssistantError(
        'This conversation is too large. Start a new chat or shorten your message.',
        413
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createAssistantHandler({
  authorize,
  apiKey,
  model = 'gemini-3.5-flash-lite',
  fetcher = fetch,
  loadAttachment,
  loadPerformance,
  corsHeaders = {}
}: {
  authorize: (request: Request) => Promise<string | null>;
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  loadAttachment?: AttachmentLoader;
  loadPerformance?: (
    request: Request,
    ownerId: string,
    messages: ChatMessage[]
  ) => Promise<PerformanceContext>;
  corsHeaders?: Record<string, string>;
}) {
  const calls = new Map<string, number[]>();
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST')
      return json({ error: 'Use POST to talk to the assistant.' }, 405);
    let fileSession: GeminiFileSession | undefined;
    try {
      const userId = await authorize(request);
      if (!userId)
        throw new AssistantError('Sign in to your Draftroom workspace to use the assistant.', 401);
      if (!apiKey)
        throw new AssistantError(
          'Gemini isn’t connected yet. Add GEMINI_API_KEY in Supabase Edge Function secrets.',
          503
        );
      if (apiKey.startsWith('sb_'))
        throw new AssistantError(
          'GEMINI_API_KEY contains a Supabase key. Replace it with a Gemini API key from Google AI Studio.',
          503
        );
      const body = await requestBody(request);
      if (!body || typeof body !== 'object' || !('messages' in body) || !('context' in body))
        throw new AssistantError('A message and workspace context are required.', 400);
      const messages = validateMessages(body.messages);
      const context = validateContext(body.context);
      const creativeBriefs = 'actionVersion' in body && body.actionVersion === 3;
      const workspaceActions =
        creativeBriefs || ('actionVersion' in body && body.actionVersion === 2);
      let attachments;
      try {
        attachments = validateAttachments(
          'attachments' in body ? body.attachments : undefined,
          userId
        );
      } catch (error) {
        throw new AssistantError(
          error instanceof Error ? error.message : 'Invalid planning files.',
          400
        );
      }
      const now = Date.now();
      const recent = (calls.get(userId) || []).filter(time => time > now - 60_000);
      if (recent.length >= 6)
        throw new AssistantError('A little breather—please try again in a minute.', 429);
      calls.set(userId, [...recent, now]);
      // Ignore browser-supplied analytics and load only the verified owner's saved results.
      if (loadPerformance) {
        try {
          context.performance = await loadPerformance(request, userId, messages);
        } catch {
          context.performance = unavailablePerformance();
        }
      }
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(125_000)]);
      if (attachments.length) {
        if (!loadAttachment)
          throw new AssistantError('Planning file storage isn’t connected yet.', 503);
        try {
          fileSession = await prepareGeminiFiles({
            request,
            attachments,
            load: loadAttachment,
            apiKey,
            fetcher,
            signal
          });
        } catch (error) {
          throw new AssistantError(
            error instanceof Error ? error.message : 'The planning files couldn’t be read.',
            502
          );
        }
      }
      let response;
      try {
        response = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(
              geminiRequest(context, messages, fileSession?.files, workspaceActions, creativeBriefs)
            ),
            signal
          }
        );
      } catch {
        throw new AssistantError('Gemini took too long to respond. Please try again.', 504);
      }
      if (response.status === 429)
        throw new AssistantError(
          'Gemini’s free quota is busy or used up. Please try again later.',
          429
        );
      if (response.status === 503)
        throw new AssistantError('Gemini is busy right now. Please try again in a moment.', 503);
      if (!response.ok) {
        // Log provider errors for diagnosis without recording request contents or credentials.
        const failure = await response.json().catch(() => null);
        const detail = failure?.error?.message;
        console.error('Gemini rejected the assistant request', {
          model,
          status: response.status,
          detail:
            typeof detail === 'string'
              ? detail.replaceAll(apiKey, '[redacted]').slice(0, 1000)
              : 'No provider details returned.'
        });
        const error = new AssistantError(
          attachments.length && response.status === 400
            ? 'Gemini couldn’t read this request. Try fewer files or split PDFs into smaller documents of up to 1,000 pages.'
            : 'Gemini couldn’t respond. Check the API key, model access and quota in Google AI Studio.',
          502
        );
        error.providerStatus = response.status;
        throw error;
      }
      let replyStage = 'response';
      let finishReason: string | undefined;
      let replyLength = 0;
      let fenced = false;
      let startsWithObject = false;
      try {
        const result: GeminiResponse = await response.json();
        const candidate = result.candidates?.[0];
        finishReason = candidate?.finishReason;
        replyStage = 'completion';
        if (candidate?.finishReason !== 'STOP') throw new Error('Incomplete response');
        const text = candidate.content?.parts
          ?.filter(part => !part.thought)
          .map(part => part.text || '')
          .join('');
        if (!text) throw new Error('Empty response');
        replyLength = text.length;
        fenced = text.trimStart().startsWith('```');
        startsWithObject = text.trimStart().startsWith('{');
        replyStage = 'validation';
        const reply = parseAssistantReply(text);
        if (
          !creativeBriefs &&
          (reply.briefs?.length ||
            reply.actions.some(
              action =>
                action.type === 'write_creative_brief' ||
                (action.type === 'create_idea' && action.brief)
            ))
        )
          throw new Error('This client cannot display creative briefs.');
        if (
          !workspaceActions &&
          reply.actions.some(action => !LEGACY_ACTION_TYPES.includes(action.type))
        )
          throw new Error('This client cannot apply that action.');
        if (
          !workspaceActions &&
          reply.actions.some(
            action =>
              action.type === 'create_idea' &&
              (action.changes || action.storyboard || action.publications)
          )
        )
          throw new Error('This client cannot initialize those fields.');
        return json(reply);
      } catch (error) {
        console.error('Gemini returned an unusable assistant response', {
          model,
          stage: replyStage,
          finishReason,
          replyLength,
          fenced,
          startsWithObject,
          jsonPosition:
            error instanceof SyntaxError
              ? error.message.match(/(?:position|line|column) \d+/g)
              : undefined
        });
        throw new AssistantError(
          'Gemini couldn’t finish a usable response. No changes were made. Try a smaller request.',
          502
        );
      }
    } catch (error) {
      if (error instanceof AssistantError)
        return json(
          {
            error: error.message,
            ...(error.providerStatus ? { providerStatus: error.providerStatus } : {})
          },
          error.status
        );
      return json(
        { error: 'The request could not be read. Please shorten your message and try again.' },
        400
      );
    } finally {
      await fileSession?.dispose();
    }
  };
}
