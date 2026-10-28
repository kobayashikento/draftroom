import test from 'node:test';
import assert from 'node:assert/strict';
import type { MediaController } from '../components/media/media.helpers.ts';
import type { AssistantServiceContext } from '../lib/assistant-service-actions.helpers.ts';
import { blankLibrary } from '../components/media/media.helpers.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { seed } from '../lib/model.ts';
import {
  executeAssistantServiceAction,
  assistantServiceLabel
} from '../lib/assistant-service-actions.helpers.ts';
import {
  applyAssistantTurn,
  prepareAssistantTurn,
  previewAssistantTurn
} from '../lib/assistant-actions.ts';
import {
  preparePublicationPostLink,
  applyPublicationPostLink
} from '../components/media/publication-link.helpers.ts';

function fixture() {
  const state = seed();
  const calls: unknown[] = [];
  const record = {
    ...newMediaRecord('owner', { title: 'Published reel', source: 'api' }),
    id: 'post-1',
    platform: 'Instagram' as const,
    external_id: 'POST123',
    permalink: 'https://www.instagram.com/reel/POST123/',
    published_at: '2026-10-27T12:00:00.000Z',
    linked_item_id: state.items[0].id
  };
  const library: MediaController = {
    ...blankLibrary,
    media: [record],
    cloud: true,
    loading: false,
    refreshing: false,
    error: '',
    busy: '',
    refresh: async () => {},
    openLibrary: () => {},
    connect: async platform => {
      calls.push(['connect', platform]);
    },
    disconnect: async platform => {
      calls.push(['disconnect', platform]);
    },
    sync: async (platform, older) => {
      calls.push(['sync', platform, older]);
    },
    importLink: async (url, title, linkedItemId) => {
      calls.push(['import', url, title, linkedItemId]);
      return record.id;
    },
    updateMedia: async (record, linkedItemId, archived) => {
      calls.push(['update', record.id, linkedItemId, archived]);
    },
    linkPublication: async input => {
      calls.push(['link', input]);
    },
    unlinkPublication: async (itemId, publicationId) => {
      calls.push(['unlink', itemId, publicationId]);
    }
  };
  const context: AssistantServiceContext = {
    state,
    library,
    navigate: href => {
      calls.push(['navigate', href]);
    },
    openCalendar: (date, platform) => {
      calls.push(['calendar', date, platform]);
    },
    newConversation: () => {
      calls.push(['new chat']);
    },
    openConversation: id => {
      calls.push(['open chat', id]);
    },
    showConversations: () => {
      calls.push(['history']);
    },
    openReview: id => {
      calls.push(['review', id]);
    },
    retrySync: async () => {
      calls.push(['retry save']);
    }
  };
  return { state, library, record, context, calls };
}

test('library actions reuse existing controllers and preserve unspecified link/archive values', async () => {
  const { state, record, context, calls } = fixture();
  await executeAssistantServiceAction(context, {
    type: 'update_media',
    mediaId: record.id,
    archived: true
  });
  assert.deepEqual(calls[0], ['update', record.id, state.items[0].id, true]);
  await executeAssistantServiceAction(context, {
    type: 'update_media',
    mediaId: record.id,
    itemId: ''
  });
  assert.deepEqual(calls[1], ['update', record.id, '', false]);
  const receipt = await executeAssistantServiceAction(context, {
    type: 'import_post',
    url: record.permalink,
    title: 'A reel',
    itemId: ''
  });
  assert.equal(receipt.href, '/library/?post=post-1');
  await executeAssistantServiceAction(context, {
    type: 'sync_posts',
    platform: 'TikTok',
    older: true
  });
  assert.deepEqual(calls.at(-1), ['sync', 'TikTok', true]);
});

test('published matching uses the precise platform publication and rejects incompatible or invented records', async () => {
  const { state, record, context, calls } = fixture();
  await executeAssistantServiceAction(context, {
    type: 'link_publication',
    itemId: state.items[0].id,
    mediaId: record.id,
    platform: 'Instagram'
  });
  assert.deepEqual(calls[0], [
    'link',
    {
      itemId: state.items[0].id,
      publicationId: state.items[0].publications[0].id,
      mediaId: record.id
    }
  ]);
  await assert.rejects(
    executeAssistantServiceAction(context, {
      type: 'link_publication',
      itemId: state.items[0].id,
      mediaId: record.id,
      platform: 'TikTok'
    }),
    /TikTok/
  );
  await assert.rejects(
    executeAssistantServiceAction(context, {
      type: 'update_media',
      mediaId: 'missing',
      archived: true
    }),
    /no longer available/
  );
  assert.equal(calls.length, 1);
});

test('service failures cannot generate success receipts or silently apply associated workspace edits', async () => {
  const { state, library, context } = fixture();
  library.sync = async () => {
    throw new Error('Platform unavailable');
  };
  await assert.rejects(
    executeAssistantServiceAction(context, {
      type: 'sync_posts',
      platform: 'Instagram',
      older: false
    }),
    /Platform unavailable/
  );
  const oldTitle = state.items[0].title;
  const turn = prepareAssistantTurn(state, 'no-api-result', {
    reply: 'Changed',
    actions: [
      { type: 'update_idea', itemId: state.items[0].id, changes: { title: 'Must not apply' } },
      { type: 'sync_posts', platform: 'Instagram', older: false }
    ]
  });
  applyAssistantTurn(state, turn);
  assert.equal(state.items[0].title, oldTitle);
  assert.match(
    state.assistant!.messages.at(-1)!.text,
    /external actions have not all been confirmed/
  );
  assert.deepEqual(state.assistant!.messages.at(-1)!.receipts, []);
});

test('navigation uses validated workspace routes and calendar controls; arbitrary URLs cannot execute', async () => {
  const { state, context, calls } = fixture();
  await executeAssistantServiceAction(context, {
    type: 'open_calendar',
    date: '2026-11-02',
    platform: 'TikTok'
  });
  await executeAssistantServiceAction(context, {
    type: 'navigate',
    href: `/ideas/?idea=${state.items[0].id}&tab=Notes`
  });
  assert.deepEqual(calls[0], ['calendar', '2026-11-02', 'TikTok']);
  for (const href of [
    'https://attacker.test',
    'javascript:alert(1)',
    '/ideas/?idea=missing',
    '//attacker.test'
  ])
    assert.throws(() => assistantServiceLabel(state, [], { type: 'navigate', href }));
  assert.equal(calls.length, 2);
});

test('previewing unlink plus reschedule follows existing publication undo behavior before any writes', () => {
  const { state, library, record } = fixture();
  const item = state.items[0];
  const publication = item.publications[0];
  const earlierDate = publication.date;
  applyPublicationPostLink(
    state,
    preparePublicationPostLink(state, library.media, {
      itemId: item.id,
      publicationId: publication.id,
      mediaId: record.id
    })
  );
  const before = structuredClone(state);
  const turn = prepareAssistantTurn(state, 'unmatch-and-plan', {
    reply: 'A new plan',
    actions: [
      { type: 'unlink_publication', itemId: item.id, platform: 'Instagram' },
      {
        type: 'update_publication',
        itemId: item.id,
        platform: 'Instagram',
        changes: { date: '2026-11-06' }
      }
    ]
  });
  const preview = previewAssistantTurn(state, turn, library.media);
  assert.equal(preview.workspace.items[0].publications[0].linkedPost, undefined);
  assert.equal(preview.workspace.items[0].publications[0].date, '2026-11-06');
  assert.equal(before.items[0].publications[0].date, earlierDate);
  assert.deepEqual(state, before);
});
