'use client';

import { useState } from 'react';
import type { CalendarMode } from '../../lib/types.ts';
import type { CalendarContent } from './calendar.helpers.ts';
import type { DayTaskEditorState } from './day-task.helpers.ts';
import type { CalendarMoveTarget } from './calendar-move.helpers.ts';

export default function useCalendarView() {
  const [mode, setMode] = useState<CalendarMode>('Week');
  const [content, setContent] = useState<CalendarContent>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [taskEditor, setTaskEditor] = useState<DayTaskEditorState | null>(null);
  const [moveTarget, setMoveTarget] = useState<CalendarMoveTarget | null>(null);
  return {
    mode,
    setMode,
    content,
    setContent,
    showFilters,
    setShowFilters,
    showUnscheduled,
    setShowUnscheduled,
    taskEditor,
    setTaskEditor,
    moveTarget,
    setMoveTarget
  };
}
