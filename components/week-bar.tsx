'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { CalendarMode } from '../lib/types.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppIcon } from './icons';
import { Button } from './ui';
import { fmt, today } from '../lib/display.ts';
import { addDays, parseDate, dateString, monday } from '../lib/model';

type WeekBarProps = {
  week: string;
  setWeek: Dispatch<SetStateAction<string>>;
  mode?: CalendarMode;
};

export default function WeekBar({ week, setWeek, mode = 'Week' }: WeekBarProps) {
  const move = (delta: number) => {
    if (mode === 'Month') {
      let d = parseDate(week);
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
      setWeek(dateString(d));
    } else setWeek(addDays(monday(week), delta * 7));
  };
  return (
    <div className="weekbar">
      <strong>
        {mode === 'Month'
          ? fmt(week, { month: 'long', year: 'numeric' })
          : `${fmt(week)} – ${fmt(addDays(week, 6))}, ${parseDate(week).getFullYear()}`}
      </strong>
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
