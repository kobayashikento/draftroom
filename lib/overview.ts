import type { Item, Workspace, OverviewSummary } from './types.ts';
import { addDays, kind, pending, scheduled } from './model.ts';

export function overduePublications(item: Item, currentDate: string) {
  return item.publications.filter(
    (publication) =>
      publication.date && publication.date < currentDate && publication.state !== 'manually_posted',
  );
}

export function overviewSummary(state: Workspace, week: string, currentDate: string): OverviewSummary {
  const plans = scheduled(state, week, addDays(week, 6)).filter(
    ({ pub }) => pub.state !== 'manually_posted',
  );
  return {
    planned: [...new Map(plans.map(({ p }) => [p.id, p])).values()],
    ready: state.items.filter((item) => kind(state, item) === 'ready'),
    tasks: pending(state),
    overdue: state.items.filter(
      (item) => kind(state, item) !== 'posted' && overduePublications(item, currentDate).length > 0,
    ),
  };
}
