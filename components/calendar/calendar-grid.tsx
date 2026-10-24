'use client';

import type { CalendarGridProps } from './calendar.helpers.ts';
import { ListPlus, ListTodo, Plus } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { fmt, today } from '../../lib/display.ts';
import { parseDate } from '../../lib/model.ts';
import { PublicationCards } from './publication-card';
import IdeaSketch from '../workspace/idea-sketch';
import CalendarProductionCards from './calendar-production-cards';
import DayTaskCards from './day-task-cards';
import CalendarDay from './calendar-day';

export default function CalendarGrid({
  content,
  anchor,
  mode,
  days,
  entries,
  tasks,
  dayTasks: dayTaskEntries,
  platform,
  onAddTask,
  onEditTask,
  onMove
}: CalendarGridProps) {
  const { setModal } = useWorkspace();
  return (
    <div
      className="planner-scroll"
      role="region"
      aria-label={`${mode} calendar, scroll horizontally for more days`}
      tabIndex={0}
    >
      <div className={`planner-grid planner-${mode.toLowerCase()}`}>
        {mode === 'Month' &&
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div className="planner-weekday" key={day}>
              {day}
            </div>
          ))}
        {days.map((date, index) => {
          const dayEntries = entries.filter(e => e.pub.date === date);
          const dayTasks = tasks.filter(({ t }) => t.due === date);
          const routineTasks = dayTaskEntries.filter(task => task.date === date);
          return (
            <CalendarDay key={date} date={date} anchor={anchor} mode={mode}>
              <header className="planner-day-head">
                <div>
                  {mode === 'Week' && <span>{fmt(date, { weekday: 'short' })}</span>}
                  <strong>{parseDate(date).getDate()}</strong>
                  {date === today() && <span className="sr-only">Today</span>}
                </div>
                <div className="planner-day-actions">
                  <Button
                    className="icon-button"
                    aria-label={`Add day task on ${date}`}
                    title="Add day task"
                    onClick={() => onAddTask(date)}
                  >
                    <AppIcon icon={ListPlus} />
                  </Button>
                  <Button
                    className="icon-button"
                    aria-label={`Add idea on ${date}`}
                    onClick={() => setModal({ type: 'add', date, platform })}
                  >
                    <AppIcon icon={Plus} />
                  </Button>
                </div>
              </header>
              <div className="planner-day-cards">
                {routineTasks.length > 0 && (
                  <div className="planner-day-tasks">
                    <span className="planner-day-label">
                      <AppIcon icon={ListTodo} />
                      Day tasks
                    </span>
                    <DayTaskCards
                      tasks={routineTasks}
                      onEdit={onEditTask}
                      canDrag
                      onMove={onMove}
                    />
                  </div>
                )}
                {dayTasks.length > 0 && (
                  <div className="planner-day-tasks">
                    <span className="planner-day-label">In production</span>
                    <CalendarProductionCards tasks={dayTasks} date={date} canDrag onMove={onMove} />
                  </div>
                )}
                {dayEntries.length > 0 && (
                  <span className="planner-day-label">Publishing · {dayEntries.length}</span>
                )}
                <PublicationCards entries={dayEntries} compact={mode === 'Month'} canDrag />
              </div>
              {mode === 'Week' &&
                content !== 'Tasks' &&
                !dayEntries.length &&
                !dayTasks.length &&
                !routineTasks.length && (
                  <Button
                    className="planner-add"
                    aria-label={`Plan an idea on ${date}`}
                    onClick={() => setModal({ type: 'add', date, platform })}
                  >
                    <IdeaSketch variant={index} />
                    <span>Room for an idea</span>
                  </Button>
                )}
              {mode === 'Week' && (
                <Button
                  className="link planner-add-day-task"
                  aria-label={`Plan your day on ${date}`}
                  onClick={() => onAddTask(date)}
                >
                  <AppIcon icon={ListTodo} />
                  Add day task
                </Button>
              )}
            </CalendarDay>
          );
        })}
      </div>
    </div>
  );
}
