import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssistantHandler,
  AssistantError
} from '../supabase/functions/_shared/assistant-handler.ts';
import { assistantContext } from '../supabase/functions/_shared/assistant-context.ts';
import { seed } from '../lib/model.ts';
type HandlerOptions = Parameters<typeof createAssistantHandler>[0];

const payload = () => ({
  context: assistantContext(seed(), '2026-10-23', 'America/Toronto'),
  messages: [{ role: 'user', text: 'What should I work on?' }]
});
const request = (body: unknown = payload(), method = 'POST') =>
  new Request('https://example.com/assistant', {
    method,
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {})
  });
const success = () =>
  Response.json({
    candidates: [
      {
        finishReason: 'STOP',
        content: {
          parts: [{ text: JSON.stringify({ reply: 'Start with filming.', actions: [] }) }]
        }
      }
    ]
  });
const handler = (options: Partial<HandlerOptions> = {}) =>
  createAssistantHandler({
    authorize: async () => 'owner',
    apiKey: 'TEST-KEY',
    fetcher: async () => success(),
    ...options
  });

test('a Supabase key mistakenly entered as the Gemini secret is never sent to Google', async () => {
  let called = false;
  const response = await handler({
    apiKey: 'sb_secret_fixture',
    fetcher: async () => {
      called = true;
      return success();
    }
  })(request());
  const body = JSON.stringify(await response.json());
  assert.equal(response.status, 503);
  assert.match(body, /Google AI Studio/);
  assert.equal(body.includes('sb_secret_fixture'), false);
  assert.equal(called, false);
});

test('anonymous users and non-owner accounts cannot invoke Gemini', async () => {
  let called = false;
  for (const authorize of [
    async () => null,
    async () => {
      throw new AssistantError('No workspace.', 403);
    }
  ]) {
    const response = await handler({
      authorize,
      fetcher: async () => {
        called = true;
        return success();
      }
    })(request());
    assert.ok([401, 403].includes(response.status));
  }
  assert.equal(called, false);
});
test('private Gemini credentials only go to Google, with validated structured output', async () => {
  const response = await handler({
    fetcher: async (url, options) => {
      assert.match(String(url), /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\//);
      assert.equal(new Headers(options?.headers).get('x-goog-api-key'), 'TEST-KEY');
      const body = JSON.parse(String(options?.body));
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.match(body.systemInstruction.parts[0].text, /create_task needs itemId/);
      assert.equal(JSON.stringify(body).includes('TEST-KEY'), false);
      return success();
    }
  })(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reply: 'Start with filming.', actions: [] });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('missing configuration, provider failures and quota have safe actionable errors', async () => {
  const cases: [Partial<HandlerOptions>, number, RegExp][] = [
    [{ apiKey: '' }, 503, /GEMINI_API_KEY/],
    [
      { fetcher: async () => new Response('SECRET-PROVIDER-DETAIL', { status: 429 }) },
      429,
      /quota/
    ],
    [
      { fetcher: async () => new Response('SECRET-PROVIDER-DETAIL', { status: 403 }) },
      502,
      /model access/
    ],
    [
      { fetcher: async () => new Response('SECRET-PROVIDER-DETAIL', { status: 503 }) },
      503,
      /busy right now/
    ],
    [
      {
        fetcher: async () => {
          throw new Error('SECRET-PROVIDER-DETAIL');
        }
      },
      504,
      /too long/
    ]
  ];
  for (const [options, status, message] of cases) {
    const response = await handler(options)(request());
    assert.equal(response.status, status);
    const body = JSON.stringify(await response.json());
    assert.match(body, message);
    assert.equal(body.includes('SECRET-PROVIDER-DETAIL'), false);
  }
});
test('incomplete or unsupported model actions never reach the app', async () => {
  for (const candidate of [
    { finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } },
    {
      finishReason: 'STOP',
      content: {
        parts: [
          {
            text: JSON.stringify({
              reply: 'Deleted.',
              actions: [{ type: 'delete_idea', itemId: 'x' }]
            })
          }
        ]
      }
    }
  ]) {
    const response = await handler({
      fetcher: async () => Response.json({ candidates: [candidate] })
    })(request());
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /No changes were made/);
  }
});
test('CORS, method checks, payload bounds and per-owner cooldown protect the endpoint', async () => {
  const run = handler({ corsHeaders: { 'Access-Control-Allow-Origin': '*' } });
  assert.equal(
    (await run(request(undefined, 'OPTIONS'))).headers.get('access-control-allow-origin'),
    '*'
  );
  assert.equal((await run(request(undefined, 'GET'))).status, 405);
  assert.equal((await run(request({ messages: [], context: {} }))).status, 400);
  assert.equal((await run(request({ checkConnection: true }))).status, 400);
  assert.equal((await run(request({ text: 'x'.repeat(160_001) }))).status, 413);
  for (let i = 0; i < 6; i++) assert.equal((await run(request())).status, 200);
  assert.equal((await run(request())).status, 429);
});
