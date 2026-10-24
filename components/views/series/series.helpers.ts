import type { Item, Series, Workspace } from '../../../lib/types.ts';
import { createItem } from '../../../lib/model.ts';

export type SeriesCollection = { series: Series; items: Item[] };

export function seriesCollections(state: Workspace): SeriesCollection[] {
  return state.series.map(series => ({
    series,
    items: state.items.filter(item => item.seriesId === series.id)
  }));
}

export function createSeriesEpisode(state: Workspace, series: Series): Item {
  return createItem(state, { title: `${series.name} · next episode`, seriesId: series.id });
}
