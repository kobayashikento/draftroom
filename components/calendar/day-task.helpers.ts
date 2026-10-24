import type { CalendarTask, Workspace } from '../../lib/types.ts';
import type { CalendarDateRange } from './calendar.helpers.ts';
import { addDays, dateString, parseDate, uid } from '../../lib/model.ts';

export type DayTaskDraft = {
  title: string;
  date: string;
  repeat: CalendarTask['repeat'];
};
export type DayTaskEditorState = { date: string; id?: string };
export type DayTaskEditorProps = DayTaskEditorState & { onClose: () => void };
export type DayTaskOccurrence = { task: CalendarTask; date: string; done: boolean };
export type DayTaskCardsProps = {
  tasks: DayTaskOccurrence[];
  onEdit: (task: DayTaskEditorState) => void;
};

export function dayTaskOccursOn(task: CalendarTask, date: string): boolean {
  return (
    date >= task.date &&
    (task.repeat === 'weekly'
      ? parseDate(date).getDay() === parseDate(task.date).getDay()
      : date === task.date)
  );
}

export function calendarDayTasks(
  state: Workspace,
  range: CalendarDateRange,
  query = ''
): DayTaskOccurrence[] {
  const search = query.trim().toLocaleLowerCase();
  const days = Array.from({ length: range.days }, (_, index) => addDays(range.start, index));
  return days
    .flatMap(date =>
      (state.calendarTasks || [])
        .filter(
          task =>
            (!search || task.title.toLocaleLowerCase().includes(search)) &&
            dayTaskOccursOn(task, date)
        )
        .map(task => ({ task, date, done: task.completedDates.includes(date) }))
    )
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done));
}

export function dayTaskError(draft: DayTaskDraft): string {
  if (!draft.title.trim()) return 'Give your task a name.';
  if (draft.title.trim().length > 240) return 'Keep the task name to 240 characters or fewer.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || dateString(parseDate(draft.date)) !== draft.date) {
    return 'Choose a valid day for your task.';
  }
  if (draft.repeat !== 'none' && draft.repeat !== 'weekly') return 'Choose a valid repeat option.';
  return '';
}

export function saveDayTask(state: Workspace, draft: DayTaskDraft, id?: string): boolean {
  if (dayTaskError(draft)) return false;
  const existing = id ? state.calendarTasks?.find(task => task.id === id) : undefined;
  if (id && !existing) return false;
  if (existing) {
    existing.title = draft.title.trim();
    existing.date = draft.date;
    existing.repeat = draft.repeat;
    existing.completedDates = existing.completedDates.filter(date =>
      dayTaskOccursOn(existing, date)
    );
  } else {
    state.calendarTasks ??= [];
    state.calendarTasks.push({
      ...draft,
      id: uid(),
      title: draft.title.trim(),
      completedDates: []
    });
  }
  return true;
}

export function completeDayTask(state: Workspace, id: string, date: string, done: boolean): void {
  const task = state.calendarTasks?.find(task => task.id === id);
  if (!task || !dayTaskOccursOn(task, date)) return;
  task.completedDates = task.completedDates.filter(value => value !== date);
  if (done) task.completedDates.push(date);
}

export function removeDayTask(state: Workspace, id: string): void {
  if (state.calendarTasks) state.calendarTasks = state.calendarTasks.filter(task => task.id !== id);
}
