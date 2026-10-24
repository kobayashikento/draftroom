'use client';

import { itemFieldSetter } from './editors.helpers.ts';
import type { NotesEditorProps } from './editors.helpers.ts';
import { Input, Textarea, Field, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function NotesEditor({ item }: NotesEditorProps) {
  const { updateItem } = useWorkspace();
  const set = itemFieldSetter(item.id, updateItem);
  return (
    <div className="fields">
      <Field label="Notes" wide>
        <Textarea rows={6} value={item.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
      <Field label="Tags">
        <Input
          placeholder="cozy, home, matcha"
          value={item.tags}
          onChange={e => set('tags', e.target.value)}
        />
      </Field>
      <Field label="Priority">
        <Select
          options={['Normal', 'High']}
          value={item.priority}
          onChange={v => set('priority', v)}
        />
      </Field>
    </div>
  );
}
