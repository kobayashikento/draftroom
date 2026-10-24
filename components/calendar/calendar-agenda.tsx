'use client';
import type { PublicationEntry } from '../../lib/types.ts';
type CalendarAgendaProps = { days: string[]; entries: PublicationEntry[]; start: string; platform: string };

import { CalendarDays, Plus } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { fmt } from '../../lib/display.ts';
import { parseDate } from '../../lib/model';
import { PublicationCards } from './publication-card';

export default function CalendarAgenda({ days, entries, start, platform }: CalendarAgendaProps) {
  const { setModal } = useWorkspace();
  return (
    <div className="planner-agenda">
      {days
        .filter((date) => entries.some((e) => e.pub.date === date))
        .map((date) => (
          <section className="agenda-day" key={date} aria-label={fmt(date, { dateStyle: 'full' })}>
            <div className="agenda-date">
              <span>{fmt(date, { weekday: 'short' })}</span>
              <strong>{parseDate(date).getDate()}</strong>
              <span>{fmt(date, { month: 'short' })}</span>
            </div>
            <div className="agenda-cards">
              <PublicationCards entries={entries.filter((e) => e.pub.date === date)} />
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
            onClick={() => setModal({ type: 'add', date: start, platform })}
          >
            <AppIcon icon={Plus} />
            Plan an idea
          </Button>
        </div>
      )}
    </div>
  );
}
