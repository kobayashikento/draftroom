import test from 'node:test';
import assert from 'node:assert/strict';
import type { AssistantMessage } from '../lib/types.ts';
import { seed } from '../lib/model.ts';
import { validateWorkspace } from '../lib/workspace-data.ts';
import {
  assistantConversationId,
  selectAssistantConversation,
  startAssistantConversation
} from '../lib/assistant-conversations.ts';
import {
  appendAssistantMessage,
  applyAssistantTurn,
  assistantAttachments,
  assistantMessages,
  prepareAssistantTurn
} from '../lib/assistant-actions.ts';
import {
  assistantConversationList,
  assistantMessageText,
  unansweredAssistantRequest
} from '../components/assistant/assistant.helpers.ts';

const first: AssistantMessage = {
  id: 'first-message',
  role: 'user',
  text: 'What do my best reels have in common?',
  createdAt: '2026-10-24T12:00:00.000Z',
  attachments: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'WhatsApp Image 2026-10-26 at 16.22.30.jpeg',
      size: 120,
      mimeType: 'image/jpeg',
      path: '00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.jpg'
    }
  ]
};

test('legacy chat history migrates without losing messages, attachments or tasks when a new chat starts', () => {
  const state = seed();
  const tasks = structuredClone(state.items);
  appendAssistantMessage(state, first);
  const oldId = assistantConversationId(state);
  startAssistantConversation(state, 'second', '2026-10-26T12:00:00.000Z');
  assert.deepEqual(assistantMessages(state), []);
  assert.deepEqual(assistantAttachments(state), []);
  assert.equal(unansweredAssistantRequest(state), null);
  assert.deepEqual(state.assistant?.conversations?.[0].messages, [first]);
  assert.deepEqual(state.assistant?.conversations?.[0].attachments, first.attachments);
  assert.deepEqual(state.items, tasks);
  const restored = validateWorkspace(JSON.parse(JSON.stringify(state)));
  selectAssistantConversation(restored, oldId);
  assert.deepEqual(assistantMessages(restored), [first]);
  assert.deepEqual(assistantAttachments(restored), first.attachments);
  assert.equal(
    restored.assistant?.conversations?.length,
    0,
    'Unused empty chats do not accumulate'
  );
  assert.deepEqual(restored.items, tasks);
});

test('switching conversations restores only the selected context and retains replies and retries independently', () => {
  const state = seed();
  appendAssistantMessage(state, first);
  const firstId = assistantConversationId(state);
  startAssistantConversation(state, 'second');
  const second = { ...first, id: 'second-message', text: 'Plan next week', attachments: undefined };
  appendAssistantMessage(state, second);
  selectAssistantConversation(state, firstId);
  assert.deepEqual(assistantMessages(state), [first]);
  assert.deepEqual(unansweredAssistantRequest(state), { id: first.id, text: first.text });
  appendAssistantMessage(state, {
    ...first,
    id: 'first-reply',
    role: 'assistant',
    text: 'A useful pattern.',
    attachments: undefined
  });
  assert.equal(unansweredAssistantRequest(state), null);
  selectAssistantConversation(state, 'second');
  assert.deepEqual(assistantMessages(state), [second]);
  assert.deepEqual(assistantAttachments(state), []);
  assert.deepEqual(unansweredAssistantRequest(state), { id: second.id, text: second.text });
  const unchanged = structuredClone(state);
  selectAssistantConversation(state, 'missing');
  assert.deepEqual(state, unchanged);
  selectAssistantConversation(state, 'second');
  assert.deepEqual(state, unchanged);
});

test('a delayed response targets its original conversation and applies workspace actions exactly once', () => {
  const state = seed();
  appendAssistantMessage(state, first);
  const original = assistantConversationId(state);
  const turn = prepareAssistantTurn(state, first.id, {
    reply: 'Added the opening shot.',
    actions: [
      {
        type: 'create_task',
        itemId: state.items[0].id,
        title: 'Film opening shot',
        category: 'film',
        due: '',
        priority: 'High'
      }
    ]
  });
  startAssistantConversation(state, 'second');
  applyAssistantTurn(state, turn, original);
  applyAssistantTurn(state, turn, original);
  assert.deepEqual(assistantMessages(state), []);
  assert.equal(state.assistant?.conversations?.[0].messages.length, 2);
  assert.equal(state.items[0].tasks.filter(task => task.title === 'Film opening shot').length, 1);
  const before = structuredClone(state);
  assert.throws(() => applyAssistantTurn(state, turn, 'missing'));
  assert.deepEqual(state, before);
});

test('conversation list uses first-message titles, file-only names, recency and a single empty conversation', () => {
  const state = seed();
  appendAssistantMessage(state, { ...first, text: assistantMessageText('', true) });
  startAssistantConversation(state, 'new', '2026-10-26T12:00:00.000Z');
  startAssistantConversation(state, 'another-empty');
  assert.equal(assistantConversationId(state), 'new');
  let list = assistantConversationList(state);
  assert.equal(list.length, 2);
  assert.equal(list[0].title, 'New conversation');
  assert.equal(list[1].title, first.attachments![0].name);
  appendAssistantMessage(state, {
    ...first,
    id: 'new-question',
    text: '   Plan\n a week   ',
    createdAt: '2026-10-26T12:00:00.000Z',
    attachments: undefined
  });
  list = assistantConversationList(state);
  assert.equal(list[0].title, 'Plan a week');
  assert.equal(list[0].messageCount, 1);
});

test('archive validation rejects corrupt messages, duplicate conversation IDs and invalid file paths', () => {
  const state = seed();
  appendAssistantMessage(state, first);
  startAssistantConversation(state, 'second');
  assert.doesNotThrow(() => validateWorkspace(state));
  for (const mutate of [
    (draft: typeof state) => {
      draft.assistant!.conversations![0].id = 'second';
    },
    (draft: typeof state) => {
      draft.assistant!.conversations!.push(structuredClone(draft.assistant!.conversations![0]));
    },
    (draft: typeof state) => {
      draft.assistant!.conversations![0].messages.push(first);
    },
    (draft: typeof state) => {
      draft.assistant!.conversations![0].attachments![0].path = '../../private';
    },
    (draft: typeof state) => {
      draft.assistant!.conversations![0].messages[0].text = 'a'.repeat(6001);
    }
  ]) {
    const malformed = structuredClone(state);
    mutate(malformed);
    assert.throws(() => validateWorkspace(malformed));
  }
});
