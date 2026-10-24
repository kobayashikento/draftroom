'use client';

import type { CalendarDayProps } from './calendar-dnd.helpers.ts';
import { calendarDayClass } from './calendar.helpers.ts';
import { fmt, today } from '../../lib/display.ts';
import useCalendarDroppable from './use-calendar-droppable.ts';

export default function CalendarDay({ date, anchor, mode, children }: CalendarDayProps) {
  const drop = useCalendarDroppable(date);
  return (
    <section
      ref={drop.ref}
      aria-label={fmt(date, { dateStyle: 'full' })}
      aria-current={date === today() ? 'date' : undefined}
      className={calendarDayClass(date, anchor, mode, today(), drop.isDropTarget ? date : '')}
      data-calendar-date={date}
    >
      {children}
      {drop.isDropTarget && (
        <span className="planner-drop-cue" aria-hidden="true">
          Move here
        </span>
      )}
    </section>
  );
}
