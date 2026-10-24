'use client';
import { useState } from 'react';
import { Input, Badge } from './ui';
import {
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarClock,
  Check,
  ListChecks,
  Heart,
  Sparkles,
} from 'lucide-react';
import { AppIcon, SeriesIcon, PlatformIcon } from './icons';
import {
  useWorkspace,
  Button,
  Select,
  StagePill,
  Artwork,
  ContentCard,
  TaskRow,
  fmt,
  today,
} from './workspace';
import {
  addDays,
  parseDate,
  dateString,
  monday,
  kind,
  pending,
  scheduled,
  createItem,
} from '../lib/model';
export { default as Production } from './production';
export { default as Calendar } from './calendar';
export function WeekBar({ week, setWeek, mode = 'Week' }) {
  const move = (delta) => {
    if (mode === 'Month') {
      let d = parseDate(week);
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
      setWeek(dateString(d));
    } else setWeek(addDays(monday(week), delta * 7));
  };
  return (
    <div className="weekbar">
      <strong>
        {mode === 'Month'
          ? fmt(week, { month: 'long', year: 'numeric' })
          : `${fmt(week)} – ${fmt(addDays(week, 6))}, ${parseDate(week).getFullYear()}`}
      </strong>
      <Button className="icon-button" aria-label="Previous period" onClick={() => move(-1)}>
        <AppIcon icon={ChevronLeft} />
      </Button>
      <Button className="icon-button" aria-label="Next period" onClick={() => move(1)}>
        <AppIcon icon={ChevronRight} />
      </Button>
      <Button className="small" onClick={() => setWeek(monday(today()))}>
        Today
      </Button>
      <span className="muted">
        {mode === 'Month' ? 'Your creative month' : 'Your creative week'}
      </span>
    </div>
  );
}
export function Overview({ week, setWeek, navigate }) {
  const { state, open } = useWorkspace(),
    planned = scheduled(state, week, addDays(week, 6)),
    posts = [...new Map(planned.map((x) => [x.p.id, x.p])).values()],
    work = pending(state),
    ready = state.items.filter((p) => kind(state, p) === 'ready'),
    overdue = state.items.filter(
      (p) =>
        kind(state, p) !== 'posted' &&
        p.publications.some((x) => x.date && x.date < today() && x.state !== 'manually_posted'),
    ).length;
  return (
    <>
      <WeekBar week={week} setWeek={setWeek} />
      <div className="stats">
        {[
          ['Posts planned', posts.length, 'In your selected week', CalendarDays],
          ['Ready to publish', ready.length, 'A little ahead feels good', Check],
          ['Tasks to work on', work.length, 'One small step at a time', ListChecks],
          ['Need a new date', overdue, 'Past dates, still unposted', CalendarClock],
        ].map(([label, value, detail, Icon]) => (
          <div className="stat" key={label}>
            <span className="stat-icon">
              <AppIcon icon={Icon} size="md" />
            </span>
            <div className="stat-label">{label}</div>
            <strong>{value}</strong>
            <div className="tiny">{detail}</div>
          </div>
        ))}
      </div>
      <div className="section-head">
        <h2>On your calendar</h2>
        <Button className="link" onClick={() => navigate('Calendar')}>
          View calendar <AppIcon icon={ArrowRight} />
        </Button>
      </div>
      <div className="cards">
        {posts.length ? (
          posts.map((p) => <ContentCard key={p.id} item={p} />)
        ) : (
          <div className="empty">A little room to create. Schedule an idea to see it here.</div>
        )}
      </div>
      <div className="lower">
        <section>
          <div className="section-head">
            <h2>A little work, a little progress</h2>
            <span>{work.length} tasks left</span>
          </div>
          <div className="panel">
            {work.length ? (
              work.slice(0, 4).map(({ p, t }) => <TaskRow key={t.id} item={p} task={t} />)
            ) : (
              <div className="empty">You’re all caught up.</div>
            )}
            <div className="mt-4">
              <Button className="link" onClick={() => navigate('Production')}>
                See your production list <AppIcon icon={ArrowRight} />
              </Button>
            </div>
          </div>
        </section>
        <section>
          <div className="section-head">
            <h2>Ready when you are</h2>
            <AppIcon icon={Sparkles} />
          </div>
          <div className="panel readybox">
            <p className="subtitle">The making is done. Your next post is waiting.</p>
            {ready.length ? (
              ready.map((p) => (
                <div key={p.id}>
                  <div className="ready-entry">
                    <div className="miniart">
                      <Artwork item={p} />
                    </div>
                    <div>
                      <h3>{p.title}</h3>
                      <span className="tiny muted">
                        {p.format} ·{' '}
                        {state.series.find((s) => s.id === p.seriesId)?.name || 'No series'}
                      </span>
                    </div>
                  </div>
                  <Button className="small" onClick={() => open(p.id, 'Publish')}>
                    Review & publish <AppIcon icon={ArrowRight} />
                  </Button>
                </div>
              ))
            ) : (
              <p className="subtitle mt-6">Move a finished idea to Ready to find it here.</p>
            )}
          </div>
          <p className="quote">
            Make a little space for your creativity. <AppIcon icon={Heart} />
          </p>
        </section>
      </div>
    </>
  );
}
export function Ideas() {
  const { state, updateItem, setModal, open } = useWorkspace();
  const [mode, setMode] = useState('Board'),
    [query, setQuery] = useState(''),
    [stage, setStage] = useState(''),
    [format, setFormat] = useState(''),
    [series, setSeries] = useState(''),
    [platform, setPlatform] = useState(''),
    [dateFilter, setDateFilter] = useState('');
  const items = state.items.filter(
    (p) =>
      (p.title + ' ' + p.tags).toLowerCase().includes(query.toLowerCase()) &&
      (!stage || p.stageId === stage) &&
      (!format || p.format === format) &&
      (!series || p.seriesId === series) &&
      (!platform || p.publications.some((x) => x.platform === platform && x.date)) &&
      (!dateFilter ||
        (dateFilter === 'unscheduled'
          ? !p.publications.some((x) => x.date)
          : p.publications.some(
              (x) => x.date >= monday(today()) && x.date <= addDays(monday(today()), 6),
            ))),
  );
  const stageSelect = (p) => (
    <Select
      aria-label={`Stage for ${p.title}`}
      className="mt-2 w-full"
      options={state.stages.map((s) => [s.id, s.name])}
      value={p.stageId}
      onChange={(v) => updateItem(p.id, (item) => (item.stageId = v))}
    />
  );
  return (
    <>
      <div className="toolbar">
        <Input
          aria-label="Search ideas"
          placeholder="Search your ideas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label="Filter stage"
          options={[['', 'All stages'], ...state.stages.map((s) => [s.id, s.name])]}
          value={stage}
          onChange={setStage}
        />
        <Select
          aria-label="Filter format"
          options={[['', 'All formats'], 'Reel', 'Carousel']}
          value={format}
          onChange={setFormat}
        />
        <Select
          aria-label="Filter series"
          options={[['', 'All series'], ...state.series.map((s) => [s.id, s.name])]}
          value={series}
          onChange={setSeries}
        />
        <Select
          aria-label="Filter platform"
          options={[['', 'All platforms'], 'Instagram', 'TikTok']}
          value={platform}
          onChange={setPlatform}
        />
        <Select
          aria-label="Filter dates"
          options={[
            ['', 'All dates'],
            ['unscheduled', 'Unscheduled'],
            ['week', 'This week'],
          ]}
          value={dateFilter}
          onChange={setDateFilter}
        />
        <div className="segmented">
          {['Board', 'List'].map((x) => (
            <Button key={x} className={mode === x ? 'active' : ''} onClick={() => setMode(x)}>
              {x}
            </Button>
          ))}
        </div>
        <Button className="small" onClick={() => setModal({ type: 'stages' })}>
          Edit stages
        </Button>
      </div>
      {mode === 'Board' ? (
        <div className="board">
          {state.stages.map((s) => (
            <section className="column" key={s.id}>
              <h3>
                {s.name}{' '}
                <span className="muted tiny">{items.filter((p) => p.stageId === s.id).length}</span>
              </h3>
              {items
                .filter((p) => p.stageId === s.id)
                .map((p) => (
                  <div key={p.id}>
                    <ContentCard item={p} />
                    {stageSelect(p)}
                  </div>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="panel">
          {items.length ? (
            items.map((p) => (
              <div key={p.id} className="list-item">
                <Button className="link grow" onClick={() => open(p.id)}>
                  {p.title}
                </Button>
                <span>{p.format}</span>
                <span>{state.series.find((s) => s.id === p.seriesId)?.name || 'No series'}</span>
                <StagePill item={p} />
                <div>{stageSelect(p)}</div>
              </div>
            ))
          ) : (
            <div className="empty">No ideas match these filters.</div>
          )}
        </div>
      )}
    </>
  );
}
export function Series() {
  const { state, update, setModal, open, notify } = useWorkspace();
  function episode(s) {
    const p = createItem(state, { title: `${s.name} · next episode`, seriesId: s.id });
    update((d) => d.items.push(p));
    open(p.id);
    notify('One fresh episode, ready for your ideas.');
  }
  return (
    <>
      <div className="toolbar">
        <Button onClick={() => setModal({ type: 'series' })}>
          <AppIcon icon={Plus} />
          New series
        </Button>
      </div>
      <div className="series-grid">
        {state.series.map((s) => {
          const related = state.items.filter((p) => p.seriesId === s.id);
          return (
            <section className="panel series-card" key={s.id}>
              <div className="series-icon">
                <SeriesIcon series={s} />
              </div>
              <div className="row justify-between">
                <h2>{s.name}</h2>
                <Button className="small" onClick={() => setModal({ type: 'series', id: s.id })}>
                  Edit template
                </Button>
              </div>
              <p className="subtitle my-3">{s.description}</p>
              <div className="meta">
                {s.format} · {s.cadence} · {related.length}{' '}
                {related.length === 1 ? 'idea' : 'ideas'}
              </div>
              {related.map((p) => (
                <div key={p.id} className="list-item px-0 py-3">
                  <Button className="link grow" onClick={() => open(p.id)}>
                    {p.title}
                  </Button>
                  <span className="tiny">
                    {p.format} · {p.cadence || s.cadence}
                  </span>
                  <StagePill item={p} />
                  <span className="tiny">
                    {p.publications.find((x) => x.date)?.date || 'Unscheduled'}
                  </span>
                </div>
              ))}
              <div className="row mt-6">
                <Button className="primary small" onClick={() => episode(s)}>
                  <AppIcon icon={Plus} />
                  Create next episode
                </Button>
                <Button className="small" onClick={() => setModal({ type: 'add', seriesId: s.id })}>
                  Add idea to series
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
export function Analytics({ item }) {
  const { state, open } = useWorkspace();
  return (
    <>
      <div className="banner">
        Your ideas and published links stay connected here. Platform analytics will appear only
        after an authorized integration is added.
      </div>
      <div className="analytics-grid">
        {['Instagram', 'TikTok'].map((platform) => (
          <section className="panel analytics-card" key={platform}>
            <PlatformIcon platform={platform} size="lg" />
            <h2>{platform}</h2>
            <Badge className="pill">Not connected</Badge>
            <div className="no-metrics">
              {['Views', 'Likes', 'Comments'].map((x) => (
                <div key={x}>
                  <strong>—</strong>
                  <span className="tiny muted">{x}</span>
                </div>
              ))}
            </div>
            <p className="subtitle">No data available · Never synced</p>
            <p className="footnote">
              API connection is not available in this prototype. A manual link does not fetch
              metrics.
            </p>
          </section>
        ))}
      </div>
      {!item && (
        <>
          <div className="section-head">
            <h2>Your publication records</h2>
          </div>
          <div className="panel">
            {state.items.map((p) => (
              <div key={p.id} className="list-item">
                <Button className="link grow" onClick={() => open(p.id, 'Publish')}>
                  {p.title}
                </Button>
                {p.publications.map((pub) => (
                  <span key={pub.id} className="tiny">
                    {pub.platform}:{' '}
                    {pub.state === 'manually_posted' ? 'Manually posted' : 'Planned'}
                    {pub.url ? ' · Link saved' : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
