import assert from 'node:assert/strict';
import test from 'node:test';
import { workspaceEntryPath } from '../lib/navigation.ts';

test('existing library callback links keep connection results when moving to the library route', () => {
  const path = workspaceEntryPath(
    new URL('https://draftroom.test/?view=Library&social=connected&platform=TikTok#library')
  );
  assert.equal(path, '/library/?social=connected&platform=TikTok#library');
});

test('home opens the calendar and preserves unrelated parameters and fragments', () => {
  assert.equal(workspaceEntryPath(new URL('https://draftroom.test/')), '/calendar/');
  assert.equal(
    workspaceEntryPath(new URL('https://draftroom.test/?source=bookmark#workspace')),
    '/calendar/?source=bookmark#workspace'
  );
});

test('unrecognized legacy views cannot become navigation destinations', () => {
  assert.equal(
    workspaceEntryPath(
      new URL('https://draftroom.test/?view=https://other.test/&social=cancelled')
    ),
    '/calendar/?social=cancelled'
  );
});
