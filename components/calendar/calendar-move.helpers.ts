import type { MouseEventHandler, PointerEventHandler } from 'react';
import type { Workspace } from '../../lib/types.ts';
import { dateString, parseDate } from '../../lib/model.ts';
import { reschedulePublication } from './calendar.helpers.ts';
import { dayTaskOccursOn, moveDayTask } from './day-task.helpers.ts';

export type CalendarMoveTarget =
  | { type: 'publication'; itemId: string; publicationId: string }
  | { type: 'production'; itemId: string; taskIds: string[]; date: string }
  | { type: 'day-task'; taskId: string; scheduledDate: string; date: string };
export type CalendarDrag = {
  targetDate: string;
  handlers: (target: CalendarMoveTarget) => CalendarDragHandlers;
  clickGuard: CalendarClickGuard;
  cancel: () => void;
};
export type CalendarDragHandlers = {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};
export type CalendarClickGuard = {
  onPointerDownCapture: PointerEventHandler<HTMLElement>;
  onClickCapture: MouseEventHandler<HTMLElement>;
};
export type CalendarPointerDrag = {
  target: CalendarMoveTarget;
  pointerId: number;
  x: number;
  y: number;
  moving: boolean;
};
export type CalendarMoveDetails = { title: string; date: string; description: string };
export type CalendarMoveEditorProps = { target: CalendarMoveTarget; onClose: () => void };

export function calendarMoveDetails(
  state: Workspace,
  target: CalendarMoveTarget
): CalendarMoveDetails | null {
  if (target.type === 'day-task') {
    const task = state.calendarTasks?.find(task => task.id === target.taskId);
    if (!task || !dayTaskOccursOn(task, target.scheduledDate)) return null;
    const date = task.movedDates?.[target.scheduledDate] || target.scheduledDate;
    if (date !== target.date) return null;
    return {
      title: task.title,
      date,
      description:
        task.repeat === 'weekly'
          ? 'Move only this occurrence. Your weekly routine keeps its usual day.'
          : 'Move this day task to the date that works for you.'
    };
  }
  const item = state.items.find(item => item.id === target.itemId);
  if (!item) return null;
  if (target.type === 'publication') {
    const pub = item.publications.find(pub => pub.id === target.publicationId);
    if (!pub || pub.state === 'manually_posted') return null;
    return {
      title: item.title,
      date: pub.date,
      description: `Move only the ${pub.platform} publishing date. Checklist dates and other channels stay as they are.`
    };
  }
  const tasks = item.tasks.filter(
    task => target.taskIds.includes(task.id) && task.due === target.date && !task.done
  );
  if (!tasks.length) return null;
  return {
    title: item.title,
    date: target.date,
    description: `Move ${tasks.length} unfinished checklist ${tasks.length === 1 ? 'task' : 'tasks'} from this day. Completed work and publishing dates stay as they are.`
  };
}

export function canMoveCalendarItem(
  state: Workspace,
  target: CalendarMoveTarget,
  date: unknown
): date is string {
  const details = calendarMoveDetails(state, target);
  return Boolean(
    details &&
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    dateString(parseDate(date)) === date &&
    date !== details.date
  );
}

export function moveCalendarItem(
  state: Workspace,
  target: CalendarMoveTarget,
  date: unknown,
  timestamp = new Date().toISOString()
): boolean {
  if (!canMoveCalendarItem(state, target, date)) return false;
  if (target.type === 'day-task')
    return moveDayTask(state, target.taskId, target.scheduledDate, date);
  const item = state.items.find(item => item.id === target.itemId)!;
  if (target.type === 'publication') {
    if (!reschedulePublication(item, target.publicationId, date)) return false;
  } else {
    item.tasks
      .filter(task => target.taskIds.includes(task.id) && task.due === target.date && !task.done)
      .forEach(task => {
        task.due = date;
      });
  }
  item.updatedAt = timestamp;
  return true;
}
