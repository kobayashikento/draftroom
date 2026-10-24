'use client';
import type { Item, Task } from '../../lib/types.ts';
type TaskEditorProps = { item: Item };

import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, PriorityButton, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { reorder } from '../../lib/reorder.ts';
import { uid, kind } from '../../lib/model';

export default function TaskEditor({ item }: TaskEditorProps) {
  const { state, updateItem } = useWorkspace();
  const set = <K extends keyof Task>(id: string, key: K, value: Task[K]) =>
    updateItem(item.id, (draft) => {
      const target = draft.tasks.find((entry) => entry.id === id);
      if (target) target[key] = value;
    });
  return (
    <>
      {kind(state, item) !== 'prep' && item.tasks.some((t) => !t.done) && (
        <p className="warning">This idea has unfinished tasks. Its stage stays as you set it.</p>
      )}
      {item.tasks.map((t, i) => (
        <div className="task-edit" key={t.id}>
          <Input
            type="checkbox"
            aria-label={`Complete ${t.title}`}
            checked={t.done}
            onChange={(e) => set(t.id, 'done', e.target.checked)}
          />
          <Input
            aria-label="Task title"
            type="text"
            value={t.title}
            onChange={(e) => set(t.id, 'title', e.target.value)}
          />
          <Select
            aria-label="Task category"
            options={['plan', 'film', 'photo', 'edit', 'caption', 'publish']}
            value={t.category}
            onChange={(v) => set(t.id, 'category', v)}
          />
          <Input
            type="date"
            aria-label="Task due date"
            value={t.due}
            onInput={(e) => set(t.id, 'due', e.currentTarget.value)}
            onChange={(e) => set(t.id, 'due', e.target.value)}
          />
          <div className="entry-controls">
            <PriorityButton
              label={`task: ${t.title}`}
              active={t.priority === 'High'}
              onClick={() => set(t.id, 'priority', t.priority === 'High' ? 'Normal' : 'High')}
            />
            <Button
              className="icon-button"
              aria-label="Move task up"
              disabled={i === 0}
              onClick={() => updateItem(item.id, (p) => reorder(p.tasks, t.id, -1))}
            >
              <AppIcon icon={ArrowUp} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Move task down"
              disabled={i === item.tasks.length - 1}
              onClick={() => updateItem(item.id, (p) => reorder(p.tasks, t.id, 1))}
            >
              <AppIcon icon={ArrowDown} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Remove task"
              onClick={() =>
                updateItem(item.id, (p) => (p.tasks = p.tasks.filter((x) => x.id !== t.id)))
              }
            >
              <AppIcon icon={X} />
            </Button>
          </div>
        </div>
      ))}
      <Button
        onClick={() =>
          updateItem(item.id, (p) =>
            p.tasks.push({
              id: uid(),
              title: 'New task',
              category: 'plan',
              due: '',
              done: false,
              priority: 'Normal',
            }),
          )
        }
      >
        <AppIcon icon={Plus} />
        Add task
      </Button>
    </>
  );
}
