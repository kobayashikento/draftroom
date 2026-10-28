import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seed, createItem } from '../lib/model.ts';
import { validateWorkspace } from '../lib/workspace-data.ts';
import { prepareAssistantTurn, applyAssistantTurn } from '../lib/assistant-actions.ts';
import { assistantConversationId } from '../lib/assistant-conversations.ts';
import { assistantRequestBody } from '../lib/assistant-client.helpers.ts';
import { validateContext } from '../supabase/functions/_shared/assistant-context.ts';
import { validateReply } from '../supabase/functions/_shared/assistant-protocol.ts';
import {
  validateCreativeBrief,
  CREATIVE_REFERENCES
} from '../supabase/functions/_shared/creative-brief.ts';
import {
  saveAssistantBrief,
  assistantBriefItem
} from '../components/assistant/assistant-brief.helpers.ts';
import { creativeReferenceImage } from '../components/creative/creative-reference.helpers.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { geminiRequest } from '../supabase/functions/_shared/assistant-prompt.ts';
import { matchaBrief, comfortsBrief } from './fixtures/creative-brief.ts';

test('creative replies require complete shot directions, copy and real reference IDs', () => {
  assert.deepEqual(
    validateReply({
      reply: 'Two ideas to make this week.',
      actions: [],
      briefs: [matchaBrief, comfortsBrief]
    }).briefs,
    [matchaBrief, comfortsBrief]
  );
  for (const broken of [
    { ...matchaBrief, hook: '' },
    { ...matchaBrief, caption: '' },
    { ...matchaBrief, steps: [] },
    {
      ...matchaBrief,
      steps: [{ ...matchaBrief.steps[0], direction: '' }, ...matchaBrief.steps.slice(1)]
    },
    { ...matchaBrief, reference: 'https://invented.example/matcha.jpg' },
    { ...matchaBrief, reference: 'javascript:alert(1)' }
  ])
    assert.throws(() => validateCreativeBrief(broken));
  assert.equal(
    validateCreativeBrief({ ...matchaBrief, reference: 'media:saved-post' }).reference,
    'media:saved-post'
  );
  assert.deepEqual(validateReply({ reply: 'A direct answer.', actions: [] }), {
    reply: 'A direct answer.',
    actions: []
  });
});

test('AI creation saves filmable directions and caption to the actual idea, with navigable receipts', () => {
  const state = seed();
  const turn = prepareAssistantTurn(state, 'creative-create', {
    reply: 'Here is the complete plan.',
    actions: [
      {
        type: 'create_idea',
        title: matchaBrief.title,
        format: matchaBrief.format,
        seriesId: 'matcha',
        tasks: [],
        brief: matchaBrief
      }
    ]
  });
  applyAssistantTurn(state, turn);
  const item = state.items.at(-1)!;
  assert.equal(item.hook, matchaBrief.hook);
  assert.equal(item.storyboard.length, 3);
  assert.match(item.storyboard[1].notes, /2–6s\nLower your phone/);
  assert.equal(item.storyboard[1].reference, 'matcha-pour');
  assert.equal(item.storyboard[0].reference, '');
  assert.equal(item.storyboard[0].overlay, matchaBrief.hook);
  assert.match(item.notes, /Goal: Relatability/);
  assert.equal(item.publications[0].caption, matchaBrief.caption);
  const message = state.assistant!.messages.at(-1)!;
  assert.deepEqual(message.briefs, [matchaBrief]);
  assert.equal(assistantBriefItem(state, message, 0)?.id, item.id);
  assert.match(message.receipts![0].href!, /tab=Storyboard/);
  assert.doesNotThrow(() => validateWorkspace(JSON.parse(JSON.stringify(state))));
});

test('brainstorming creates no workspace records until Save idea, and saving survives reload without duplicates', () => {
  const state = seed();
  const original = structuredClone(state.items);
  applyAssistantTurn(
    state,
    prepareAssistantTurn(state, 'suggestions', {
      reply: 'Try this carousel.',
      actions: [],
      briefs: [comfortsBrief]
    })
  );
  assert.deepEqual(state.items, original);
  const conversationId = assistantConversationId(state);
  saveAssistantBrief(state, conversationId, 'suggestions-reply', 0);
  assert.equal(state.items.length, original.length + 1);
  const restored = validateWorkspace(JSON.parse(JSON.stringify(state)));
  saveAssistantBrief(restored, conversationId, 'suggestions-reply', 0);
  assert.equal(restored.items.length, state.items.length);
  assert.equal(restored.items.at(-1)!.storyboard.length, 5);
  const body = assistantRequestBody(restored, restored.assistant!.messages);
  assert.equal(body.actionVersion, 3);
  assert.deepEqual(validateContext(body.context).creativeBriefs, [comfortsBrief]);
  assert.throws(() => saveAssistantBrief(restored, 'missing-chat', 'suggestions-reply', 0));
});

test('rewriting a creative plan preserves tasks, schedule, workflow and published captions', () => {
  const state = seed();
  const item = createItem(state, { title: 'Keep this title', format: 'Reel' });
  state.items.push(item);
  item.publications[0].state = 'manually_posted';
  item.publications[0].caption = 'Caption already published';
  item.publications[1].date = '2026-11-01';
  item.cadence = 'Monthly';
  const tasks = structuredClone(item.tasks);
  applyAssistantTurn(
    state,
    prepareAssistantTurn(state, 'rewrite', {
      reply: 'Here is a specific shooting plan.',
      actions: [{ type: 'write_creative_brief', itemId: item.id, brief: matchaBrief }]
    })
  );
  const updated = state.items.at(-1)!;
  assert.equal(updated.title, 'Keep this title');
  assert.equal(updated.stageId, item.stageId);
  assert.equal(updated.cadence, 'Monthly');
  assert.deepEqual(updated.tasks, tasks);
  assert.equal(updated.publications[0].caption, 'Caption already published');
  assert.equal(updated.publications[1].date, '2026-11-01');
  assert.equal(updated.publications[1].caption, matchaBrief.caption);
  assert.equal(assistantBriefItem(state, state.assistant!.messages.at(-1)!, 0)?.id, item.id);
  const before = structuredClone(state.items);
  applyAssistantTurn(
    state,
    prepareAssistantTurn(state, 'wrong-format', {
      reply: 'Different format.',
      actions: [{ type: 'write_creative_brief', itemId: item.id, brief: comfortsBrief }]
    })
  );
  assert.deepEqual(state.items, before);
  assert.match(state.assistant!.messages.at(-1)!.text, /must match/);
});

test('brief links use saved record IDs even when multiple ideas reuse the same hook or get renamed', () => {
  const state = seed();
  applyAssistantTurn(
    state,
    prepareAssistantTurn(state, 'two-plans', {
      reply: 'Two episodes with a recurring hook.',
      actions: [
        {
          type: 'create_idea',
          title: 'First episode',
          format: 'Reel',
          seriesId: '',
          tasks: [],
          brief: { ...matchaBrief, title: 'First episode' }
        },
        {
          type: 'create_idea',
          title: 'Second episode',
          format: 'Reel',
          seriesId: '',
          tasks: [],
          brief: { ...matchaBrief, title: 'Second episode' }
        }
      ]
    })
  );
  const message = state.assistant!.messages.at(-1)!;
  const first = assistantBriefItem(state, message, 0)!;
  const second = assistantBriefItem(state, message, 1)!;
  assert.notEqual(first.id, second.id);
  second.title = 'A new working title';
  second.hook = 'A revised hook';
  const restored = validateWorkspace(JSON.parse(JSON.stringify(state)));
  assert.equal(
    assistantBriefItem(restored, restored.assistant!.messages.at(-1)!, 1)?.id,
    second.id
  );
});

test('visual references resolve only saved media, real bundled images or safe user links', () => {
  for (const image of CREATIVE_REFERENCES) {
    assert.ok(readFileSync(new URL(`../public${image.src}`, import.meta.url)).length > 1000);
    assert.equal(creativeReferenceImage(image.id, [])?.label, 'AI-generated inspiration');
  }
  const post = {
    ...newMediaRecord('owner', { title: 'Saved matcha reel', source: 'api' }),
    id: 'saved-post',
    thumbnail_url: 'https://cdn.example/real.jpg',
    platform: 'Instagram' as const
  };
  assert.equal(creativeReferenceImage('media:saved-post', [post])?.src, post.thumbnail_url);
  assert.match(creativeReferenceImage('media:saved-post', [post])!.href, /post=saved-post/);
  assert.equal(creativeReferenceImage('media:invented', [post]), null);
  assert.equal(creativeReferenceImage('javascript:alert(1)', []), null);
  assert.equal(creativeReferenceImage('data:image/svg+xml,anything', []), null);
});

test('creative instructions are available only to compatible clients', () => {
  const context = assistantRequestBody(seed(), [
    { id: 'user', role: 'user', text: 'Plan a matcha reel', createdAt: '' }
  ]).context;
  const current = geminiRequest(context, [{ role: 'user', text: 'Plan a matcha reel' }]);
  assert.match(current.systemInstruction.parts[0].text, /camera placement\/framing/);
  assert.match(current.systemInstruction.parts[0].text, /exact ready-to-use hook/);
  assert.match(current.systemInstruction.parts[0].text, /matcha-pour/);
  const older = geminiRequest(
    context,
    [{ role: 'user', text: 'Plan a matcha reel' }],
    [],
    true,
    false
  );
  const olderSchema = older.systemInstruction.parts[0].text.split(
    'The current schema is authoritative'
  )[1];
  assert.doesNotMatch(olderSchema, /write_creative_brief|"briefs"|"brief"/);
});
