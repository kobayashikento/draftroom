import test from 'node:test';
import assert from 'node:assert/strict';
import type { AssistantAction } from '../supabase/functions/_shared/types.ts';
import type { MediaRecord } from '../supabase/functions/_shared/social-types.ts';
import type { Workspace } from '../lib/types.ts';
import { seed, createItem } from '../lib/model.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { validateReply } from '../supabase/functions/_shared/assistant-protocol.ts';
import {
  assistantContext,
  validateContext
} from '../supabase/functions/_shared/assistant-context.ts';
import { validateWorkspace } from '../lib/workspace-data.ts';
import {
  applyAssistantTurn,
  prepareAssistantTurn,
  confirmAssistantProposal,
  cancelAssistantProposal,
  previewAssistantTurn
} from '../lib/assistant-actions.ts';
import { assistantIdeaPosted } from '../lib/assistant-workspace-actions.ts';
import { assistantActionReview } from '../components/assistant/assistant-actions.helpers.ts';
import { assistantConversationId } from '../lib/assistant-conversations.ts';
import { assistantRequestBody } from '../lib/assistant-client.helpers.ts';

function apply(
  state: Workspace,
  actions: AssistantAction[],
  id = crypto.randomUUID(),
  media: MediaRecord[] = []
) {
  const turn = prepareAssistantTurn(
    state,
    id,
    { reply: 'Here are your requested changes.', actions },
    media
  );
  applyAssistantTurn(state, turn, undefined, { media });
  return state.assistant!.messages.at(-1)!;
}

test('unposted cleanup is a frozen review list that protects posted stages, manual posts, linked posts and saved references', () => {
  const state = seed();
  state.items[0].stageId = 'posted';
  state.items[1].publications[0].state = 'manually_posted';
  state.items[2].publications[0].url = 'https://www.instagram.com/reel/KNOWNPOST/';
  const linked = createItem(state, { title: 'Already posted, unfinished checklist' });
  state.items.push(linked);
  const media: MediaRecord[] = [
    {
      ...newMediaRecord('owner', { title: linked.title, source: 'api', linkedItemId: linked.id }),
      id: 'synced-post',
      platform: 'TikTok',
      published_at: '2026-10-27T12:00:00Z',
      archived_at: '2026-10-28T12:00:00Z'
    }
  ];
  assert.equal(assistantIdeaPosted(state, linked, media), true);
  const before = structuredClone(state.items);
  const message = apply(state, [{ type: 'delete_unposted_ideas' }], 'cleanup', media);
  assert.deepEqual(state.items, before);
  assert.equal(message.proposal?.status, 'pending');
  assert.equal(message.proposal.labels.length, 1);
  assert.match(message.text, /Nothing has been removed/);
  const restored = validateWorkspace(JSON.parse(JSON.stringify(state)));
  const fresh = createItem(restored, { title: 'Draft created after the review' });
  restored.items.push(fresh);
  confirmAssistantProposal(restored, message.id, undefined, { media });
  assert.equal(restored.assistant!.messages.at(-1)!.proposal!.status, 'applied');
  assert.deepEqual(
    restored.items.map(item => item.id),
    [...before.filter(item => item.id !== before[3].id).map(item => item.id), fresh.id]
  );
  assert.deepEqual(
    restored.items.find(item => item.id === linked.id),
    linked
  );
  assert.equal(validateWorkspace(restored), restored);
});

test('removal cancellation and stale posted status preserve original work and survive conversation reloads', () => {
  const state = seed();
  const original = structuredClone(state.items);
  const message = apply(state, [
    { type: 'delete_ideas', itemIds: [state.items[0].id, state.items[1].id], onlyUnposted: true }
  ]);
  state.items[1].publications[1].state = 'manually_posted';
  const before = structuredClone(state.items);
  assert.throws(() => confirmAssistantProposal(state, message.id), /now posted/);
  assert.deepEqual(state.items, before);
  const review = assistantActionReview(state, [], {
    messageId: message.id,
    conversationId: assistantConversationId(state)
  });
  assert.match(review!.error, /now posted/);
  cancelAssistantProposal(state, message.id);
  assert.equal(message.proposal!.status, 'cancelled');
  assert.equal(state.items.length, original.length);
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(state))).items, before);
});

test('bulk cleanup handles more than ten ideas without dropping targets or erasing new drafts', () => {
  const state = seed();
  for (let index = 0; index < 35; index++)
    state.items.push(createItem(state, { title: `Draft ${index}` }));
  const count = state.items.length;
  const message = apply(state, [{ type: 'delete_unposted_ideas' }]);
  assert.equal(message.proposal!.labels.length, count);
  assert.equal(state.items.length, count);
  confirmAssistantProposal(state, message.id);
  assert.equal(state.items.length, 0);
  assert.equal(message.receipts!.length, count);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('partial idea edits and richer creation preserve unrelated data and use valid linked receipts', () => {
  const state = seed();
  const item = state.items[0];
  item.notes = 'Keep these notes';
  const publications = structuredClone(item.publications);
  apply(state, [
    {
      type: 'update_idea',
      itemId: item.id,
      changes: { title: 'A fresh title', seriesId: 'matcha', stageId: 'ready', priority: 'High' }
    }
  ]);
  assert.equal(state.items[0].notes, 'Keep these notes');
  assert.equal(
    state.items[0].cadence,
    state.series.find(series => series.id === 'matcha')!.cadence
  );
  assert.deepEqual(state.items[0].publications, publications);
  const message = apply(
    state,
    [
      {
        type: 'create_idea',
        title: 'A complete new idea',
        format: 'Reel',
        seriesId: '',
        tasks: [],
        changes: { hook: 'A focused opening', notes: 'Keep this plan', tags: 'cozy' },
        storyboard: [{ title: 'Open the window', overlay: 'Slow morning' }],
        publications: [
          { platform: 'Instagram', changes: { date: '2026-11-02', caption: 'A little light.' } }
        ]
      }
    ],
    'complete-idea'
  );
  const created = state.items.at(-1)!;
  assert.equal(created.hook, 'A focused opening');
  assert.equal(created.storyboard.length, 1);
  assert.equal(created.storyboard[0].overlay, 'Slow morning');
  assert.equal(created.publications[0].date, '2026-11-02');
  assert.equal(created.publications[1].date, '');
  assert.match(message.receipts![0].href!, /idea=assistant-complete-idea-0/);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('task edits can reopen and unprioritize; storyboard edits and ordering retain stable IDs', () => {
  const state = seed();
  const item = state.items[0];
  const task = item.tasks[0];
  task.done = true;
  task.priority = 'High';
  const entry = item.storyboard[0];
  const order = item.storyboard.map(entry => entry.id).reverse();
  apply(state, [
    {
      type: 'update_task',
      itemId: item.id,
      taskId: task.id,
      changes: { done: false, priority: 'Normal', due: '2026-11-04', title: 'Film the window' }
    },
    {
      type: 'update_storyboard_entry',
      itemId: item.id,
      entryId: entry.id,
      changes: { overlay: 'Slow down', reference: 'Window light', done: true }
    },
    { type: 'reorder', target: 'storyboard', itemId: item.id, ids: order }
  ]);
  assert.deepEqual(state.items[0].tasks[0], {
    ...task,
    title: 'Film the window',
    due: '2026-11-04',
    priority: 'Normal',
    done: false
  });
  assert.deepEqual(
    state.items[0].storyboard.map(entry => entry.id),
    order
  );
  assert.equal(state.items[0].storyboard.at(-1)!.overlay, 'Slow down');
  assert.equal(state.items[0].storyboard.at(-1)!.done, true);
  const before = structuredClone(state.items);
  const failure = apply(state, [
    { type: 'update_idea', itemId: item.id, changes: { title: 'Should roll back' } },
    { type: 'reorder', target: 'tasks', itemId: item.id, ids: [task.id] }
  ]);
  assert.match(failure.text, /No changes were made/);
  assert.deepEqual(state.items, before);
});

test('publication planning keeps platform boundaries and posted-date locks; explicit undo and reschedule work together', () => {
  const state = seed();
  const item = state.items[0];
  const other = structuredClone(item.publications[1]);
  apply(state, [
    {
      type: 'update_publication',
      itemId: item.id,
      platform: 'Instagram',
      changes: { date: '2026-11-05', caption: 'New final caption', posted: true }
    }
  ]);
  assert.equal(state.items[0].publications[0].state, 'manually_posted');
  assert.deepEqual(state.items[0].publications[1], other);
  const locked = apply(state, [
    {
      type: 'update_publication',
      itemId: item.id,
      platform: 'Instagram',
      changes: { date: '2026-11-06' }
    }
  ]);
  assert.match(locked.text, /Undo posted status/);
  apply(state, [
    {
      type: 'update_publication',
      itemId: item.id,
      platform: 'Instagram',
      changes: { posted: false, date: '2026-11-06' }
    }
  ]);
  assert.equal(state.items[0].publications[0].state, 'planned');
  assert.equal(state.items[0].publications[0].date, '2026-11-06');
  assert.equal(state.items[0].publications[0].caption, 'New final caption');
});

test('copying an idea preserves creative work while resetting completion, IDs and publication references', () => {
  const state = seed();
  const original = state.items[0];
  original.hook = 'An opening';
  original.publications[0].state = 'manually_posted';
  original.publications[0].url = 'https://www.instagram.com/reel/KNOWNPOST/';
  apply(state, [{ type: 'duplicate_idea', itemId: original.id, title: 'Another episode' }], 'copy');
  const copy = state.items.at(-1)!;
  assert.equal(copy.hook, original.hook);
  assert.notEqual(copy.id, original.id);
  assert.equal(
    copy.tasks.every(task => !task.done && !task.due),
    true
  );
  assert.equal(
    copy.publications.every(
      pub => pub.state === 'planned' && !pub.date && !pub.url && !pub.postId && !pub.linkedPost
    ),
    true
  );
  assert.equal(
    copy.storyboard.every(entry => !entry.done),
    true
  );
  assert.equal(state.items[0].publications[0].state, 'manually_posted');
});

test('calendar operations follow recurring occurrence semantics and avoid storing action metadata', () => {
  const state = seed();
  apply(
    state,
    [
      { type: 'create_calendar_task', title: 'Batch filming', date: '2026-10-28', repeat: 'weekly' }
    ],
    'routine'
  );
  const id = state.calendarTasks![0].id;
  assert.equal(Object.hasOwn(state.calendarTasks![0], 'type'), false);
  apply(state, [
    { type: 'move_calendar_task', id, scheduledDate: '2026-11-04', date: '2026-11-05' },
    { type: 'complete_calendar_task', id, date: '2026-11-04', done: true }
  ]);
  assert.deepEqual(state.calendarTasks![0].movedDates, { '2026-11-04': '2026-11-05' });
  assert.deepEqual(state.calendarTasks![0].completedDates, ['2026-11-04']);
  assert.equal(state.calendarTasks![0].date, '2026-10-28');
  apply(state, [
    { type: 'update_calendar_task', id, changes: { date: '2026-10-29', repeat: 'none' } }
  ]);
  assert.equal(state.calendarTasks![0].movedDates, undefined);
  assert.deepEqual(state.calendarTasks![0].completedDates, []);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('series and stages can be managed without deleting episodes or rewriting existing templates', () => {
  const state = seed();
  const original = structuredClone(state.items[0].storyboard);
  apply(
    state,
    [
      {
        type: 'update_series',
        id: 'emi',
        changes: { name: 'Emi episodes', storyboard: ['New template'] }
      },
      { type: 'create_stage', name: 'Ready to film', kind: 'prep' },
      {
        type: 'create_series',
        name: 'New series',
        description: 'A format',
        format: 'Reel',
        cadence: 'Weekly',
        storyboard: ['Opening'],
        tasks: ['Film']
      }
    ],
    'templates'
  );
  assert.deepEqual(state.items[0].storyboard, original);
  assert.equal(state.stages.at(-1)!.name, 'Ready to film');
  assert.equal(Object.hasOwn(state.series.at(-1)!, 'type'), false);
  const proposal = apply(state, [
    { type: 'delete_series', id: 'emi' },
    { type: 'delete_stage', id: 'editing' }
  ]);
  assert.equal(state.items[0].seriesId, 'emi');
  confirmAssistantProposal(state, proposal.id);
  assert.equal(state.items[0].seriesId, '');
  assert.equal(state.items[0].stageId, state.stages[0].id);
  assert.deepEqual(state.items[0].storyboard, original);
  assert.doesNotThrow(() => validateWorkspace(state));
});

test('expanded contracts reject arbitrary patches, unknown operations and malformed fields', () => {
  for (const action of [
    { type: 'update_idea', itemId: 'x', changes: { id: 'overwrite' } },
    { type: 'update_task', itemId: 'x', taskId: 't', changes: {} },
    {
      type: 'update_publication',
      itemId: 'x',
      platform: 'Instagram',
      changes: { date: '2026-02-30' }
    },
    { type: 'create_stage', name: 'Invalid', kind: 'published' },
    { type: 'publish_to_instagram', itemId: 'x' },
    { type: 'update_idea', itemId: 'x', changes: { priority: 'Urgent' } },
    { type: 'delete_idea', itemId: 'x', secretOverride: true }
  ])
    assert.throws(() => validateReply({ reply: 'A plan', actions: [action] }));
  const state = seed();
  const turn = prepareAssistantTurn(state, 'bad-nav', {
    reply: 'Open',
    actions: [{ type: 'navigate', href: 'javascript:alert(1)' }]
  });
  assert.throws(() => previewAssistantTurn(state, turn));
});

test('creative context supplies referenced content and structural IDs while unrelated notes stay out', () => {
  const state = seed();
  state.items[0].notes = 'Notes for Emi';
  state.items[1].notes = 'Unrelated private notes';
  state.calendarTasks = [
    {
      id: 'routine',
      title: 'Film',
      date: '2026-10-28',
      repeat: 'weekly',
      completedDates: [],
      movedDates: { '2026-11-04': '2026-11-05' }
    }
  ];
  const context = assistantContext(state, '2026-10-28', 'America/Toronto', {
    query: 'Edit the notes for The many personalities of Emi'
  });
  assert.equal(context.details![0].notes, 'Notes for Emi');
  assert.equal(JSON.stringify(context).includes('Unrelated private notes'), false);
  assert.equal(context.items[0].storyboard![0].id, state.items[0].storyboard[0].id);
  assert.deepEqual(validateContext(context).calendarTasks, context.calendarTasks);
  assert.deepEqual(validateContext(context).details, context.details);
  assert.throws(() =>
    validateContext({ ...context, details: [{ itemId: 'x', notes: 'incomplete' }] })
  );
});

test('referenced ideas beyond the summary cap stay actionable and oversized Unicode requests fit the transport limit', () => {
  const state = seed();
  for (let index = 0; index < 170; index++)
    state.items.push(createItem(state, { title: `Draft number ${index}` }));
  const target = state.items.at(-1)!;
  target.title = 'A very specific window story';
  target.notes = '窓'.repeat(8000);
  target.publications[0].caption = '朝'.repeat(4000);
  const focused = assistantContext(state, '2026-10-28', 'America/Toronto', {
    query: 'Edit the notes for A very specific window story'
  });
  assert.equal(focused.items[0].id, target.id);
  assert.equal(focused.partial, true);
  const messages = Array.from({ length: 16 }, (_, index) => ({
    id: `long-${index}`,
    role: index % 2 ? ('user' as const) : ('assistant' as const),
    text: index === 15 ? 'Edit A very specific window story' : '朝'.repeat(6000),
    createdAt: '2026-10-28T12:00:00.000Z'
  }));
  const body = assistantRequestBody(state, messages);
  assert.ok(new TextEncoder().encode(JSON.stringify(body)).length <= 150_000);
  assert.equal(body.messages.at(-1)!.text, messages.at(-1)!.text);
  assert.equal(body.actionVersion, 3);
  assert.equal(body.context.details?.[0].notes, target.notes);
  assert.doesNotThrow(() => validateContext(body.context));
});
