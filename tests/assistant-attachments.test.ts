import test from 'node:test';
import assert from 'node:assert/strict';
import type { AssistantAttachment } from '../lib/types.ts';
import { seed } from '../lib/model.ts';
import { validateWorkspace } from '../lib/workspace-data.ts';
import { appendAssistantMessage, assistantAttachments } from '../lib/assistant-actions.ts';
import {
  planningFileRecord,
  planningFileType,
  resumableStorageEndpoint
} from '../lib/assistant-uploads.ts';
import {
  assistantMessageText,
  validatePlanningFiles
} from '../components/assistant/assistant.helpers.ts';
import { validateAttachments } from '../supabase/functions/_shared/assistant-attachments.ts';
import { checkedAttachmentStream } from '../supabase/functions/_shared/assistant-files.ts';

const owner = '00000000-0000-4000-8000-000000000001';
function planningAttachment(options: Partial<AssistantAttachment> = {}): AssistantAttachment {
  const id = crypto.randomUUID();
  return {
    id,
    name: 'Outside planning.pdf',
    mimeType: 'application/pdf',
    size: 24,
    path: `${owner}/${id}.pdf`,
    ...options
  };
}

test('planning attachments accept large PDF metadata but enforce ownership, types, sizes and batch limits', () => {
  const pdf = planningAttachment({ size: 50_000_000 });
  assert.deepEqual(validateAttachments([pdf], owner), [pdf]);
  const image = {
    ...pdf,
    mimeType: 'image/png',
    path: pdf.path.replace('.pdf', '.png'),
    size: 20_000_000
  };
  assert.deepEqual(validateAttachments([image]), [image]);
  for (const value of [
    [{ ...pdf, size: 50_000_001 }],
    [{ ...image, size: 20_000_001 }],
    [{ ...pdf, size: 0 }],
    [{ ...pdf, size: 1.5 }],
    [{ ...pdf, mimeType: 'text/html' }],
    [{ ...pdf, mimeType: 'constructor' }],
    [{ ...pdf, path: '../outside.pdf' }],
    [{ ...pdf, path: 'https://attacker.example/private.pdf' }],
    [{ ...pdf, path: `${owner}/${crypto.randomUUID()}.pdf` }],
    [{ ...pdf, base64: 'never store binary in workspace JSON' }],
    [pdf, pdf],
    [pdf, planningAttachment({ size: 1 })],
    Array.from({ length: 5 }, () => planningAttachment()),
    null
  ])
    assert.throws(() => validateAttachments(value));
  assert.throws(() => validateAttachments([pdf], crypto.randomUUID()));
});

test('file selection checks the same limits and preserves useful file-only requests', () => {
  const file = new File(['%PDF-1.7 planning content'], 'notes.pdf', { type: 'application/pdf' });
  assert.equal(planningFileType(file), 'application/pdf');
  assert.equal(planningFileType(new File(['%PDF-1.7'], 'notes.pdf')), 'application/pdf');
  assert.equal(planningFileType(new File(['html'], 'notes.pdf', { type: 'text/html' })), '');
  validatePlanningFiles([file], []);
  assert.throws(() => validatePlanningFiles([file], [planningAttachment({ size: 50_000_000 })]));
  assert.throws(() => planningFileRecord(new File(['html'], 'page.html'), owner));
  assert.match(assistantMessageText('', true), /summarize/);
  assert.equal(assistantMessageText('', false), '');
  assert.equal(assistantMessageText('  Make a plan  ', true), 'Make a plan');
  assert.equal(
    resumableStorageEndpoint('https://project.supabase.co'),
    'https://project.storage.supabase.co/storage/v1/upload/resumable'
  );
  assert.equal(
    resumableStorageEndpoint('http://127.0.0.1:54321'),
    'http://127.0.0.1:54321/storage/v1/upload/resumable'
  );
});

test('file references survive cloud serialization and message trimming without embedding document bytes', () => {
  const state = seed();
  const file = planningAttachment({ size: 50_000_000 });
  appendAssistantMessage(state, {
    id: 'file-turn',
    role: 'user',
    text: 'Review my plan.',
    createdAt: new Date().toISOString(),
    attachments: [file]
  });
  for (let index = 0; index < 65; index++)
    appendAssistantMessage(state, {
      id: `followup-${index}`,
      role: 'user',
      text: 'What next?',
      createdAt: new Date().toISOString()
    });
  const reloaded = validateWorkspace(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(assistantAttachments(reloaded), [file]);
  assert.equal(
    reloaded.assistant?.messages.some(message => message.id === 'file-turn'),
    false
  );
  assert.ok(JSON.stringify(reloaded.assistant).length < 20_000);
  assert.throws(() =>
    validateWorkspace({
      ...state,
      assistant: { ...state.assistant, attachments: [{ ...file, size: -1 }] }
    })
  );
  assert.throws(() =>
    validateWorkspace({
      ...state,
      assistant: {
        messages: [
          {
            id: 'invalid-file',
            role: 'user',
            text: 'A plan',
            createdAt: '',
            attachments: [{ ...file, path: '../../secret' }]
          }
        ]
      }
    })
  );
});

test('binary forwarding validates signatures and exact byte counts even across split chunks', async () => {
  const bytes = new TextEncoder().encode('%PDF-1.7 planning content');
  const file = planningAttachment({ size: bytes.length });
  const source = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      }
    })
  );
  assert.deepEqual(
    new Uint8Array(await new Response(checkedAttachmentStream(source, file)).arrayBuffer()),
    bytes
  );
  for (const invalid of [
    new Response('not a PDF or image at all'),
    new Response(bytes.slice(0, -1)),
    new Response(new Uint8Array(bytes.length + 1))
  ])
    await assert.rejects(new Response(checkedAttachmentStream(invalid, file)).arrayBuffer());
});

test('a 50 MB PDF forwards in bounded chunks without entering the JSON request body', async () => {
  const size = 50_000_000;
  let produced = 0;
  const source = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = new Uint8Array(Math.min(64 * 1024, size - produced));
        if (!produced) chunk.set(new TextEncoder().encode('%PDF-1.7 large planning document'));
        produced += chunk.length;
        controller.enqueue(chunk);
        if (produced === size) controller.close();
      }
    })
  );
  const reader = checkedAttachmentStream(source, planningAttachment({ size })).getReader();
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    assert.ok(value.length <= 64 * 1024);
    received += value.length;
  }
  assert.equal(received, size);
});
