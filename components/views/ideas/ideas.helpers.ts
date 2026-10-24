import type { Format, Item, Platform, Stage, Workspace } from '../../../lib/types.ts';
import { addDays, monday } from '../../../lib/model.ts';

export type IdeasMode = 'Board' | 'List';
export type IdeaDateFilter = '' | 'unscheduled' | 'week';
export type IdeaFilters = {
  query: string;
  stage: string;
  format: Format | '';
  series: string;
  platform: Platform | '';
  date: IdeaDateFilter;
};
export type IdeaColumn = { stage: Stage; items: Item[] };

export const ideasModes: IdeasMode[] = ['Board', 'List'];
export const emptyIdeaFilters: IdeaFilters = {
  query: '',
  stage: '',
  format: '',
  series: '',
  platform: '',
  date: ''
};

export function filterIdeas(items: Item[], filters: IdeaFilters, currentDate: string): Item[] {
  const query = filters.query.toLowerCase();
  const start = monday(currentDate);
  const end = addDays(start, 6);
  return items.filter(
    item =>
      `${item.title} ${item.tags}`.toLowerCase().includes(query) &&
      (!filters.stage || item.stageId === filters.stage) &&
      (!filters.format || item.format === filters.format) &&
      (!filters.series || item.seriesId === filters.series) &&
      (!filters.platform ||
        item.publications.some(plan => plan.platform === filters.platform && plan.date)) &&
      (!filters.date ||
        (filters.date === 'unscheduled'
          ? !item.publications.some(plan => plan.date)
          : item.publications.some(plan => plan.date >= start && plan.date <= end)))
  );
}

export function ideaColumns(state: Workspace, items: Item[]): IdeaColumn[] {
  return state.stages.map(stage => ({
    stage,
    items: items.filter(item => item.stageId === stage.id)
  }));
}

export function changeIdeaFilter(
  filters: IdeaFilters,
  key: keyof IdeaFilters,
  value: string
): IdeaFilters {
  if (key === 'format' && value !== '' && value !== 'Reel' && value !== 'Carousel') return filters;
  if (key === 'platform' && value !== '' && value !== 'Instagram' && value !== 'TikTok')
    return filters;
  if (key === 'date' && value !== '' && value !== 'unscheduled' && value !== 'week') return filters;
  return { ...filters, [key]: value };
}
