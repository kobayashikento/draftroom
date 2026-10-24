import type {
  OverviewCategory,
  OverviewSummary,
  View,
  Item,
  ProductionTask,
  Workspace,
  Publication
} from '../../../lib/types.ts';
import type { Dispatch, SetStateAction } from 'react';
import { addDays, kind, pending, scheduled } from '../../../lib/model.ts';
import { CalendarDays, Check, ListChecks, CalendarClock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fmt } from '../../../lib/display.ts';

export type OverviewSection = { title: string; destination: View; action: string; empty: string };

export function overviewResultCount(
  category: OverviewCategory,
  count: number,
  week: string
): string {
  const noun = category === 'tasks' ? 'task' : 'post';
  const scope =
    category === 'planned' ? `${fmt(week)} – ${fmt(addDays(week, 6))}` : 'Across your workspace';
  return `${count} ${noun}${count === 1 ? '' : 's'} · ${scope}`;
}

export function overviewPostDates(
  item: Item,
  category: OverviewCategory,
  week: string,
  currentDate: string
): Publication[] {
  if (category === 'overdue') return overduePublications(item, currentDate);
  if (category !== 'planned') return [];
  return item.publications.filter(
    publication =>
      publication.state !== 'manually_posted' &&
      publication.date &&
      publication.date >= week &&
      publication.date <= addDays(week, 6)
  );
}

export type OverviewResultsProps = {
  selected: OverviewCategory;
  summary: OverviewSummary;
  week: string;
  currentDate: string;
  navigate: (view: View) => void;
};

export type PostResultsProps = {
  items: Item[];
  selected: OverviewCategory;
  week: string;
  currentDate: string;
};

export type SecondaryPanelsProps = {
  work: ProductionTask[];
  ready: Item[];
  navigate: (view: View) => void;
};

export type SummaryCardsProps = {
  summary: OverviewSummary;
  selected: OverviewCategory;
  onSelect: (category: OverviewCategory) => void;
};

export function summaryPreview(summary: OverviewSummary, category: OverviewCategory): Item[] {
  const items = category === 'tasks' ? summary.tasks.map(task => task.p) : summary[category];
  return [...new Map(items.map(item => [item.id, item])).values()].slice(0, 2);
}

export type OverviewProps = {
  week: string;
  setWeek: Dispatch<SetStateAction<string>>;
  navigate: (view: View) => void;
};

export function overduePublications(item: Item, currentDate: string) {
  return item.publications.filter(
    publication =>
      publication.date && publication.date < currentDate && publication.state !== 'manually_posted'
  );
}

export function overviewSummary(
  state: Workspace,
  week: string,
  currentDate: string
): OverviewSummary {
  const plans = scheduled(state, week, addDays(week, 6)).filter(
    ({ pub }) => pub.state !== 'manually_posted'
  );
  return {
    planned: [...new Map(plans.map(({ p }) => [p.id, p])).values()],
    ready: state.items.filter(item => kind(state, item) === 'ready'),
    tasks: pending(state),
    overdue: state.items.filter(
      item => kind(state, item) !== 'posted' && overduePublications(item, currentDate).length > 0
    )
  };
}

export const sections: Record<OverviewCategory, OverviewSection> = {
  planned: {
    title: 'Posts planned',
    destination: 'Calendar',
    action: 'View calendar',
    empty: 'No posts are planned for this week yet.'
  },
  ready: {
    title: 'Ready to publish',
    destination: 'Ideas',
    action: 'View all ideas',
    empty: 'Move a finished idea to a Ready stage to find it here.'
  },
  tasks: {
    title: 'Tasks to work on',
    destination: 'Production',
    action: 'Open production',
    empty: 'You’re all caught up. No unfinished tasks in your working stages.'
  },
  overdue: {
    title: 'Need a new date',
    destination: 'Calendar',
    action: 'View calendar',
    empty: 'A little breathing room. No unposted ideas need a new date.'
  }
};

export const cards: [OverviewCategory, string, string, LucideIcon][] = [
  ['planned', 'Posts planned', 'In your selected week', CalendarDays],
  ['ready', 'Ready to publish', 'Across your workspace', Check],
  ['tasks', 'Tasks to work on', 'One small step at a time', ListChecks],
  ['overdue', 'Need a new date', 'Past dates, still unposted', CalendarClock]
];
