'use client';

import type { CalendarAgendaProps } from './calendar.helpers.ts';
import { ListTodo, Plus } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { fmt } from '../../lib/display.ts';
import { parseDate } from '../../lib/model.ts';
import { PublicationCards } from './publication-card';
import IdeaSketch from '../workspace/idea-sketch';
import CalendarProductionCards from './calendar-production-cards';
import DayTaskCards from './day-task-cards';

export default function CalendarAgenda({
  content,
  days,
  entries,
  tasks,
  dayTasks,
  start,
  platform,
  onAddTask,
  onEditTask,
  onMove
}: CalendarAgendaProps) {
  const { setModal } = useWorkspace();
  return (
    <div className="planner-agenda">
      {days
        .filter(
          date =>
            entries.some(e => e.pub.date === date) ||
            tasks.some(({ t }) => t.due === date) ||
            dayTasks.some(task => task.date === date)
        )
        .map(date => (
          <section className="agenda-day" key={date} aria-label={fmt(date, { dateStyle: 'full' })}>
            <div className="agenda-date">
              <span>{fmt(date, { weekday: 'short' })}</span>
              <strong>{parseDate(date).getDate()}</strong>
              <span>{fmt(date, { month: 'short' })}</span>
            </div>
            <div className="agenda-cards">
              {dayTasks.some(task => task.date === date) && (
                <div className="grid gap-3">
                  <span className="planner-day-label">Day tasks</span>
                  <DayTaskCards
                    tasks={dayTasks.filter(task => task.date === date)}
                    onEdit={onEditTask}
                    onMove={onMove}
                  />
                </div>
              )}
              {tasks.some(({ t }) => t.due === date) && (
                <div className="grid gap-3">
                  <span className="planner-day-label">In production</span>
                  <CalendarProductionCards
                    tasks={tasks.filter(({ t }) => t.due === date)}
                    date={date}
                    onMove={onMove}
                  />
                </div>
              )}
              <PublicationCards entries={entries.filter(e => e.pub.date === date)} />
            </div>
          </section>
        ))}
      {!entries.length && !tasks.length && !dayTasks.length && (
        <div className="planner-empty">
          <IdeaSketch />
          <h3>A little room for something good.</h3>
          <p>No ideas or tasks match this week and these filters.</p>
          <Button className="primary" onClick={() => onAddTask(start)}>
            <AppIcon icon={ListTodo} />
            Add day task
          </Button>
          {content !== 'Tasks' && (
            <Button
              className="small"
              onClick={() => setModal({ type: 'add', date: start, platform })}
            >
              <AppIcon icon={Plus} />
              Plan an idea
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
