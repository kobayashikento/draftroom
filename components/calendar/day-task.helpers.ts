import type { CalendarTask, Workspace } from '../../lib/types.ts';
import type { CalendarDateRange } from './calendar.helpers.ts';
import type { CalendarDrag, CalendarMoveTarget } from './calendar-move.helpers.ts';
import { addDays, dateString, parseDate, uid } from '../../lib/model.ts';

export type DayTaskDraft = {
  title: string;
  date: string;
  repeat: CalendarTask['repeat'];
};
export type DayTaskEditorState = { date: string; id?: string };
export type DayTaskEditorProps = DayTaskEditorState & { onClose: () => void };
export type DayTaskOccurrence = {
  task: CalendarTask;
  date: string;
  scheduledDate: string;
  done: boolean;
};
export type DayTaskCardsProps = {
  tasks: DayTaskOccurrence[];
  onEdit: (task: DayTaskEditorState) => void;
  drag?: CalendarDrag;
  onMove: (target: CalendarMoveTarget) => void;
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
  return (state.calendarTasks || [])
    .filter(task => !search || task.title.toLocaleLowerCase().includes(search))
    .flatMap(task =>
      [...new Set([...days, ...Object.keys(task.movedDates || {})])]
        .filter(scheduledDate => dayTaskOccursOn(task, scheduledDate))
        .map(scheduledDate => ({
          task,
          scheduledDate,
          date: task.movedDates?.[scheduledDate] || scheduledDate,
          done: task.completedDates.includes(scheduledDate)
        }))
        .filter(occurrence => occurrence.date >= range.start && occurrence.date <= range.end)
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
    if (existing.date !== draft.date || existing.repeat !== draft.repeat)
      delete existing.movedDates;
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

export function moveDayTask(
  state: Workspace,
  id: string,
  scheduledDate: string,
  date: string
): boolean {
  const task = state.calendarTasks?.find(task => task.id === id);
  if (
    !task ||
    !dayTaskOccursOn(task, scheduledDate) ||
    dayTaskError({ title: task.title, date, repeat: task.repeat })
  )
    return false;
  const currentDate = task.movedDates?.[scheduledDate] || scheduledDate;
  if (currentDate === date) return false;
  if (task.repeat === 'none') {
    task.date = date;
    task.completedDates = task.completedDates.includes(scheduledDate) ? [date] : [];
  } else if (date === scheduledDate) {
    delete task.movedDates?.[scheduledDate];
    if (!Object.keys(task.movedDates || {}).length) delete task.movedDates;
  } else {
    task.movedDates = { ...task.movedDates, [scheduledDate]: date };
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
