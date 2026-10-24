'use client';

import type { BeforeDragStartEvent, DragEndEvent } from '@dnd-kit/react';
import { calendarMoveDetails, moveCalendarItem } from './calendar-move.helpers.ts';
import { calendarDropPlan, readCalendarDragData } from './calendar-dnd.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { fmt } from '../../lib/display.ts';

export default function useCalendarDrag() {
  const { state, update, notify } = useWorkspace();
  function onBeforeDragStart(event: BeforeDragStartEvent) {
    const data = readCalendarDragData(event.operation.source?.data);
    if (!data || !calendarMoveDetails(state, data.target)) event.preventDefault();
  }
  function onDragEnd(event: DragEndEvent) {
    const plan = calendarDropPlan(
      state,
      event.operation.source?.data,
      event.operation.target?.data,
      event.canceled
    );
    if (!plan) return;
    update(workspace => moveCalendarItem(workspace, plan.target, plan.date));
    notify(`${plan.label} moved to ${fmt(plan.date)}.`);
  }
  return { onBeforeDragStart, onDragEnd };
}
