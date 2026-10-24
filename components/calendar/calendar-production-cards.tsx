'use client';

import type { CalendarProductionCardsProps } from './calendar.helpers.ts';
import { calendarProductionGroups } from './calendar.helpers.ts';
import { Button } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { FormatIcon } from '../icons';

export default function CalendarProductionCards({ tasks }: CalendarProductionCardsProps) {
  const { open } = useWorkspace();
  return calendarProductionGroups(tasks).map(({ item, tasks }) => {
    const remaining = tasks.filter(({ t }) => !t.done).length;
    return (
      <article key={item.id} className="planner-production">
        <Button
          className="planner-task-open"
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
      </article>
    );
  });
}
