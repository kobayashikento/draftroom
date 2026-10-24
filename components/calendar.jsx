'use client';

import { useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Inbox,
  X,
  CalendarArrowUp,
  Check,
  GripVertical,
  ArrowRight,
} from 'lucide-react';
import { AppIcon, PlatformIcon, FormatIcon } from './icons';
import { Input } from './ui';
import { useWorkspace, Button, Select, StagePill, Artwork, fmt, today } from './workspace';
import { addDays, parseDate } from '../lib/model';
import {
  calendarEntries,
  calendarRange,
  moveCalendarAnchor,
  reschedulePublication,
} from '../lib/calendar';

const modes = [
  ['Week', CalendarDays],
  ['Month', CalendarRange],
  ['List', List],
];

export default function Calendar({ week, setWeek, platform, setPlatform }) {
  const { state, open, setModal, updateItem, notify } = useWorkspace();
  const [mode, setMode] = useState('Week');
  const [format, setFormat] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [drag, setDrag] = useState(null);
  const [dropDay, setDropDay] = useState('');
  const range = calendarRange(week, mode);
  const filters = { platform, format, seriesId, status, query };
  const entries = calendarEntries(state, { ...range, ...filters });
  const unscheduled = calendarEntries(state, { ...filters, unscheduled: true });
  const filterCount = [format, seriesId, status].filter(Boolean).length;
  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
  const heading =
    mode === 'Month'
      ? fmt(week, { month: 'long', year: 'numeric' })
      : `${fmt(range.start)} – ${fmt(range.end, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  function moveTo(date) {
    if (!drag) return;
    const item = state.items.find((p) => p.id === drag.itemId);
    const pub = item?.publications.find((p) => p.id === drag.publicationId);
    if (pub && pub.state !== 'manually_posted' && pub.date !== date) {
      updateItem(item.id, (draft) => reschedulePublication(draft, pub.id, date));
      notify(`${pub.platform} plan moved to ${fmt(date)}.`);
    }
    setDrag(null);
    setDropDay('');
  }

  function startDrag(event, p, pub) {
    if (pub.state === 'manually_posted') return event.preventDefault();
    setDrag({ itemId: p.id, publicationId: pub.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${p.title} · ${pub.platform}`);
  }

  const card = (entry, compact = false) => (
    <PublicationCard
      key={entry.pub.id}
      {...entry}
      compact={compact}
      canDrag={mode !== 'List'}
      onOpen={() => open(entry.p.id, 'Publish')}
      onMove={() => setModal({ type: 'reschedule', id: entry.p.id, publicationId: entry.pub.id })}
      onDragStart={(event) => startDrag(event, entry.p, entry.pub)}
      onDragEnd={() => {
        setDrag(null);
        setDropDay('');
      }}
    />
  );

  return (
    <section className="planner" aria-label="Content calendar">
      <div className="planner-toolbar">
        <div className="planner-period">
          <div className="planner-arrows">
            <Button
              className="icon-button"
              aria-label="Previous period"
              onClick={() => setWeek(moveCalendarAnchor(week, mode, -1))}
            >
              <AppIcon icon={ChevronLeft} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Next period"
              onClick={() => setWeek(moveCalendarAnchor(week, mode, 1))}
            >
              <AppIcon icon={ChevronRight} />
            </Button>
          </div>
          <h2 aria-live="polite">{heading}</h2>
          <Button className="small" onClick={() => setWeek(today())}>
            Today
          </Button>
        </div>
        <div className="planner-view segmented" role="group" aria-label="Calendar view">
          {modes.map(([name, Icon]) => (
            <Button
              key={name}
              className={mode === name ? 'active' : ''}
              aria-pressed={mode === name}
              onClick={() => {
                setMode(name);
                setDrag(null);
              }}
            >
              <AppIcon icon={Icon} />
              {name}
            </Button>
          ))}
        </div>
      </div>

      <div className="planner-filters">
        <Select
          aria-label="Calendar channel"
          options={[['', 'All channels'], 'Instagram', 'TikTok']}
          value={platform}
          onChange={setPlatform}
        />
        <div className="planner-search">
          <AppIcon icon={Search} />
          <Input
            type="search"
            aria-label="Search calendar"
            placeholder="Search your plans…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          className={`small ${showFilters || filterCount ? 'filter-active' : ''}`}
          aria-expanded={showFilters}
          aria-controls="calendar-filters"
          onClick={() => setShowFilters(!showFilters)}
        >
          <AppIcon icon={SlidersHorizontal} />
          Filters{filterCount > 0 && <span className="planner-count">{filterCount}</span>}
        </Button>
        <Button
          className={`small planner-inbox ${showUnscheduled ? 'filter-active' : ''}`}
          aria-expanded={showUnscheduled}
          aria-controls="unscheduled-plans"
          onClick={() => setShowUnscheduled(!showUnscheduled)}
        >
          <AppIcon icon={Inbox} />
          Unscheduled<span className="planner-count">{unscheduled.length}</span>
        </Button>
      </div>

      <div className="planner-extra-filters" id="calendar-filters" hidden={!showFilters}>
        <Select
          aria-label="Calendar format"
          options={[['', 'All formats'], 'Reel', 'Carousel']}
          value={format}
          onChange={setFormat}
        />
        <Select
          aria-label="Calendar series"
          options={[['', 'All series'], ...state.series.map((s) => [s.id, s.name])]}
          value={seriesId}
          onChange={setSeriesId}
        />
        <Select
          aria-label="Publication status"
          options={[
            ['', 'All publication statuses'],
            ['planned', 'Planned'],
            ['manually_posted', 'Manually posted'],
          ]}
          value={status}
          onChange={setStatus}
        />
        {(filterCount > 0 || query || platform) && (
          <Button
            className="link"
            onClick={() => {
              setFormat('');
              setSeriesId('');
              setStatus('');
              setQuery('');
              setPlatform('');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="planner-summary">
        <span>
          <span className="status-dot" />
          {entries.filter((e) => e.pub.state === 'planned').length} planned
        </span>
        <span>
          <AppIcon icon={Check} />
          {entries.filter((e) => e.pub.state === 'manually_posted').length} manually posted
        </span>
        <span className="planner-summary-hint">
          {mode === 'List'
            ? 'Your week, one day at a time'
            : 'Drag a planned card to change its date'}
        </span>
      </div>

      <div className={`planner-canvas ${showUnscheduled ? 'has-drafts' : ''}`}>
        {mode === 'List' ? (
          <div className="planner-agenda">
            {days
              .filter((date) => entries.some((e) => e.pub.date === date))
              .map((date) => (
                <section
                  className="agenda-day"
                  key={date}
                  aria-label={fmt(date, { dateStyle: 'full' })}
                >
                  <div className="agenda-date">
                    <span>{fmt(date, { weekday: 'short' })}</span>
                    <strong>{parseDate(date).getDate()}</strong>
                    <span>{fmt(date, { month: 'short' })}</span>
                  </div>
                  <div className="agenda-cards">
                    {entries.filter((e) => e.pub.date === date).map((entry) => card(entry))}
                  </div>
                </section>
              ))}
            {!entries.length && (
              <div className="planner-empty">
                <AppIcon icon={CalendarDays} size="lg" />
                <h3>A little room for something good.</h3>
                <p>No plans match this week and these filters.</p>
                <Button
                  className="small"
                  onClick={() => setModal({ type: 'add', date: range.start, platform })}
                >
                  <AppIcon icon={Plus} />
                  Plan an idea
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="planner-scroll"
            role="region"
            aria-label={`${mode} calendar, scroll horizontally for more days`}
            tabIndex={0}
          >
            <div className={`planner-grid planner-${mode.toLowerCase()}`}>
              {mode === 'Month' &&
                ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div className="planner-weekday" key={day}>
                    {day}
                  </div>
                ))}
              {days.map((date) => {
                const dayEntries = entries.filter((e) => e.pub.date === date);
                return (
                  <section
                    key={date}
                    aria-label={fmt(date, { dateStyle: 'full' })}
                    aria-current={date === today() ? 'date' : undefined}
                    className={`planner-day ${date === today() ? 'is-today' : ''} ${mode === 'Month' && date.slice(0, 7) !== week.slice(0, 7) ? 'is-outside' : ''} ${dropDay === date ? 'is-drop-target' : ''}`}
                    onDragOver={(event) => {
                      if (drag) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDropDay(date);
                      }
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) setDropDay('');
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveTo(date);
                    }}
                  >
                    <header className="planner-day-head">
                      <div>
                        {mode === 'Week' && <span>{fmt(date, { weekday: 'short' })}</span>}
                        <strong>{parseDate(date).getDate()}</strong>
                        {date === today() && <span className="sr-only">Today</span>}
                      </div>
                      <Button
                        className="icon-button"
                        aria-label={`Add idea on ${date}`}
                        onClick={() => setModal({ type: 'add', date, platform })}
                      >
                        <AppIcon icon={Plus} />
                      </Button>
                    </header>
                    <div className="planner-day-cards">
                      {dayEntries.map((entry) => card(entry, mode === 'Month'))}
                    </div>
                    {mode === 'Week' && !dayEntries.length && (
                      <Button
                        className="planner-add"
                        aria-label={`Plan an idea on ${date}`}
                        onClick={() => setModal({ type: 'add', date, platform })}
                      >
                        <AppIcon icon={Plus} />
                        <span>Room for an idea</span>
                      </Button>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}

        <section
          className="planner-drafts"
          id="unscheduled-plans"
          hidden={!showUnscheduled}
          aria-label="Unscheduled plans"
        >
          <div className="planner-drafts-head">
            <div>
              <h2>Unscheduled</h2>
              <p>
                {mode === 'List'
                  ? 'Choose a date on any card.'
                  : 'Drag onto a day, or choose a date.'}
              </p>
            </div>
            <Button
              className="icon-button"
              aria-label="Close unscheduled plans"
              onClick={() => setShowUnscheduled(false)}
            >
              <AppIcon icon={X} />
            </Button>
          </div>
          <div className="planner-draft-cards">{unscheduled.map((entry) => card(entry))}</div>
          {!unscheduled.length && (
            <p className="planner-drafts-empty">
              {filterCount || platform || query
                ? 'No unscheduled plans match these filters.'
                : 'Every idea has a date. Your next spark can start here.'}
            </p>
          )}
          <Button className="link" onClick={() => setModal({ type: 'add' })}>
            Capture a new idea
            <AppIcon icon={ArrowRight} />
          </Button>
        </section>
      </div>
      <p className="planner-footnote">
        Dates are your plans. Posts are published manually. Moving a card changes only that
        channel’s date.
      </p>
    </section>
  );
}

function PublicationCard({ p, pub, compact, canDrag, onOpen, onMove, onDragStart, onDragEnd }) {
  const posted = pub.state === 'manually_posted';
  return (
    <article
      className={`planner-card ${compact ? 'is-compact' : ''} ${posted ? 'is-posted' : ''}`}
      draggable={canDrag && !posted}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Button
        className="planner-card-open"
        aria-label={`Edit ${p.title} for ${pub.platform}`}
        title={p.title}
        onClick={onOpen}
      >
        <div className="planner-card-channel">
          <PlatformIcon platform={pub.platform} />
          <span>{pub.platform}</span>
          {posted ? (
            <AppIcon icon={Check} />
          ) : (
            canDrag && <AppIcon icon={GripVertical} className="planner-grip" />
          )}
        </div>
        <div className="planner-card-art">
          <Artwork item={p} />
        </div>
        <div className="planner-card-copy">
          <h3>{p.title}</h3>
          <span className="planner-card-format">
            <FormatIcon format={p.format} />
            {p.format}
          </span>
          <StagePill item={p} />
        </div>
      </Button>
      <footer>
        <span>
          {posted
            ? 'Manually posted'
            : `${p.tasks.filter((t) => t.done).length}/${p.tasks.length} tasks`}
        </span>
        {!posted && (
          <Button
            className="icon-button"
            aria-label={`${pub.date ? 'Move' : 'Schedule'} ${p.title} for ${pub.platform}`}
            title="Choose a date"
            onClick={onMove}
          >
            <AppIcon icon={CalendarArrowUp} />
          </Button>
        )}
      </footer>
    </article>
  );
}
