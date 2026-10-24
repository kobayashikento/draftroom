'use client';

import { calendarPlanCounts } from './calendar.helpers.ts';
import type { CalendarSummaryProps } from './calendar.helpers.ts';
import { Check } from 'lucide-react';
import { AppIcon } from '../icons';

export default function CalendarSummary({ entries, mode }: CalendarSummaryProps) {
  const counts = calendarPlanCounts(entries);
  return (
    <div className="planner-summary">
      <span>
        <span className="status-dot" />
        {counts.planned} planned
      </span>
      <span>
        <AppIcon icon={Check} />
        {counts.posted} manually posted
      </span>
      <span className="planner-summary-hint">
        {mode === 'List'
          ? 'Your week, one day at a time'
          : 'Drag a planned card to change its date'}
      </span>
    </div>
  );
}
