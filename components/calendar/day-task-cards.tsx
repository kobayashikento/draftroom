'use client';

import type { DayTaskCardsProps } from './day-task.helpers.ts';
import { completeDayTask } from './day-task.helpers.ts';
import { Repeat2 } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Input } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function DayTaskCards({ tasks, onEdit }: DayTaskCardsProps) {
  const { update } = useWorkspace();
  return tasks.map(({ task, date, done }) => (
    <article key={`${task.id}:${date}`} className={`planner-task ${done ? 'is-done' : ''}`}>
      <div className="flex items-start gap-2">
        <Input
          type="checkbox"
          checked={done}
          aria-label={`Complete ${task.title} on ${date}`}
          onChange={event =>
            update(workspace => completeDayTask(workspace, task.id, date, event.target.checked))
          }
        />
        <Button
          className="planner-task-open"
          aria-label={`Edit day task: ${task.title}`}
          onClick={() => onEdit({ id: task.id, date })}
        >
          <span className="planner-task-title">{task.title}</span>
          {task.repeat === 'weekly' && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <AppIcon icon={Repeat2} />
              Weekly
            </span>
          )}
        </Button>
      </div>
    </article>
  ));
}
