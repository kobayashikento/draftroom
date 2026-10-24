import type {
  PublicationEntry,
  CalendarMode,
  Workspace,
  PublicationCollection,
  CalendarEntryOptions,
  CalendarFilters,
  ProductionTask,
  ProductionGroup
} from '../../lib/types.ts';
import type { DayTaskEditorState, DayTaskOccurrence } from './day-task.helpers.ts';
import type { Dispatch, SetStateAction } from 'react';
import type { CalendarDrag, CalendarMoveTarget } from './calendar-move.helpers.ts';
import { addDays, dateString, monday, parseDate } from '../../lib/model.ts';
import { CalendarDays, CalendarRange, List } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fmt } from '../../lib/display.ts';

export type CalendarFilterController = {
  values: CalendarFilters;
  activeCount: number;
  hasFilters: boolean;
  setValue: (key: keyof CalendarFilters, value: string) => void;
  reset: () => void;
};
export type CalendarDateRange = { start: string; end: string; days: number };
export type CalendarPlanCounts = { planned: number; posted: number };
export type CalendarContent = 'All' | 'Ideas' | 'Tasks';
export type CalendarProductionCardsProps = {
  tasks: ProductionTask[];
  date: string;
  drag?: CalendarDrag;
  onMove: (target: CalendarMoveTarget) => void;
};

export const emptyCalendarFilters = { format: '', seriesId: '', status: '', query: '' };

export function calendarFilterState(values: CalendarFilters) {
  const activeCount = [values.format, values.seriesId, values.status].filter(Boolean).length;
  return { activeCount, hasFilters: Boolean(activeCount || values.platform || values.query) };
}

export function calendarDays(range: CalendarDateRange): string[] {
  return Array.from({ length: range.days }, (_, index) => addDays(range.start, index));
}

export function calendarPeriodLabel(anchor: string, mode: CalendarMode): string {
  const range = calendarRange(anchor, mode);
  return mode === 'Month'
    ? fmt(anchor, { month: 'long', year: 'numeric' })
    : `${fmt(range.start)} – ${fmt(range.end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function calendarPlanCounts(entries: PublicationEntry[]): CalendarPlanCounts {
  return {
    planned: entries.filter(entry => entry.pub.state === 'planned').length,
    posted: entries.filter(entry => entry.pub.state === 'manually_posted').length
  };
}

export function calendarDayClass(
  date: string,
  anchor: string,
  mode: CalendarMode,
  currentDate: string,
  targetDate: string
): string {
  return [
    'planner-day',
    date === currentDate && 'is-today',
    mode === 'Month' && date.slice(0, 7) !== anchor.slice(0, 7) && 'is-outside',
    targetDate === date && 'is-drop-target'
  ]
    .filter(Boolean)
    .join(' ');
}

export type CalendarAgendaProps = {
  content: CalendarContent;
  days: string[];
  entries: PublicationEntry[];
  tasks: ProductionTask[];
  dayTasks: DayTaskOccurrence[];
  start: string;
  platform: string;
  onAddTask: (date: string) => void;
  onEditTask: (task: DayTaskEditorState) => void;
  onMove: (target: CalendarMoveTarget) => void;
};

export type CalendarFiltersProps = {
  filters: CalendarFilterController;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  showUnscheduled: boolean;
  setShowUnscheduled: Dispatch<SetStateAction<boolean>>;
  unscheduledCount: number;
};

export type CalendarGridProps = {
  content: CalendarContent;
  anchor: string;
  mode: CalendarMode;
  days: string[];
  entries: PublicationEntry[];
  tasks: ProductionTask[];
  dayTasks: DayTaskOccurrence[];
  platform: string;
  drag: CalendarDrag;
  onAddTask: (date: string) => void;
  onEditTask: (task: DayTaskEditorState) => void;
  onMove: (target: CalendarMoveTarget) => void;
};

export type CalendarSummaryProps = {
  entries: PublicationEntry[];
  tasks: ProductionTask[];
  dayTasks: DayTaskOccurrence[];
  mode: CalendarMode;
  content: CalendarContent;
  onContentChange: (content: CalendarContent) => void;
};

export type CalendarToolbarProps = {
  anchor: string;
  mode: CalendarMode;
  onAnchorChange: (anchor: string) => void;
  onModeChange: (mode: CalendarMode) => void;
  onAddTask: () => void;
};

export type PublicationCardsProps = {
  entries: PublicationEntry[];
  compact?: boolean;
  drag?: CalendarDrag;
};

export type PublicationCardProps = PublicationEntry & {
  compact: boolean;
  drag?: CalendarDrag;
};

export type UnscheduledPlansProps = {
  entries: PublicationEntry[];
  mode: CalendarMode;
  hasFilters: boolean;
  visible: boolean;
  onClose: () => void;
  drag: CalendarDrag;
};

export type CalendarProps = {
  week: string;
  setWeek: Dispatch<SetStateAction<string>>;
  platform: string;
  setPlatform: Dispatch<SetStateAction<string>>;
};

export function calendarRange(anchor: string, mode: CalendarMode = 'Week') {
  if (mode !== 'Month') {
    const start = monday(anchor);
    return { start, end: addDays(start, 6), days: 7 };
  }
  const first = `${anchor.slice(0, 7)}-01`;
  const last = parseDate(first);
  last.setMonth(last.getMonth() + 1, 0);
  const start = monday(first);
  const offset = (parseDate(first).getDay() + 6) % 7;
  const days = Math.ceil((offset + last.getDate()) / 7) * 7;
  return { start, end: addDays(start, days - 1), days };
}

export function moveCalendarAnchor(anchor: string, mode: CalendarMode, delta: number) {
  if (mode !== 'Month') return addDays(monday(anchor), delta * 7);
  const date = parseDate(`${anchor.slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + delta);
  return dateString(date);
}

export function calendarEntries(
  state: Workspace,
  {
    start,
    end,
    platform = '',
    format = '',
    seriesId = '',
    status = '',
    query = '',
    unscheduled = false
  }: CalendarEntryOptions = {}
) {
  const search = query.trim().toLocaleLowerCase();
  return state.items
    .flatMap(p => p.publications.map(pub => ({ p, pub })))
    .filter(({ p, pub }) => {
      if (
        unscheduled
          ? pub.date || pub.state === 'manually_posted'
          : !pub.date || (start && pub.date < start) || (end && pub.date > end)
      )
        return false;
      return (
        (!platform || pub.platform === platform) &&
        (!format || p.format === format) &&
        (!seriesId || p.seriesId === seriesId) &&
        (!status || pub.state === status) &&
        (!search || `${p.title} ${p.tags} ${pub.caption}`.toLocaleLowerCase().includes(search))
      );
    })
    .sort((a, b) => a.pub.date.localeCompare(b.pub.date));
}

export function calendarTasks(
  state: Workspace,
  {
    start,
    end,
    platform = '',
    format = '',
    seriesId = '',
    status = '',
    query = ''
  }: CalendarEntryOptions = {}
): ProductionTask[] {
  const search = query.trim().toLocaleLowerCase();
  return state.items
    .filter(
      item =>
        (!format || item.format === format) &&
        (!seriesId || item.seriesId === seriesId) &&
        item.publications.some(
          pub => (!platform || pub.platform === platform) && (!status || pub.state === status)
        )
    )
    .flatMap(p => p.tasks.map(t => ({ p, t })))
    .filter(
      ({ p, t }) =>
        t.due &&
        (!start || t.due >= start) &&
        (!end || t.due <= end) &&
        (!search ||
          `${p.title} ${p.tags} ${t.title} ${t.category}`.toLocaleLowerCase().includes(search))
    )
    .sort((a, b) => a.t.due.localeCompare(b.t.due) || Number(a.t.done) - Number(b.t.done));
}

export function calendarProductionGroups(tasks: ProductionTask[]): ProductionGroup[] {
  const groups = new Map<string, ProductionGroup>();
  for (const task of tasks) {
    const group = groups.get(task.p.id) || { item: task.p, tasks: [] };
    group.tasks.push(task);
    groups.set(task.p.id, group);
  }
  return [...groups.values()];
}

// Only the selected platform's plan moves. Posted records, task due dates,
// workflow stages, and other channels keep their existing values.
export function reschedulePublication(
  item: PublicationCollection,
  publicationId: string,
  date: unknown
) {
  const pub = item.publications.find(entry => entry.id === publicationId);
  if (!pub || pub.state === 'manually_posted') return false;
  if (typeof date !== 'string') return false;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dateString(parseDate(date)) !== date))
    return false;
  pub.date = date;
  return true;
}

export const modes: [CalendarMode, LucideIcon][] = [
  ['Week', CalendarDays],
  ['Month', CalendarRange],
  ['List', List]
];
