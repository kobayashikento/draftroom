import type { Item, Series, Workspace } from '../../../lib/types.ts';
import { createItem } from '../../../lib/model.ts';
import { fmt } from '../../../lib/display.ts';

export type SeriesCollection = { series: Series; items: Item[] };

export function seriesEpisodeDate(item: Item): string {
  const date = item.publications.find(publication => publication.date)?.date;
  return date ? fmt(date) : 'Unscheduled';
}

export function seriesCollections(state: Workspace): SeriesCollection[] {
  return state.series.map(series => ({
    series,
    items: state.items.filter(item => item.seriesId === series.id)
  }));
}

export function createSeriesEpisode(state: Workspace, series: Series): Item {
  return createItem(state, { title: `${series.name} · next episode`, seriesId: series.id });
}
