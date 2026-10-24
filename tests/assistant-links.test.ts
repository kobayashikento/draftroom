import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import {
  assistantLinkedMarkdown,
  assistantLinkReferences,
  assistantReferenceIndex
} from '../components/assistant/assistant-links.helpers.ts';
import type { AssistantReferenceIndex } from '../components/assistant/assistant-links.helpers.ts';
import type { MediaRecord, SocialPlatform } from '../supabase/functions/_shared/social-types.ts';
import { newMediaRecord } from '../supabase/functions/_shared/media-helpers.ts';
import { seed } from '../lib/model.ts';

function post(id: string, title: string, platform: SocialPlatform = 'Instagram'): MediaRecord {
  return {
    ...newMediaRecord('owner', { title, source: 'api' }),
    id,
    platform,
    permalink:
      platform === 'Instagram'
        ? `https://www.instagram.com/reel/POST${id}/`
        : 'https://www.tiktok.com/@creator/video/6718335390845095173'
  };
}
function render(text: string, index: AssistantReferenceIndex) {
  const options = assistantLinkedMarkdown(index, ({ href, children }) => {
    const references = assistantLinkReferences(href, index);
    if (!references.length) return createElement(Fragment, null, children);
    if (references.length > 1)
      return createElement('span', { 'data-choices': references.length }, children);
    return createElement('a', { href: references[0].href }, children);
  });
  return renderToStaticMarkup(createElement(Markdown, options, text));
}

test('existing replies link exact titles in prose and emphasis without altering visible wording', () => {
  const state = seed();
  state.items[0].title = 'A matcha morning';
  state.items[0].tasks[0].title = 'Film the opening';
  const index = assistantReferenceIndex(state, [post('first', 'She’s trying her best')]);
  const html = render(
    'Compare **She’s trying her best** with A matcha morning, then Film the opening.',
    index
  );
  assert.match(
    html,
    /<strong><a href="\/library\/\?post=first">She’s trying her best<\/a><\/strong>/
  );
  assert.match(html, /href="\/ideas\/\?idea=/);
  assert.match(html, /href="\/production\/\?idea=.*task=/);
  assert.match(html, /Film the opening<\/a>\./);
});

test('shared titles offer every matching platform instead of selecting a post arbitrarily', () => {
  const index = assistantReferenceIndex(seed(), [
    post('instagram', 'My Friday evenings nowadays'),
    post('tiktok', 'My Friday evenings nowadays #cozy #cat', 'TikTok')
  ]);
  const html = render('My Friday evenings nowadays has performed well.', index);
  assert.match(html, /data-choices="2"/);
  const references = assistantLinkReferences(
    '#draftroom-reference-my%20friday%20evenings%20nowadays',
    index
  );
  assert.deepEqual(
    references.map(reference => reference.description),
    ['Instagram', 'TikTok']
  );
  assert.deepEqual(
    references.map(reference => reference.href),
    ['/library/?post=instagram', '/library/?post=tiktok']
  );
  assert.deepEqual(
    assistantLinkReferences('/library/?post=tiktok', index).map(reference => reference.description),
    ['TikTok']
  );
});

test('supplied workspace links preserve the intended tab and task; known platform links open saved previews', () => {
  const state = seed();
  const item = state.items[0];
  const task = item.tasks[0];
  const index = assistantReferenceIndex(state, [post('first', 'A specific post title')]);
  const html = render(
    `[Insights](/ideas/?idea=${item.id}&tab=Analytics) and [Checklist](/production/?idea=${item.id}&tab=Production&task=${task.id}) and [Original](https://www.instagram.com/reel/POSTfirst/?tracking=remove).`,
    index
  );
  assert.match(html, /tab=Analytics/);
  assert.match(html, /task=/);
  assert.match(html, /href="\/library\/\?post=first">Original/);
  assert.doesNotMatch(html, /tracking|href="https:/);
});

test('unknown, deleted, executable, misleading external and fabricated links stay inert', () => {
  const index = assistantReferenceIndex(seed(), []);
  const html = render(
    '[Deleted](/library/?post=missing) [Unsafe](javascript:alert) [External](https://attacker.example) [Lookalike](https://instagram.com.attacker.example/reel/ABCDE/) ![Tracker](https://attacker.example/pixel) <script>alert(1)</script>',
    index
  );
  assert.doesNotMatch(html, /<a\b|href=|<img|src=|<script/);
  assert.match(html, /Deleted/);
  assert.match(html, /External/);
  assert.deepEqual(assistantLinkReferences('#draftroom-reference-%ZZ', index), []);
});

test('autolinking handles apostrophes, stripped hashtags and emoji, whole titles and regex punctuation', () => {
  const index = assistantReferenceIndex(seed(), [
    post('first', 'She’s trying her best #cat'),
    post('second', 'My Friday evenings nowadays 🙂‍↕️✨'),
    post('third', 'Matcha (iced) + oat milk?')
  ]);
  const html = render(
    "She's trying her best. My Friday evenings nowadays. Matcha (iced) + oat milk?",
    index
  );
  assert.equal((html.match(/<a /g) || []).length, 3);
  assert.doesNotMatch(render('PreShe’s trying her bestsuffix', index), /<a /);
  assert.doesNotMatch(
    render('`She’s trying her best`\n\n```\nMy Friday evenings nowadays\n```', index),
    /<a /
  );
});

test('existing links are not nested and explicit known views remain navigable', () => {
  const index = assistantReferenceIndex(seed(), [post('first', 'A specific post title')]);
  const html = render(
    '[A specific post title](/library/?post=first) and [Library](/library/).',
    index
  );
  assert.equal((html.match(/<a /g) || []).length, 2);
  assert.doesNotMatch(html, /<a[^>]*><a/);
  assert.match(html, /href="\/library\/">Library/);
});
