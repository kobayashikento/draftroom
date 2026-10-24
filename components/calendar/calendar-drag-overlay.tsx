'use client';

import { DragOverlay, useDragOperation } from '@dnd-kit/react';
import { CalendarArrowUp } from 'lucide-react';
import { AppIcon } from '../icons';
import { readCalendarDragData, readCalendarDropDate } from './calendar-dnd.helpers.ts';
import { fmt } from '../../lib/display.ts';

export default function CalendarDragOverlay() {
  const { source, target } = useDragOperation();
  const data = readCalendarDragData(source?.data);
  const date = readCalendarDropDate(target?.data);
  return (
    <DragOverlay dropAnimation={null} className="planner-drag-overlay">
      {data && (
        <div className="planner-drag-preview" aria-hidden="true">
          <span className="text-xs text-muted">{data.kind}</span>
          <strong className="text-base font-medium">{data.label}</strong>
          <span className="flex items-center gap-2 text-xs">
            <AppIcon icon={CalendarArrowUp} />
            {date
              ? `Move to ${fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })}`
              : 'Move over a day'}
          </span>
        </div>
      )}
    </DragOverlay>
  );
}
