'use client';

import { calendarPeriodLabel, modes, moveCalendarAnchor } from './calendar.helpers.ts';
import type { CalendarToolbarProps } from './calendar.helpers.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import { today } from '../../lib/display.ts';

export default function CalendarToolbar({
  anchor,
  mode,
  onAnchorChange,
  onModeChange
}: CalendarToolbarProps) {
  const heading = calendarPeriodLabel(anchor, mode);
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
