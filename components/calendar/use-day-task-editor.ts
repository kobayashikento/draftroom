'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DayTaskDraft, DayTaskEditorProps } from './day-task.helpers.ts';
import { dayTaskError, removeDayTask, saveDayTask } from './day-task.helpers.ts';
import { useWorkspace } from '../workspace/workspace-context';

export default function useDayTaskEditor({ id, date, onClose }: DayTaskEditorProps) {
  const { state, update, notify } = useWorkspace();
  const existing = state.calendarTasks?.find(task => task.id === id);
  const [draft, setDraft] = useState<DayTaskDraft>(() => ({
    title: existing?.title || '',
    date: existing?.date || date,
    repeat: existing?.repeat || 'none'
  }));
  const [submitted, setSubmitted] = useState(false);
  const error = id && !existing ? 'This task has been removed.' : dayTaskError(draft);
  function setField<K extends keyof DayTaskDraft>(key: K, value: DayTaskDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (error) return;
    update(workspace => saveDayTask(workspace, draft, id));
    notify(id ? 'Day task updated.' : 'A little structure for your day. Task added.');
    onClose();
  }
  function remove() {
    if (!id) return;
    update(workspace => removeDayTask(workspace, id));
    notify('Day task removed.');
    onClose();
  }
  return { draft, setField, submit, remove, error: submitted || (id && !existing) ? error : '' };
}
