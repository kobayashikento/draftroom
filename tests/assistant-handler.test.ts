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

test('expanded actions are negotiated so deployed older clients keep their existing action contract', async () => {
  for (const actionVersion of [undefined, 2]) {
    let instruction = '';
    const endpoint = handler({
      fetcher: async (_url, options) => {
        instruction = JSON.parse(String(options?.body)).systemInstruction.parts[0].text;
        return Response.json({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      reply: 'Ready to review',
                      actions: [{ type: 'delete_unposted_ideas' }]
                    })
                  }
                ]
              }
            }
          ]
        });
      }
    });
    const response = await endpoint(
      request({ ...payload(), ...(actionVersion ? { actionVersion } : {}) })
    );
    assert.equal(response.status, actionVersion === 2 ? 200 : 502);
    if (actionVersion === 2) {
      assert.deepEqual((await response.json()).actions, [{ type: 'delete_unposted_ideas' }]);
      assert.match(instruction, /The user completes Review changes/);
    } else assert.match(instruction, /browser supports only/);
  }
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
      assert.ok(body.generationConfig.maxOutputTokens >= 8192);
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

test('complete JSON replies in a single markdown fence retain strict action validation', async () => {
  for (const actions of [[], [{ type: 'delete_idea', itemId: 'x' }]]) {
    const response = await handler({
      fetcher: async () =>
        Response.json({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text:
                      '```json\n' +
                      JSON.stringify({ reply: 'These reels share a caption theme.', actions }) +
                      '\n```'
                  }
                ]
              }
            }
          ]
        })
    })(request());
    assert.equal(response.status, actions.length ? 502 : 200);
  }
});

test('complete prose analysis is a read-only reply while malformed structured replies are rejected', async () => {
  const cases: [string, number][] = [
    [
      'Your top Instagram reels share a specific caption theme. Lower-view posts use broader captions; try one more specific opening as an experiment.',
      200
    ],
    ['{"reply":"Partial JSON", "actions":[', 502],
    ['```json\n{"reply":"Broken", "actions":[\n```', 502],
    ['[{"type":"delete_idea"}]', 502],
    [JSON.stringify({ reply: 'Changed.', actions: [{ type: 'delete_idea', itemId: 'x' }] }), 502]
  ];
  for (const [text, status] of cases) {
    const response = await handler({
      fetcher: async () =>
        Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] })
    })(request());
    assert.equal(response.status, status);
    if (status === 200) assert.deepEqual(await response.json(), { reply: text, actions: [] });
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

const attachmentOwner = '00000000-0000-4000-8000-000000000001';
const attachmentId = '00000000-0000-4000-8000-000000000002';
const planningBytes = new TextEncoder().encode('%PDF-1.7 outside planning content');
const attachment = {
  id: attachmentId,
  name: 'My planning doc.pdf',
  size: planningBytes.length,
  mimeType: 'application/pdf',
  path: `${attachmentOwner}/${attachmentId}.pdf`
};
const googleFile = {
  name: 'files/planning-file',
  uri: 'https://generativelanguage.googleapis.com/v1beta/files/planning-file',
  state: 'ACTIVE'
};
const uploadUrl =
  'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=temporary';

test('owner files stream to Gemini and remain available in follow-ups beyond the recent messages', async () => {
  let loaded = 0;
  let generated = false;
  let deleted = false;
  const run = handler({
    authorize: async () => attachmentOwner,
    loadAttachment: async (_request, file) => {
      assert.deepEqual(file, attachment);
      loaded++;
      return new Response(planningBytes);
    },
    fetcher: async (url, options) => {
      if (String(url).endsWith('/upload/v1beta/files')) {
        const headers = new Headers(options?.headers);
        assert.equal(headers.get('x-goog-api-key'), 'TEST-KEY');
        assert.equal(
          headers.get('x-goog-upload-header-content-length'),
          String(planningBytes.length)
        );
        assert.equal(headers.get('x-goog-upload-header-content-type'), 'application/pdf');
        return new Response('', { headers: { 'x-goog-upload-url': uploadUrl } });
      }
      if (String(url) === uploadUrl) {
        assert.equal(new Headers(options?.headers).has('x-goog-api-key'), false);
        assert.deepEqual(
          new Uint8Array(await new Response(options?.body).arrayBuffer()),
          planningBytes
        );
        return Response.json({ file: googleFile });
      }
      if (options?.method === 'DELETE') {
        deleted = true;
        assert.equal(String(url), googleFile.uri);
        return new Response('{}');
      }
      const body = JSON.parse(String(options?.body));
      const parts = body.contents[0].parts;
      assert.ok(
        parts.some(
          (part: { fileData?: { fileUri: string; mimeType: string } }) =>
            part.fileData?.fileUri === googleFile.uri &&
            part.fileData.mimeType === 'application/pdf'
        )
      );
      assert.match(
        body.systemInstruction.parts[0].text,
        /file upload alone asks for understanding/
      );
      assert.equal(JSON.stringify(body).includes(attachment.path), false);
      generated = true;
      return success();
    }
  });
  const response = await run(request({ ...payload(), attachments: [attachment] }));
  assert.equal(response.status, 200);
  assert.equal(loaded, 1);
  assert.equal(generated, true);
  assert.equal(deleted, true);
  const followup = await run(
    request({
      ...payload(),
      messages: [{ role: 'user', text: 'What are the priorities from that PDF?' }],
      attachments: [attachment]
    })
  );
  assert.equal(followup.status, 200);
  assert.equal(loaded, 2);
});

test('forged paths, cross-owner attachments and oversized batches never load files or call Google', async () => {
  let called = false;
  const run = handler({
    authorize: async () => attachmentOwner,
    loadAttachment: async () => {
      called = true;
      return new Response(planningBytes);
    },
    fetcher: async () => {
      called = true;
      return success();
    }
  });
  for (const attachments of [
    [{ ...attachment, path: `00000000-0000-4000-8000-000000000099/${attachmentId}.pdf` }],
    [{ ...attachment, path: 'https://attacker.example/file.pdf' }],
    [{ ...attachment, size: 50_000_001 }],
    [attachment, attachment]
  ])
    assert.equal((await run(request({ ...payload(), attachments }))).status, 400);
  assert.equal(called, false);
});

test('Google files are removed after unusable replies and failed file processing', async () => {
  for (const state of ['ACTIVE', 'FAILED']) {
    let deleted = false;
    const response = await handler({
      authorize: async () => attachmentOwner,
      loadAttachment: async () => new Response(planningBytes),
      fetcher: async (url, options) => {
        if (String(url).endsWith('/upload/v1beta/files'))
          return new Response('', { headers: { 'x-goog-upload-url': uploadUrl } });
        if (String(url) === uploadUrl) {
          await new Response(options?.body).arrayBuffer();
          return Response.json({ file: { ...googleFile, state } });
        }
        if (options?.method === 'DELETE') {
          deleted = true;
          return new Response('{}');
        }
        return Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] });
      }
    })(request({ ...payload(), attachments: [attachment] }));
    assert.equal(response.status, 502);
    assert.equal(deleted, true);
    assert.equal(JSON.stringify(await response.json()).includes(uploadUrl), false);
  }
});
