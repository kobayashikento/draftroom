'use client';
import type { PublicationEntry, CalendarMode } from '../../lib/types.ts';
type CalendarSummaryProps = { entries: PublicationEntry[]; mode: CalendarMode };

import { Check } from 'lucide-react';
import { AppIcon } from '../icons';

export default function CalendarSummary({ entries, mode }: CalendarSummaryProps) {
  return (
    <div className="planner-summary">
      <span>
        <span className="status-dot" />
        {entries.filter((e) => e.pub.state === 'planned').length} planned
      </span>
      <span>
        <AppIcon icon={Check} />
        {entries.filter((e) => e.pub.state === 'manually_posted').length} manually posted
      </span>
      <span className="planner-summary-hint">
        {mode === 'List'
          ? 'Your week, one day at a time'
          : 'Drag a planned card to change its date'}
      </span>
    </div>
  );
}
