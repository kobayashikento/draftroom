import { dateString, parseDate } from './model.ts';

export const fmt = (
  s: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) => parseDate(s).toLocaleDateString('en-CA', options);
export const today = () => dateString(new Date());
