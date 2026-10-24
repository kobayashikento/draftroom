'use client';
import type { CalendarMode } from '../lib/types.ts';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useWorkspace } from './workspace/workspace-context';
import { addDays } from '../lib/model';
import { calendarEntries, calendarRange } from '../lib/calendar';
import CalendarToolbar from './calendar/calendar-toolbar';
import CalendarFilters from './calendar/calendar-filters';
import CalendarSummary from './calendar/calendar-summary';
import CalendarGrid from './calendar/calendar-grid';
import CalendarAgenda from './calendar/calendar-agenda';
import UnscheduledPlans from './calendar/unscheduled-plans';
import useCalendarFilters from './calendar/use-calendar-filters';
import usePublicationDrag from './calendar/use-publication-drag';

type CalendarProps = {
  week: string;
  setWeek: Dispatch<SetStateAction<string>>;
  platform: string;
  setPlatform: Dispatch<SetStateAction<string>>;
};

export default function Calendar({ week, setWeek, platform, setPlatform }: CalendarProps) {
  const { state } = useWorkspace();
  const [mode, setMode] = useState<CalendarMode>('Week');
  const [showFilters, setShowFilters] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const filters = useCalendarFilters(platform, setPlatform);
  const drag = usePublicationDrag();
  const range = calendarRange(week, mode);
  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
  const entries = calendarEntries(state, { ...range, ...filters.values });
  const unscheduled = calendarEntries(state, { ...filters.values, unscheduled: true });
  function changeMode(value: CalendarMode) {
    setMode(value);
    drag.cancel();
  }

  return (
    <section className="planner" aria-label="Content calendar">
      <CalendarToolbar
        anchor={week}
        mode={mode}
        onAnchorChange={setWeek}
        onModeChange={changeMode}
      />
      <CalendarFilters
        filters={filters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        showUnscheduled={showUnscheduled}
        setShowUnscheduled={setShowUnscheduled}
        unscheduledCount={unscheduled.length}
      />
      <CalendarSummary entries={entries} mode={mode} />
      <div className={`planner-canvas ${showUnscheduled ? 'has-drafts' : ''}`}>
        {mode === 'List' ? (
          <CalendarAgenda days={days} entries={entries} start={range.start} platform={platform} />
        ) : (
          <CalendarGrid
            anchor={week}
            mode={mode}
            days={days}
            entries={entries}
            platform={platform}
            drag={drag}
          />
        )}
        <UnscheduledPlans
          entries={unscheduled}
          mode={mode}
          hasFilters={filters.hasFilters}
          visible={showUnscheduled}
          onClose={() => setShowUnscheduled(false)}
          drag={drag}
        />
      </div>
      <p className="planner-footnote">
        Dates are your plans. Posts are published manually. Moving a card changes only that
        channel’s date.
      </p>
    </section>
  );
}
