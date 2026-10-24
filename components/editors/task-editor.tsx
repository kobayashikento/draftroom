'use client';

import {
  taskFieldSetter,
  taskCategories,
  addTask,
  removeTask
} from '../production/production.helpers.ts';
import type { TaskEditorProps } from './editors.helpers.ts';
import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, PriorityButton, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { reorder } from '../../lib/reorder.ts';
import { kind } from '../../lib/model.ts';
import ItemPostConnection from '../media/item-post-connection';

export default function TaskEditor({
  item,
  onOpenPublish,
  focusTaskId,
  focusTargetRef
}: TaskEditorProps) {
  const { state, updateItem } = useWorkspace();
  const set = taskFieldSetter(item.id, updateItem);
  return (
    <>
      <div className="mb-4">
        <ItemPostConnection item={item} onLink={onOpenPublish} />
      </div>
      {kind(state, item) !== 'prep' && item.tasks.some(t => !t.done) && (
        <p className="warning">This idea has unfinished tasks. Its stage stays as you set it.</p>
      )}
      {item.tasks.map((t, i) => (
        <div
          className={`task-edit ${t.id === focusTaskId ? 'is-linked' : ''}`}
          key={t.id}
          ref={t.id === focusTaskId ? focusTargetRef : undefined}
        >
          <Input
            type="checkbox"
            aria-label={`Complete ${t.title}`}
            checked={t.done}
            onChange={e => set(t.id, 'done', e.target.checked)}
          />
          <Input
            aria-label="Task title"
            type="text"
            value={t.title}
            onChange={e => set(t.id, 'title', e.target.value)}
          />
          <Select
            aria-label="Task category"
            options={taskCategories}
            value={t.category}
            onChange={v => set(t.id, 'category', v)}
          />
          <Input
            type="date"
            aria-label="Task due date"
            value={t.due}
            onInput={e => set(t.id, 'due', e.currentTarget.value)}
            onChange={e => set(t.id, 'due', e.target.value)}
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
              onClick={() => updateItem(item.id, p => reorder(p.tasks, t.id, -1))}
            >
              <AppIcon icon={ArrowUp} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Move task down"
              disabled={i === item.tasks.length - 1}
              onClick={() => updateItem(item.id, p => reorder(p.tasks, t.id, 1))}
            >
              <AppIcon icon={ArrowDown} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Remove task"
              onClick={() => updateItem(item.id, p => removeTask(p, t.id))}
            >
              <AppIcon icon={X} />
            </Button>
          </div>
        </div>
      ))}
      <Button onClick={() => updateItem(item.id, addTask)}>
        <AppIcon icon={Plus} />
        Add task
      </Button>
    </>
  );
}
