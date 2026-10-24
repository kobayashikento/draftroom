'use client';
import type { LucideIcon } from 'lucide-react';
import type { CalendarMode } from '../../lib/types.ts';
import { CalendarDays, CalendarRange, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import { fmt, today } from '../../lib/display.ts';
import { calendarRange, moveCalendarAnchor } from '../../lib/calendar';

type CalendarToolbarProps = {
  anchor: string;
  mode: CalendarMode;
  onAnchorChange: (anchor: string) => void;
  onModeChange: (mode: CalendarMode) => void;
};

const modes: [CalendarMode, LucideIcon][] = [
  ['Week', CalendarDays],
  ['Month', CalendarRange],
  ['List', List],
];

export default function CalendarToolbar({
  anchor,
  mode,
  onAnchorChange,
  onModeChange,
}: CalendarToolbarProps) {
  const range = calendarRange(anchor, mode);
  const heading =
    mode === 'Month'
      ? fmt(anchor, { month: 'long', year: 'numeric' })
      : `${fmt(range.start)} – ${fmt(range.end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return (
    <div className="planner-toolbar">
      <div className="planner-period">
        <div className="planner-arrows">
          <Button
            className="icon-button"
            aria-label="Previous period"
            onClick={() => onAnchorChange(moveCalendarAnchor(anchor, mode, -1))}
          >
            <AppIcon icon={ChevronLeft} />
          </Button>
          <Button
            className="icon-button"
            aria-label="Next period"
            onClick={() => onAnchorChange(moveCalendarAnchor(anchor, mode, 1))}
          >
            <AppIcon icon={ChevronRight} />
          </Button>
        </div>
        <h2 aria-live="polite">{heading}</h2>
        <Button className="small" onClick={() => onAnchorChange(today())}>
          Today
        </Button>
      </div>
      <div className="planner-view segmented" role="group" aria-label="Calendar view">
        {modes.map(([name, Icon]) => (
          <Button
            key={name}
            className={mode === name ? 'active' : ''}
            aria-pressed={mode === name}
            onClick={() => onModeChange(name)}
          >
            <AppIcon icon={Icon} />
            {name}
          </Button>
        ))}
      </div>
    </div>
  );
}
