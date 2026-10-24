import type { ReactNode } from 'react';
import type { CalendarMode, Workspace } from '../../lib/types.ts';
import type { CalendarMoveTarget } from './calendar-move.helpers.ts';
import { canMoveCalendarItem } from './calendar-move.helpers.ts';
import { dateString, parseDate } from '../../lib/model.ts';

export type CalendarDragData = {
  target: CalendarMoveTarget;
  label: string;
  kind: string;
};
export type CalendarDropPlan = { target: CalendarMoveTarget; date: string; label: string };
export type CalendarDragProviderProps = { children: ReactNode };
export type CalendarDraggableCardProps = CalendarDragData & {
  className: string;
  canDrag: boolean;
  children: (handle: ReactNode) => ReactNode;
};
export type CalendarDayProps = {
  date: string;
  anchor: string;
  mode: CalendarMode;
  children: ReactNode;
};

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && Boolean(value);

export function calendarDragId(target: CalendarMoveTarget): string {
  if (target.type === 'day-task')
    return `day-task:${JSON.stringify([target.taskId, target.scheduledDate])}`;
  if (target.type === 'publication')
    return `publication:${JSON.stringify([target.itemId, target.publicationId])}`;
  return `production:${JSON.stringify([target.itemId, target.date])}`;
}

export function readCalendarDragData(value: unknown): CalendarDragData | null {
  if (
    !object(value) ||
    typeof value.label !== 'string' ||
    typeof value.kind !== 'string' ||
    !object(value.target)
  )
    return null;
  const target = value.target;
  const valid =
    target.type === 'day-task'
      ? identifier(target.taskId) &&
        typeof target.scheduledDate === 'string' &&
        typeof target.date === 'string'
      : target.type === 'publication'
        ? identifier(target.itemId) && identifier(target.publicationId)
        : target.type === 'production' &&
          identifier(target.itemId) &&
          typeof target.date === 'string' &&
          Array.isArray(target.taskIds) &&
          target.taskIds.length > 0 &&
          target.taskIds.every(identifier);
  return valid ? (value as CalendarDragData) : null;
}

export function readCalendarDropDate(value: unknown): string {
  if (!object(value) || typeof value.date !== 'string') return '';
  const date = value.date;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && dateString(parseDate(date)) === date ? date : '';
}

export function calendarDropPlan(
  state: Workspace,
  source: unknown,
  destination: unknown,
  canceled: boolean
): CalendarDropPlan | null {
  if (canceled) return null;
  const data = readCalendarDragData(source);
  const date = readCalendarDropDate(destination);
  if (!data || !canMoveCalendarItem(state, data.target, date)) return null;
  return { target: data.target, date, label: data.label };
}
