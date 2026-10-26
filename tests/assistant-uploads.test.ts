import test from 'node:test';
import assert from 'node:assert/strict';
import type { HttpRequest, HttpResponse } from 'tus-js-client';
import { defaultOptions } from 'tus-js-client';
import { getSupabaseClient } from '../lib/supabase.ts';
import { uploadAssistantFiles } from '../lib/assistant-uploads.ts';

type SentUploadRequest = { method: string; authorization: string; size: number };

test('browser uploads send one refreshed bearer token per request, including subsequent chunks', async t => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://upload-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_upload_test';
  const previousOptions = { ...defaultOptions };
  t.after(() => {
    Object.assign(defaultOptions, previousOptions);
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  });
  const client = getSupabaseClient()!;
  t.after(() => client.auth.stopAutoRefresh());
  let sessionReads = 0;
  t.mock.method(client.auth, 'getSession', async () => ({
    data: {
      session: {
        user: { id: '00000000-0000-4000-8000-000000000001' },
        access_token: `fresh-token-${++sessionReads}`
      }
    },
    error: null
  }));
  // Failed batches perform a storage cleanup. Keep that request local as well.
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } })
  );
  defaultOptions.fileReader = {
    openFile: async (file: File) => ({
      size: file.size,
      slice: async (start: number, end: number) => ({
        value: file.slice(start, end),
        done: end >= file.size
      }),
      close: () => {}
    })
  };
  const sent: SentUploadRequest[] = [];
  let offset = 0;
  defaultOptions.httpStack = {
    getName: () => 'Browser append-header semantics',
    createRequest: (method, url): HttpRequest => {
      const headers = new Map<string, string>();
      return {
        getMethod: () => method,
        getURL: () => url,
        setHeader: (name, value) => {
          const key = name.toLowerCase();
          // XMLHttpRequest appends repeated header values, unlike Node's HTTP stack.
          headers.set(key, headers.has(key) ? `${headers.get(key)}, ${value}` : value);
        },
        getHeader: name => headers.get(name.toLowerCase()),
        setProgressHandler: () => {},
        getUnderlyingObject: () => ({}),
        abort: async () => {},
        send: async (body: Blob | null): Promise<HttpResponse> => {
          const authorization = headers.get('authorization') || '';
          const size = body?.size || 0;
          sent.push({ method, authorization, size });
          const authorized = /^Bearer fresh-token-\d+$/.test(authorization);
          if (method === 'POST') offset = 0;
          offset += size;
          return {
            getStatus: () => (authorized ? (method === 'POST' ? 201 : 204) : 403),
            getBody: () => (authorized ? '' : '{"error":"Unauthorized"}'),
            getHeader: name => {
              if (name.toLowerCase() === 'location')
                return 'https://upload-test.storage.supabase.co/storage/v1/upload/resumable/test';
              if (name.toLowerCase() === 'upload-offset') return String(offset);
              return undefined;
            },
            getUnderlyingObject: () => null
          };
        }
      };
    }
  };
  const jpeg = new Uint8Array([255, 216, 255, 224]);
  const files = [
    new File([jpeg], 'WhatsApp Image 2026-10-26 at 16.22.30.jpeg', { type: 'image/jpeg' }),
    new File([jpeg, new Uint8Array(6 * 1024 * 1024)], 'chunked.jpeg', { type: 'image/jpeg' })
  ];
  const records = await uploadAssistantFiles(files, [], new AbortController().signal, () => {});
  assert.equal(records.length, 2);
  assert.deepEqual(
    sent.map(request => request.method),
    ['POST', 'POST', 'PATCH']
  );
  assert.deepEqual(
    sent.map(request => request.authorization),
    ['Bearer fresh-token-2', 'Bearer fresh-token-3', 'Bearer fresh-token-4']
  );
  assert.deepEqual(
    sent.map(request => request.size),
    [4, 6 * 1024 * 1024, 4]
  );
});
