'use client';

import { useDroppable } from '@dnd-kit/react';
import { pointerIntersection } from '@dnd-kit/collision';
import { readCalendarDragData } from './calendar-dnd.helpers.ts';
import { canMoveCalendarItem } from './calendar-move.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';

export default function useCalendarDroppable(date: string) {
  const { state } = useWorkspace();
  return useDroppable({
    id: `calendar-day:${date}`,
    type: 'calendar-day',
    collisionDetector: pointerIntersection,
    data: { date },
    accept(source) {
      const data = readCalendarDragData(source.data);
      return (
        source.type === 'calendar-item' &&
        Boolean(data && canMoveCalendarItem(state, data.target, date))
      );
    }
  });
}
