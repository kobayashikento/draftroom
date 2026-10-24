'use client';

import { calendarPlanCounts } from './calendar.helpers.ts';
import type { CalendarSummaryProps } from './calendar.helpers.ts';
import { Check, ListTodo } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';

export default function CalendarSummary({
  entries,
  posts,
  tasks,
  dayTasks,
  mode,
  content,
  onContentChange
}: CalendarSummaryProps) {
  const counts = calendarPlanCounts(entries);
  return (
    <div className="planner-summary">
      <div className="segmented" role="group" aria-label="Calendar content">
        {(['All', 'Ideas', 'Tasks'] as const).map(value => (
          <Button
            key={value}
            className={content === value ? 'active' : ''}
            aria-pressed={content === value}
            onClick={() => onContentChange(value)}
          >
            {value === 'Ideas' ? 'Ideas & posts' : value}
          </Button>
        ))}
      </div>
      <span>
        <AppIcon icon={ListTodo} />
        {dayTasks.filter(task => !task.done).length} day tasks left
      </span>
      <span>
        {new Set(tasks.filter(({ t }) => !t.done).map(({ p }) => p.id)).size} ideas to work on
      </span>
      <span>
        <span className="status-dot" />
        {counts.planned} planned
      </span>
      <span>
        <AppIcon icon={Check} />
        {counts.posted} manually posted
      </span>
      <span>
        <AppIcon icon={Check} />
        {posts.length} synced {posts.length === 1 ? 'post' : 'posts'}
      </span>
      <span className="planner-summary-hint">
        {mode === 'List'
          ? 'Your week, one day at a time'
          : 'Drag a card onto a day, or choose a date'}
      </span>
    </div>
  );
}
