'use client';

import { useDraggable } from '@dnd-kit/react';
import type { CalendarDragData, CalendarDraggableCardProps } from './calendar-dnd.helpers.ts';
import { calendarDragId } from './calendar-dnd.helpers.ts';

export default function useCalendarDraggable({
  target,
  label,
  kind,
  canDrag
}: CalendarDraggableCardProps) {
  return useDraggable<CalendarDragData>({
    id: calendarDragId(target),
    type: 'calendar-item',
    data: { target, label, kind },
    disabled: !canDrag
  });
}
