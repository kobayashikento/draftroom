import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearWorkspaceLink,
  parseWorkspaceLink,
  workspaceLinkHref
} from '../lib/workspace-links.ts';
import type { WorkspaceLink } from '../lib/workspace-links.ts';
import {
  linkedWorkspaceModal,
  sameWorkspaceModal
} from '../components/workspace/workspace-links.helpers.ts';
import {
  assistantContext,
  validateContext
} from '../supabase/functions/_shared/assistant-context.ts';
import { performanceContext } from '../supabase/functions/_shared/assistant-performance.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { seed } from '../lib/model.ts';

test('post, idea, checklist, task, series and view links round-trip through canonical URLs', () => {
  const links: WorkspaceLink[] = [
    { type: 'post', id: 'post-123' },
    { type: 'idea', id: 'idea-123', tab: 'Storyboard' },
    { type: 'idea', id: 'idea-123', tab: 'Publish' },
    { type: 'idea', id: 'idea-123', tab: 'Analytics' },
    { type: 'idea', id: 'idea-123', tab: 'Production', taskId: 'task-123' },
    { type: 'series', id: 'series-123' },
    { type: 'view', view: 'Analytics' }
  ];
  for (const link of links) assert.deepEqual(parseWorkspaceLink(workspaceLinkHref(link)), link);
  const unusual: WorkspaceLink = { type: 'idea', id: 'quoted " & # id', tab: 'Notes' };
  assert.deepEqual(parseWorkspaceLink(workspaceLinkHref(unusual)), unusual);
});

test('navigation rejects executable, external, ambiguous and unsupported URLs', () => {
  for (const href of [
    'javascript:alert(1)',
    '//attacker.example/library/?post=123',
    '/\\attacker.example/library/?post=123',
    'https://draftroom.test/library/?post=123',
    '/unknown/?post=123',
    '/library/?post=',
    '/library/?post=one&post=two',
    '/library/?post=123&idea=456',
    '/library/?post=123&tab=Notes',
    '/ideas/?idea=123&tab=Unknown',
    '/ideas/?idea=123&tab=Notes&task=456',
    '/ideas/?idea=123&next=https://attacker.example',
    '/series/?series=123#other',
    '/library/?post=bad%0Aid'
  ])
    assert.equal(parseWorkspaceLink(href), null, href);
});

test('deep links resolve only against currently available workspace and library records', () => {
  const state = seed();
  const item = state.items[0];
  const task = item.tasks[0];
  const post = {
    ...newMediaRecord('owner', { title: 'Morning matcha', source: 'api' }),
    id: 'post-123'
  };
  assert.deepEqual(linkedWorkspaceModal({ type: 'post', id: post.id }, state, [post]), {
    type: 'media',
    id: post.id
  });
  assert.deepEqual(
    linkedWorkspaceModal(
      { type: 'idea', id: item.id, tab: 'Production', taskId: task.id },
      state,
      []
    ),
    { type: 'content', id: item.id, tab: 'Production', taskId: task.id }
  );
  assert.deepEqual(linkedWorkspaceModal({ type: 'series', id: state.series[0].id }, state, []), {
    type: 'series',
    id: state.series[0].id
  });
  assert.equal(linkedWorkspaceModal({ type: 'post', id: 'missing' }, state, [post]), null);
  assert.equal(
    linkedWorkspaceModal(
      { type: 'idea', id: item.id, tab: 'Production', taskId: 'missing' },
      state,
      []
    ),
    null
  );
  assert.equal(
    linkedWorkspaceModal({ type: 'idea', id: 'missing', tab: 'Storyboard' }, state, []),
    null
  );
});

test('closing or leaving a linked modal preserves other URL state and unrelated editors', () => {
  assert.equal(
    clearWorkspaceLink('https://draftroom.test/library/?post=123&social=connected#library'),
    '/library/?social=connected#library'
  );
  assert.equal(
    sameWorkspaceModal(
      { type: 'media', id: '123' },
      { type: 'content', id: '123', tab: 'Production' }
    ),
    false
  );
  assert.equal(
    sameWorkspaceModal({ type: 'media', id: '123' }, { type: 'media', id: '123' }),
    true
  );
  assert.equal(
    sameWorkspaceModal(
      { type: 'content', id: '123', tab: 'Notes' },
      { type: 'content', id: '123', tab: 'Production' }
    ),
    false
  );
});

test('assistant navigation uses bounded planning records and discards forged browser links', () => {
  const state = seed();
  const context = assistantContext(state, '2026-10-24', 'America/Toronto');
  const task = context.links.find(link => link.type === 'task')!;
  const target = parseWorkspaceLink(task.href);
  assert.ok(target && target.type === 'idea' && target.taskId);
  assert.ok(context.links.some(link => link.href === '/analytics/'));
  context.links = [{ type: 'idea', id: 'forged', title: 'FORGED', href: 'javascript:alert(1)' }];
  const validated = validateContext(context);
  assert.equal(JSON.stringify(validated.links).includes('FORGED'), false);
  assert.ok(validated.links.some(link => link.type === 'task'));
  const browserSummary = assistantContext(state, '2026-10-24', 'America/Toronto', {
    includeLinks: false
  });
  assert.deepEqual(browserSummary.links, []);
  assert.ok(validateContext(browserSummary).links.some(link => link.type === 'task'));
  const post = {
    ...newMediaRecord('owner', { title: 'Morning matcha', source: 'api' }),
    id: 'post-123',
    platform: 'Instagram' as const
  };
  assert.equal(performanceContext([post], []).posts[0].href, '/library/?post=post-123');
});
