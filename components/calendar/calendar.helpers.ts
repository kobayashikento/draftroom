import type {
  PublicationEntry,
  CalendarMode,
  Item,
  Publication,
  Workspace,
  PublicationCollection,
  CalendarEntryOptions,
  CalendarFilters
} from '../../lib/types.ts';
import type { Dispatch, SetStateAction, DragEvent, DragEventHandler } from 'react';
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
export type DraggedPublication = { itemId: string; publicationId: string };
export type PublicationDrag = {
  targetDate: string;
  start: (event: DragEvent<HTMLElement>, item: Item, publication: Publication) => void;
  over: (date: string, event: DragEvent<HTMLElement>) => void;
  leave: DragEventHandler<HTMLElement>;
  drop: (date: string, event: DragEvent<HTMLElement>) => void;
  cancel: () => void;
};
export type CalendarDateRange = { start: string; end: string; days: number };
export type CalendarPlanCounts = { planned: number; posted: number };

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
  days: string[];
  entries: PublicationEntry[];
  start: string;
  platform: string;
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
  anchor: string;
  mode: CalendarMode;
  days: string[];
  entries: PublicationEntry[];
  platform: string;
  drag: PublicationDrag;
};

export type CalendarSummaryProps = { entries: PublicationEntry[]; mode: CalendarMode };

export type CalendarToolbarProps = {
  anchor: string;
  mode: CalendarMode;
  onAnchorChange: (anchor: string) => void;
  onModeChange: (mode: CalendarMode) => void;
};

export type PublicationCardsProps = {
  entries: PublicationEntry[];
  compact?: boolean;
  canDrag?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>, item: Item, publication: Publication) => void;
  onDragEnd?: DragEventHandler<HTMLElement>;
};

export type PublicationCardProps = PublicationEntry & {
  compact: boolean;
  canDrag: boolean;
  onDragStart?: DragEventHandler<HTMLElement>;
  onDragEnd?: DragEventHandler<HTMLElement>;
};

export type UnscheduledPlansProps = {
  entries: PublicationEntry[];
  mode: CalendarMode;
  hasFilters: boolean;
  visible: boolean;
  onClose: () => void;
  drag: PublicationDrag;
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
