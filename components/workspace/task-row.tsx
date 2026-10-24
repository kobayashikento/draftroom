'use client';

import { setTaskField, toggleTaskPriority } from '../production/production.helpers.ts';
import type { TaskRowProps } from './workspace.helpers.ts';
import { Input, PriorityButton, Button } from '../ui';
import { useWorkspace } from './workspace-context';
import { fmt } from '../../lib/display.ts';

export default function TaskRow({ item, task, prioritizable = false }: TaskRowProps) {
  const { updateItem, open } = useWorkspace();
  return (
    <div className={`taskrow ${task.done ? 'checked' : ''}`}>
      <Input
        type="checkbox"
        aria-label={task.title}
        checked={task.done}
        onChange={e => {
          const done = e.target.checked;
          updateItem(item.id, p => setTaskField(p, task.id, 'done', done));
        }}
      />
      <div className="tasktext">
        <span className="task-title">{task.title}</span>
        <small>
          <Button className="link" onClick={() => open(item.id, 'Production')}>
            {item.title}
          </Button>
        </small>
      </div>
      <span className="date-chip">{task.due ? fmt(task.due) : 'No due date'}</span>
      {prioritizable && (
        <PriorityButton
          label={`task: ${task.title}`}
          active={task.priority === 'High'}
          onClick={() => updateItem(item.id, p => toggleTaskPriority(p, task.id))}
        />
      )}
    </div>
  );
}
