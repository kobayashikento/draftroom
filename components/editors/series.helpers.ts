import type { Format, Series, Workspace } from '../../lib/types.ts';
import { uid } from '../../lib/model.ts';

export type SeriesForm = {
  name: string;
  description: string;
  format: Format;
  cadence: string;
  storyboard: string;
  tasks: string;
};

export function seriesForm(series?: Series): SeriesForm {
  return {
    name: series?.name || '',
    description: series?.description || '',
    format: series?.format || 'Reel',
    cadence: series?.cadence || 'Weekly',
    storyboard: (series?.storyboard || ['Opening hook', 'Main moment', 'Closing shot']).join('\n'),
    tasks: (series?.tasks || ['Plan shots', 'Film clips', 'Edit video', 'Write caption']).join('\n')
  };
}

export function templateLines(text: string): string[] {
  return text.split('\n').filter(line => line.trim());
}

export function saveSeriesTemplate(state: Workspace, form: SeriesForm, id?: string): boolean {
  const name = form.name.trim();
  if (!name) return false;
  const data = {
    ...form,
    name,
    storyboard: templateLines(form.storyboard),
    tasks: templateLines(form.tasks)
  };
  if (id) {
    const series = state.series.find(series => series.id === id);
    if (!series) return false;
    Object.assign(series, data);
  } else state.series.push({ ...data, id: uid(), icon: 'sparkles' });
  return true;
}
