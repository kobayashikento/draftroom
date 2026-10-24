'use client';

import { calendarDayClass } from './calendar.helpers.ts';
import type { CalendarGridProps } from './calendar.helpers.ts';
import { Plus } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { fmt, today } from '../../lib/display.ts';
import { parseDate } from '../../lib/model.ts';
import { PublicationCards } from './publication-card';

export default function CalendarGrid({
  anchor,
  mode,
  days,
  entries,
  platform,
  drag
}: CalendarGridProps) {
  const { setModal } = useWorkspace();
  return (
    <div
      className="planner-scroll"
      role="region"
      aria-label={`${mode} calendar, scroll horizontally for more days`}
      tabIndex={0}
    >
      <div className={`planner-grid planner-${mode.toLowerCase()}`}>
        {mode === 'Month' &&
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div className="planner-weekday" key={day}>
              {day}
            </div>
          ))}
        {days.map(date => {
          const dayEntries = entries.filter(e => e.pub.date === date);
          return (
            <section
              key={date}
              aria-label={fmt(date, { dateStyle: 'full' })}
              aria-current={date === today() ? 'date' : undefined}
              className={calendarDayClass(date, anchor, mode, today(), drag.targetDate)}
              onDragOver={event => drag.over(date, event)}
              onDragLeave={drag.leave}
              onDrop={event => drag.drop(date, event)}
            >
              <header className="planner-day-head">
                <div>
                  {mode === 'Week' && <span>{fmt(date, { weekday: 'short' })}</span>}
                  <strong>{parseDate(date).getDate()}</strong>
                  {date === today() && <span className="sr-only">Today</span>}
                </div>
                <Button
                  className="icon-button"
                  aria-label={`Add idea on ${date}`}
                  onClick={() => setModal({ type: 'add', date, platform })}
                >
                  <AppIcon icon={Plus} />
                </Button>
              </header>
              <div className="planner-day-cards">
                <PublicationCards
                  entries={dayEntries}
                  compact={mode === 'Month'}
                  canDrag
                  onDragStart={drag.start}
                  onDragEnd={drag.cancel}
                />
              </div>
              {mode === 'Week' && !dayEntries.length && (
                <Button
                  className="planner-add"
                  aria-label={`Plan an idea on ${date}`}
                  onClick={() => setModal({ type: 'add', date, platform })}
                >
                  <AppIcon icon={Plus} />
                  <span>Room for an idea</span>
                </Button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
