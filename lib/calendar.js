import { addDays, dateString, monday, parseDate } from './model.js';

export function calendarRange(anchor, mode = 'Week') {
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

export function moveCalendarAnchor(anchor, mode, delta) {
  if (mode !== 'Month') return addDays(monday(anchor), delta * 7);
  const date = parseDate(`${anchor.slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + delta);
  return dateString(date);
}

export function calendarEntries(
  state,
  {
    start,
    end,
    platform = '',
    format = '',
    seriesId = '',
    status = '',
    query = '',
    unscheduled = false,
  } = {},
) {
  const search = query.trim().toLocaleLowerCase();
  return state.items
    .flatMap((p) => p.publications.map((pub) => ({ p, pub })))
    .filter(({ p, pub }) => {
      if (
        unscheduled
          ? pub.date || pub.state === 'manually_posted'
          : !pub.date || pub.date < start || pub.date > end
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
export function reschedulePublication(item, publicationId, date) {
  const pub = item.publications.find((entry) => entry.id === publicationId);
  if (!pub || pub.state === 'manually_posted') return false;
  if (typeof date !== 'string') return false;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dateString(parseDate(date)) !== date))
    return false;
  pub.date = date;
  return true;
}
