'use client';

import type { DayTaskCardsProps } from './day-task.helpers.ts';
import type { CalendarMoveTarget } from './calendar-move.helpers.ts';
import { completeDayTask } from './day-task.helpers.ts';
import { CalendarArrowUp, Repeat2 } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Input } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import CalendarDraggableCard from './calendar-draggable-card';

export default function DayTaskCards({
  tasks,
  onEdit,
  canDrag = false,
  onMove
}: DayTaskCardsProps) {
  const { update } = useWorkspace();
  return tasks.map(({ task, date, scheduledDate, done }) => {
    const target: CalendarMoveTarget = { type: 'day-task', taskId: task.id, scheduledDate, date };
    return (
      <CalendarDraggableCard
        key={`${task.id}:${scheduledDate}`}
        className={`planner-task ${done ? 'is-done' : ''}`}
        target={target}
        label={task.title}
        kind="Day task"
        canDrag={canDrag}
      >
        {handle => (
          <>
            <div className="flex items-start gap-2">
              <Input
                type="checkbox"
                checked={done}
                aria-label={`Complete ${task.title} on ${date}`}
                onChange={event =>
                  update(workspace =>
                    completeDayTask(workspace, task.id, scheduledDate, event.target.checked)
                  )
                }
              />
              <Button
                className="planner-task-open"
                draggable={false}
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
            <div className="planner-card-actions">
              {handle}
              <Button
                className="icon-button"
                aria-label={`Move day task: ${task.title}`}
                title="Choose a date"
                onClick={() => onMove(target)}
              >
                <AppIcon icon={CalendarArrowUp} />
              </Button>
            </div>
          </>
        )}
      </CalendarDraggableCard>
    );
  });
}
