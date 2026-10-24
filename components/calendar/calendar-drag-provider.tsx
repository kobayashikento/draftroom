'use client';

import { DragDropProvider } from '@dnd-kit/react';
import type { CalendarDragProviderProps } from './calendar-dnd.helpers.ts';
import { calendarPlugins, calendarSensors } from './calendar-dnd.config.ts';
import useCalendarDrag from './use-calendar-drag.ts';
import CalendarDragOverlay from './calendar-drag-overlay';

export default function CalendarDragProvider({ children }: CalendarDragProviderProps) {
  const events = useCalendarDrag();
  return (
    <DragDropProvider sensors={calendarSensors} plugins={calendarPlugins} {...events}>
      {children}
      <CalendarDragOverlay />
    </DragDropProvider>
  );
}
