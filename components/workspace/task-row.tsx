'use client';
import type { Item, Task } from '../../lib/types.ts';
import { Input, PriorityButton, Button } from '../ui';
import { useWorkspace } from './workspace-context';
import { fmt } from '../../lib/display.ts';

type TaskRowProps = { item: Item; task: Task; prioritizable?: boolean };

export default function TaskRow({ item, task, prioritizable = false }: TaskRowProps) {
  const { updateItem, open } = useWorkspace();
  return (
    <div className={`taskrow ${task.done ? 'checked' : ''}`}>
      <Input
        type="checkbox"
        aria-label={task.title}
        checked={task.done}
        onChange={(e) => {
          const done = e.target.checked;
          updateItem(item.id, (p) => (p.tasks.find((t) => t.id === task.id)!.done = done));
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
          onClick={() =>
            updateItem(item.id, (p) => {
              const target = p.tasks.find((t) => t.id === task.id);
              if (!target) return;
              target.priority = target.priority === 'High' ? 'Normal' : 'High';
            })
          }
        />
      )}
    </div>
  );
}
