import type { GeminiResponse } from './types.ts';
import { validateContext } from './assistant-context.ts';
import { validateMessages, validateReply } from './assistant-protocol.ts';
import { geminiRequest } from './assistant-prompt.ts';

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
        413,
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
  corsHeaders = {},
}: {
  authorize: (request: Request) => Promise<string | null>;
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  corsHeaders?: Record<string, string>;
}) {
  const calls = new Map<string, number[]>();
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST')
      return json({ error: 'Use POST to talk to the assistant.' }, 405);
    try {
      const userId = await authorize(request);
      if (!userId)
        throw new AssistantError('Sign in to your Draftroom workspace to use the assistant.', 401);
      if (!apiKey)
        throw new AssistantError(
          'Gemini isn’t connected yet. Add GEMINI_API_KEY in Supabase Edge Function secrets.',
          503,
        );
      if (apiKey.startsWith('sb_'))
        throw new AssistantError(
          'GEMINI_API_KEY contains a Supabase key. Replace it with a Gemini API key from Google AI Studio.',
          503,
        );
      const body = await requestBody(request);
      if (!body || typeof body !== 'object' || !('messages' in body) || !('context' in body))
        throw new AssistantError('A message and workspace context are required.', 400);
      const messages = validateMessages(body.messages);
      const context = validateContext(body.context);
      const now = Date.now();
      const recent = (calls.get(userId) || []).filter((time) => time > now - 60_000);
      if (recent.length >= 6)
        throw new AssistantError('A little breather—please try again in a minute.', 429);
      calls.set(userId, [...recent, now]);
      let response;
      try {
        response = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(geminiRequest(context, messages)),
            signal: AbortSignal.timeout(45_000),
          },
        );
      } catch {
        throw new AssistantError('Gemini took too long to respond. Please try again.', 504);
      }
      if (response.status === 429)
        throw new AssistantError(
          'Gemini’s free quota is busy or used up. Please try again later.',
          429,
        );
      if (response.status === 503)
        throw new AssistantError('Gemini is busy right now. Please try again in a moment.', 503);
      if (!response.ok) {
        const error = new AssistantError(
          'Gemini couldn’t respond. Check the API key, model access and quota in Google AI Studio.',
          502,
        );
        error.providerStatus = response.status;
        throw error;
      }
      try {
        const result: GeminiResponse = await response.json();
        const candidate = result.candidates?.[0];
        if (candidate?.finishReason !== 'STOP') throw new Error('Incomplete response');
        const text = candidate.content?.parts
          ?.filter((part) => !part.thought)
          .map((part) => part.text || '')
          .join('');
        if (!text) throw new Error('Empty response');
        return json(validateReply(JSON.parse(text)));
      } catch {
        throw new AssistantError(
          'Gemini couldn’t finish a usable response. No changes were made. Try a smaller request.',
          502,
        );
      }
    } catch (error) {
      if (error instanceof AssistantError)
        return json(
          {
            error: error.message,
            ...(error.providerStatus ? { providerStatus: error.providerStatus } : {}),
          },
          error.status,
        );
      return json(
        { error: 'The request could not be read. Please shorten your message and try again.' },
        400,
      );
    }
  };
}
