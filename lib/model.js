export const uid = () => crypto.randomUUID();
export const dateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDate = (s) => new Date(s + 'T12:00:00');
export const addDays = (s, n) => {
  let d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateString(d);
};
export const monday = (s) => {
  let d = parseDate(s);
  return addDays(s, -((d.getDay() + 6) % 7));
};
export function seed() {
  const stages = [
    ['idea', 'Idea', 'prep'],
    ['progress', 'In progress', 'prep'],
    ['editing', 'Editing', 'prep'],
    ['ready', 'Ready', 'ready'],
    ['posted', 'Posted', 'posted'],
  ].map(([id, name, kind]) => ({ id, name, kind }));
  const series = [
    ['emi', 'The Emi Diaries', 'Reel', 'Weekly', 'Little moments with a big personality.', '♡'],
    [
      'obsessed',
      'Currently Obsessed',
      'Carousel',
      'Monthly',
      'A few favourites worth sharing.',
      '✧',
    ],
    ['matcha', 'Matcha Mornings', 'Reel', 'Weekly', 'A slower start, one cup at a time.', '♧'],
    ['joys', 'Little Joys Lately', 'Carousel', 'Monthly', 'Collect the good in the everyday.', '☼'],
  ].map(([id, name, format, cadence, description, icon]) => ({
    id,
    name,
    format,
    cadence,
    description,
    icon,
    storyboard:
      format === 'Reel'
        ? ['The opening hook', 'A little detail', 'The main moment', 'The closing shot']
        : [
            'Cover: little joys lately',
            'My morning matcha',
            'A moment with Emi',
            'A cozy game',
            'Something delicious',
            'A little question for you',
          ],
    tasks:
      format === 'Reel'
        ? ['Plan shots', 'Film clips', 'Edit video', 'Write caption']
        : [
            'Plan slides',
            'Photograph / select images',
            'Write slide notes',
            'Design / export carousel',
          ],
  }));
  const specs = [
    [
      'The many personalities of Emi',
      'emi',
      'editing',
      '2026-10-26',
      ['Choose pretty clip', 'Find silly clips', 'Edit clips', 'Write caption'],
    ],
    [
      'Currently obsessed with lately',
      'obsessed',
      'idea',
      '2026-10-28',
      ['Pick six favourites', 'Photograph favourites', 'Write slide notes', 'Design carousel'],
    ],
    [
      'Matcha mornings',
      'matcha',
      'ready',
      '2026-10-30',
      ['Film prep', 'Film finished drink', 'Edit video', 'Write caption'],
    ],
    [
      'Little joys lately',
      'joys',
      'progress',
      '2026-11-01',
      ['Collect photos', 'Write notes', 'Select cover', 'Design carousel'],
    ],
  ];
  const state = { version: 1, stages, series, items: [] };
  state.items = specs.map(([title, sid, stage, date, tasks], i) => {
    let p = createItem(state, { title, seriesId: sid });
    p.stageId = stage;
    p.publications[0].date = date;
    p.publications[1].date = i === 0 ? '2026-10-27' : '';
    p.tasks = tasks.map((title, j) => ({
      id: uid(),
      title,
      category: ['plan', 'film', 'edit', 'caption'][j],
      done: i === 2 || j < (i === 0 ? 2 : i === 3 ? 1 : 0),
      due: addDays(date, -2),
    }));
    return p;
  });
  return state;
}
export function createItem(state, { title, format, seriesId = '' }) {
  const s = state.series.find((x) => x.id === seriesId);
  format = format || s?.format || 'Reel';
  return {
    id: uid(),
    title,
    format,
    seriesId,
    stageId: state.stages[0].id,
    hook: '',
    notes: '',
    tags: '',
    priority: 'Normal',
    cadence: s?.cadence || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storyboard: (
      s?.storyboard ||
      (format === 'Reel'
        ? ['Opening hook', 'Main moment', 'Closing shot']
        : ['Cover', 'Photo 1', 'Photo 2', 'Photo 3', 'Photo 4', 'Closing question'])
    ).map((title) => ({ id: uid(), title, notes: '', overlay: '', reference: '', done: false })),
    tasks: (
      s?.tasks ||
      (format === 'Reel'
        ? ['Plan shots', 'Film clips', 'Edit video', 'Write caption']
        : [
            'Plan slides',
            'Photograph / select images',
            'Write slide notes',
            'Design / export carousel',
          ])
    ).map((title, i) => ({
      id: uid(),
      title,
      category: ['plan', format === 'Reel' ? 'film' : 'photo', 'edit', 'caption'][i],
      done: false,
      due: '',
    })),
    publications: ['Instagram', 'TikTok'].map((platform) => ({
      id: uid(),
      platform,
      date: '',
      caption: '',
      url: '',
      postId: '',
      state: 'planned',
      publishedAt: null,
    })),
  };
}
export const kind = (state, p) => state.stages.find((x) => x.id === p.stageId)?.kind || 'prep';
export const scheduled = (state, start, end) =>
  state.items
    .flatMap((p) =>
      p.publications
        .filter((x) => x.date && x.date >= start && x.date <= end)
        .map((pub) => ({ p, pub })),
    )
    .sort((a, b) => a.pub.date.localeCompare(b.pub.date));
function compareProductionTasks(a, b) {
  const due = ({ p, t }) => t.due || p.publications.find((x) => x.date)?.date || '9999';
  return (
    Number(b.t.priority === 'High') - Number(a.t.priority === 'High') ||
    Number(b.p.priority === 'High') - Number(a.p.priority === 'High') ||
    due(a).localeCompare(due(b))
  );
}
export const productionTasks = (state) =>
  state.items
    .filter((p) => kind(state, p) === 'prep')
    .flatMap((p) => p.tasks.map((t) => ({ p, t })))
    .sort(compareProductionTasks);
export const pending = (state) => productionTasks(state).filter(({ t }) => !t.done);

export function productionQueue(state, { start = '', end = '' } = {}) {
  const active = [],
    completed = [];
  for (const item of state.items) {
    if (!item.tasks.length) continue;
    const finished = item.tasks.every((task) => task.done);
    if (!finished && kind(state, item) !== 'prep') continue;
    const tasks = item.tasks
      .filter(
        (task) =>
          (!start && !end) ||
          Boolean(task.due && (!start || task.due >= start) && (!end || task.due <= end)),
      )
      .map((t) => ({ p: item, t }))
      .sort((a, b) => Number(a.t.done) - Number(b.t.done) || compareProductionTasks(a, b));
    if (tasks.length) (finished ? completed : active).push({ item, tasks });
  }
  active.sort((a, b) => {
    const first = a.tasks.find(({ t }) => !t.done),
      second = b.tasks.find(({ t }) => !t.done);
    return first && second
      ? compareProductionTasks(first, second)
      : Number(!first) - Number(!second);
  });
  const work = active
    .flatMap((group) => group.tasks)
    .filter(({ t }) => !t.done)
    .sort(compareProductionTasks);
  return { active, completed, next: work[0] || null, remaining: work.length };
}
