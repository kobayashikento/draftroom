'use client';

import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { CalendarDrag, CalendarPointerDrag } from './calendar-move.helpers.ts';
import {
  calendarMoveDetails,
  canMoveCalendarItem,
  moveCalendarItem
} from './calendar-move.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { fmt } from '../../lib/display.ts';

export default function useCalendarDrag(): CalendarDrag {
  const { state, update, notify } = useWorkspace();
  const pointer = useRef<CalendarPointerDrag | null>(null);
  const suppressClick = useRef(false);
  const [targetDate, setTargetDate] = useState('');
  function cancel() {
    pointer.current = null;
    setTargetDate('');
  }
  function dateAt(event: PointerEvent<HTMLElement>) {
    return (
      document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-calendar-date]')?.dataset.calendarDate || ''
    );
  }
  const handlers: CalendarDrag['handlers'] = target => ({
    onPointerDown(event) {
      if (event.button !== 0 || !event.isPrimary || !calendarMoveDetails(state, target)) return;
      const element = event.target instanceof Element ? event.target : event.currentTarget;
      if (element.closest('input, label, a, video, .icon-button')) return;
      pointer.current = {
        target,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moving: false
      };
      element.setPointerCapture(event.pointerId);
    },
    onPointerMove(event) {
      const current = pointer.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (!current.moving && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6)
        return;
      current.moving = true;
      event.preventDefault();
      setTargetDate(dateAt(event));
    },
    onPointerUp(event) {
      const current = pointer.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (current.moving) {
        suppressClick.current = true;
        const date = dateAt(event);
        if (canMoveCalendarItem(state, current.target, date)) {
          update(workspace => moveCalendarItem(workspace, current.target, date));
          notify(`Moved to ${fmt(date)}.`);
        }
      }
      cancel();
    },
    onPointerCancel: cancel
  });
  const clickGuard: CalendarDrag['clickGuard'] = {
    onPointerDownCapture() {
      suppressClick.current = false;
    },
    onClickCapture(event) {
      if (suppressClick.current && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      suppressClick.current = false;
    }
  };
  return { targetDate, handlers, clickGuard, cancel };
}
