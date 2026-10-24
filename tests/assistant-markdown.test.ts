import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import { assistantMarkdown } from '../lib/assistant-markdown.ts';

test('assistant planning replies render readable emphasis and lists', () => {
  const html = renderToStaticMarkup(
    createElement(
      Markdown,
      assistantMarkdown,
      'Two ideas:\n\n1. **Film the opening**\n2. Edit the ending'
    )
  );
  assert.match(html, /<ol>/);
  assert.match(html, /<strong>Film the opening<\/strong>/);
});
test('untrusted assistant text cannot inject HTML, remote images or executable links', () => {
  const html = renderToStaticMarkup(
    createElement(
      Markdown,
      assistantMarkdown,
      '<script>alert(1)</script>\n\n![tracker](https://tracking.example/pixel)\n\n[Unsafe link](javascript:alert)\n\n[External link](https://example.com)'
    )
  );
  assert.doesNotMatch(html, /<script|<img|<a\b|href=|src=/);
  assert.match(html, /Unsafe link/);
  assert.match(html, /External link/);
});
