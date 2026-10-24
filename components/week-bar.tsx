'use client';

import { weekBarLabel } from './layout/layout.helpers.ts';
import type { WeekBarProps } from './layout/layout.helpers.ts';
import { moveCalendarAnchor } from './calendar/calendar.helpers.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppIcon } from './icons';
import { Button } from './ui';
import { today } from '../lib/display.ts';
import { monday } from '../lib/model.ts';

export default function WeekBar({ week, setWeek, mode = 'Week' }: WeekBarProps) {
  const move = (delta: number) => setWeek(moveCalendarAnchor(week, mode, delta));
  return (
    <div className="weekbar">
      <strong>{weekBarLabel(week, mode)}</strong>
      <Button className="icon-button" aria-label="Previous period" onClick={() => move(-1)}>
        <AppIcon icon={ChevronLeft} />
      </Button>
      <Button className="icon-button" aria-label="Next period" onClick={() => move(1)}>
        <AppIcon icon={ChevronRight} />
      </Button>
      <Button className="small" onClick={() => setWeek(monday(today()))}>
        Today
      </Button>
      <span className="muted">
        {mode === 'Month' ? 'Your creative month' : 'Your creative week'}
      </span>
    </div>
  );
}
