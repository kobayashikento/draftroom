'use client';

import type { CalendarProductionCardsProps } from './calendar.helpers.ts';
import type { CalendarMoveTarget } from './calendar-move.helpers.ts';
import { calendarProductionGroups } from './calendar.helpers.ts';
import { Button } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { AppIcon, FormatIcon } from '../icons';
import { CalendarArrowUp, GripVertical } from 'lucide-react';

export default function CalendarProductionCards({
  tasks,
  date,
  drag,
  onMove
}: CalendarProductionCardsProps) {
  const { open } = useWorkspace();
  return calendarProductionGroups(tasks).map(({ item, tasks }) => {
    const remaining = tasks.filter(({ t }) => !t.done).length;
    const target: CalendarMoveTarget = {
      type: 'production',
      itemId: item.id,
      taskIds: tasks.filter(({ t }) => !t.done).map(({ t }) => t.id),
      date
    };
    return (
      <article
        key={item.id}
        className="planner-production"
        draggable={false}
        data-movable={Boolean(drag && remaining)}
        {...(remaining ? drag?.handlers(target) : {})}
      >
        <Button
          className="planner-task-open"
          draggable={false}
          aria-label={`Work on ${item.title}`}
          onClick={() => open(item.id, 'Production')}
        >
          <span className="flex items-center gap-1 text-xs text-muted">
            <FormatIcon format={item.format} />
            {item.format}
          </span>
          <span>{item.title}</span>
          <span className="text-xs text-muted">
            {remaining
              ? `${remaining} ${remaining === 1 ? 'task' : 'tasks'} to work on`
              : 'Today’s checklist done'}
          </span>
        </Button>
        {remaining > 0 && (
          <div className="planner-card-actions">
            {drag && <AppIcon icon={GripVertical} className="planner-grip" />}
            <Button
              className="icon-button"
              aria-label={`Move production work: ${item.title}`}
              title="Choose a date"
              onClick={() => onMove(target)}
            >
              <AppIcon icon={CalendarArrowUp} />
            </Button>
          </div>
        )}
      </article>
    );
  });
}
