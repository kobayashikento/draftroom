'use client';
import type { Item } from '../../lib/types.ts';
type NotesEditorProps = { item: Item };

import { Input, Textarea, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function NotesEditor({ item }: NotesEditorProps) {
  const { updateItem } = useWorkspace();
  const set = <K extends keyof Item>(key: K, value: Item[K]) => updateItem(item.id, (p) => (p[key] = value));
  return (
    <div className="fields">
      <Field label="Notes" wide>
        <Textarea rows={6} value={item.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      <Field label="Tags">
        <Input
          placeholder="cozy, home, matcha"
          value={item.tags}
          onChange={(e) => set('tags', e.target.value)}
        />
      </Field>
      <Field label="Priority">
        <Select
          options={['Normal', 'High']}
          value={item.priority}
          onChange={(v) => set('priority', v)}
        />
      </Field>
    </div>
  );
}
