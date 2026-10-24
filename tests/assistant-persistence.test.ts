import type { TestContext } from 'node:test';
import type {
  AssistantMessage,
  CacheStorage,
  WorkspaceRepository,
  WorkspaceRow
} from '../lib/types.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../lib/model.ts';
import { WorkspaceSync } from '../lib/workspace-sync.ts';
import { WorkspaceConflictError } from '../lib/workspace-repository.ts';
import { readCache } from '../lib/workspace-data.ts';
import {
  appendAssistantMessage,
  applyAssistantTurn,
  assistantMessages,
  prepareAssistantTurn
} from '../lib/assistant-actions.ts';
import {
  clearAssistantConversation,
  conversationWithMessage,
  unansweredAssistantRequest
} from '../components/assistant/assistant.helpers.ts';
import { required, workspaceData } from './helpers.ts';

const message: AssistantMessage = {
  id: 'persistent-request',
  role: 'user',
  text: 'Add a task to film the opening.',
  createdAt: '2026-10-23T12:00:00.000Z',
  attachments: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      size: 128,
      path: '00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.pdf'
    }
  ]
};

function memoryStorage(): CacheStorage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

function fixture(t: TestContext) {
  const storage = memoryStorage();
  const remote = {
    row: { data: seed(), revision: 3 } as WorkspaceRow,
    attempts: 0,
    offline: false
  };
  const repository: WorkspaceRepository = {
    load: async () => structuredClone(remote.row),
    save: async (data, revision) => {
      remote.attempts++;
      if (remote.offline) throw new Error('Offline');
      if (revision !== remote.row.revision) throw new WorkspaceConflictError();
      remote.row = { data: structuredClone(data), revision: revision + 1 };
      return structuredClone(remote.row);
    }
  };
  function open(cache = storage) {
    const sync = new WorkspaceSync({
      repository,
      storage: cache,
      cacheKey: 'chat-owner',
      delay: 60_000,
      onChange: () => {}
    });
    t.after(() => sync.dispose());
    return sync;
  }
  return { storage, remote, repository, open };
}

test('chat saves start immediately and a fresh browser restores messages, files, receipts and tasks from the cloud', async t => {
  const { remote, open } = fixture(t);
  const sync = open();
  await sync.start(seed);
  const draft = structuredClone(workspaceData(sync));
  appendAssistantMessage(draft, message);
  sync.change(draft);
  assert.equal(remote.attempts, 1, 'Sending a message must not wait for the debounce timer');
  assert.equal(await sync.flush(), true);

  const response = structuredClone(workspaceData(sync));
  applyAssistantTurn(
    response,
    prepareAssistantTurn(response, message.id, {
      reply: 'Added your filming task.',
      actions: [
        {
          type: 'create_task',
          itemId: response.items[0].id,
          title: 'Film the opening',
          category: 'film',
          due: '',
          priority: 'High'
        }
      ]
    })
  );
  sync.change(response);
  assert.equal(remote.attempts, 2, 'Replies must also save immediately');
  assert.equal(await sync.flush(), true);
  sync.dispose();

  const reloaded = open(memoryStorage());
  await reloaded.start(() => {
    throw new Error('Saved chat must not be replaced by initial data');
  });
  assert.deepEqual(workspaceData(reloaded), response);
  assert.equal(assistantMessages(workspaceData(reloaded)).length, 2);
  assert.equal(unansweredAssistantRequest(workspaceData(reloaded)), null);
});

test('refresh during a message save restores the recovery copy and offers the same request for retry', async t => {
  const { repository, storage, open } = fixture(t);
  const sync = open();
  await sync.start(seed);
  const originalSave = repository.save;
  let interrupt: (error: Error) => void = () => {
    throw new Error('Save did not start');
  };
  repository.save = () =>
    new Promise((_resolve, reject) => {
      interrupt = reject;
    });
  const draft = structuredClone(workspaceData(sync));
  appendAssistantMessage(draft, message);
  sync.change(draft);
  const saving = required(sync.saving);
  assert.deepEqual(required(readCache(storage, 'chat-owner')).data.assistant, draft.assistant);
  sync.dispose();
  interrupt(new Error('Browser refreshed'));
  await saving;
  repository.save = originalSave;

  const reloaded = open();
  await reloaded.start(seed);
  const restored = workspaceData(reloaded);
  assert.deepEqual(restored.assistant, draft.assistant);
  const retry = required(unansweredAssistantRequest(restored));
  assert.deepEqual(retry, { id: message.id, text: message.text });
  assert.deepEqual(conversationWithMessage(restored, { ...message, ...retry }), [message]);
  assert.equal(await reloaded.flush(), true);
  assert.equal(reloaded.conflict, null);
});

test('a failed reply save survives refresh and returns to cloud sync without losing the response', async t => {
  const { remote, open } = fixture(t);
  const sync = open();
  await sync.start(seed);
  const draft = structuredClone(workspaceData(sync));
  appendAssistantMessage(draft, message);
  applyAssistantTurn(
    draft,
    prepareAssistantTurn(draft, message.id, {
      reply: 'Keep your opening short and clear.',
      actions: []
    })
  );
  remote.offline = true;
  sync.change(draft);
  assert.equal(await sync.flush(), false);
  assert.equal(sync.status, 'error');
  sync.dispose();
  remote.offline = false;

  const reloaded = open();
  await reloaded.start(seed);
  assert.deepEqual(workspaceData(reloaded).assistant, draft.assistant);
  assert.equal(await reloaded.flush(), true);
  assert.deepEqual(workspaceData(remote.row).assistant, draft.assistant);
  assert.equal(unansweredAssistantRequest(workspaceData(reloaded)), null);
});

test('only starting a new chat clears its saved history and preserves workspace tasks', async t => {
  const { remote, open } = fixture(t);
  const sync = open();
  await sync.start(seed);
  const draft = structuredClone(workspaceData(sync));
  appendAssistantMessage(draft, message);
  sync.change(draft);
  await sync.flush();

  const cleared = structuredClone(workspaceData(sync));
  clearAssistantConversation(cleared);
  sync.change(cleared);
  assert.equal(remote.attempts, 2);
  assert.equal(await sync.flush(), true);
  const reloaded = open(memoryStorage());
  await reloaded.start(seed);
  assert.deepEqual(workspaceData(reloaded).assistant, { messages: [] });
  assert.deepEqual(workspaceData(reloaded).items, draft.items);
  assert.equal(unansweredAssistantRequest(workspaceData(reloaded)), null);
});
