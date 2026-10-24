'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CalendarMoveEditorProps } from './calendar-move.helpers.ts';
import {
  calendarMoveDetails,
  canMoveCalendarItem,
  moveCalendarItem
} from './calendar-move.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { fmt } from '../../lib/display.ts';

export default function useCalendarMove({ target, onClose }: CalendarMoveEditorProps) {
  const { state, update, notify } = useWorkspace();
  const details = calendarMoveDetails(state, target);
  const [date, setDate] = useState(details?.date || '');
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canMoveCalendarItem(state, target, date)) {
      setError('Choose a new date for an item that can still be moved.');
      return;
    }
    update(workspace => moveCalendarItem(workspace, target, date));
    notify(`Moved to ${fmt(date)}.`);
    onClose();
  }
  return { details, date, setDate, error, submit };
}
