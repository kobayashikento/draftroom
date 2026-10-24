import assert from 'node:assert/strict';
import type { Workspace } from '../lib/types.ts';

export function required<T>(value: T | null | undefined): T {
  assert.ok(value !== null && value !== undefined, 'Expected the fixture record to exist');
  return value;
}

export function workspaceData(source: { data: Workspace | null }): Workspace {
  return required(source.data);
}
