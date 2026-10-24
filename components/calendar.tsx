'use client';

import { calendarDays, calendarRange, calendarTasks } from './calendar/calendar.helpers.ts';
import { useWorkspace } from './workspace/workspace-context';
import CalendarToolbar from './calendar/calendar-toolbar';
import CalendarFilters from './calendar/calendar-filters';
import CalendarSummary from './calendar/calendar-summary';
import CalendarGrid from './calendar/calendar-grid';
import CalendarAgenda from './calendar/calendar-agenda';
import UnscheduledPlans from './calendar/unscheduled-plans';
import useCalendarFilters from './calendar/use-calendar-filters.ts';
import useCalendarView from './calendar/use-calendar-view.ts';
import DayTaskEditor from './calendar/day-task-editor';
import { calendarDayTasks } from './calendar/day-task.helpers.ts';
import { today } from '../lib/display.ts';
import CalendarMoveEditor from './calendar/calendar-move-editor';
import CalendarDragProvider from './calendar/calendar-drag-provider';
import { useMedia } from './media/media-context';
import { calendarTimeline } from './calendar/calendar-posts.helpers.ts';

export default function Calendar() {
  const { state, week, setWeek, platform, setPlatform } = useWorkspace();
  const library = useMedia();
  const view = useCalendarView();
  const { mode, content, showFilters, showUnscheduled, taskEditor, moveTarget } = view;
  const filters = useCalendarFilters(platform, setPlatform);
  const range = calendarRange(week, mode);
  const days = calendarDays(range);
  const currentDate = today();
  const { entries, posts, unscheduled } = calendarTimeline(state, library.media, {
    ...range,
    ...filters.values
  });
  const tasks = calendarTasks(state, { ...range, ...filters.values });
  const dayTasks = calendarDayTasks(state, range, filters.values.query);
  const visibleEntries = content === 'Tasks' ? [] : entries;
  const visiblePosts = content === 'Tasks' ? [] : posts;
  const visibleTasks = content === 'Tasks' ? [] : tasks;
  const visibleDayTasks = content === 'Ideas' ? [] : dayTasks;

  return (
    <CalendarDragProvider>
      <section className="planner" aria-label="Content calendar">
        <CalendarToolbar
          anchor={week}
          mode={mode}
          onAnchorChange={setWeek}
          onModeChange={view.setMode}
          onAddTask={() =>
            view.setTaskEditor({ date: days.includes(currentDate) ? currentDate : week })
          }
        />
        <CalendarFilters
          filters={filters}
          showFilters={showFilters}
          setShowFilters={view.setShowFilters}
          showUnscheduled={showUnscheduled}
          setShowUnscheduled={view.setShowUnscheduled}
          unscheduledCount={unscheduled.length}
        />
        <CalendarSummary
          entries={entries}
          posts={posts}
          tasks={tasks}
          dayTasks={dayTasks}
          mode={mode}
          content={content}
          onContentChange={view.setContent}
        />
        <div className={`planner-canvas ${showUnscheduled ? 'has-drafts' : ''}`}>
          {mode === 'List' ? (
            <CalendarAgenda
              content={content}
              days={days}
              entries={visibleEntries}
              posts={visiblePosts}
              tasks={visibleTasks}
              dayTasks={visibleDayTasks}
              start={range.start}
              platform={platform}
              onAddTask={date => view.setTaskEditor({ date })}
              onEditTask={view.setTaskEditor}
              onMove={view.setMoveTarget}
            />
          ) : (
            <CalendarGrid
              content={content}
              anchor={week}
              mode={mode}
              days={days}
              entries={visibleEntries}
              posts={visiblePosts}
              tasks={visibleTasks}
              dayTasks={visibleDayTasks}
              platform={platform}
              onAddTask={date => view.setTaskEditor({ date })}
              onEditTask={view.setTaskEditor}
              onMove={view.setMoveTarget}
            />
          )}
          <UnscheduledPlans
            entries={unscheduled}
            mode={mode}
            hasFilters={filters.hasFilters}
            visible={showUnscheduled}
            onClose={() => view.setShowUnscheduled(false)}
          />
        </div>
        <p className="planner-footnote">
          Day tasks are for your routine. Ideas appear on checklist due dates and publishing days.
          Synced posts appear on their published dates with their original thumbnails. Use Sync
          posts in Library to refresh, or Import older posts for more history.
        </p>
        {library.partial && (
          <p className="warning" role="status">
            The calendar shows the latest 1,000 library records. Some imported history is not
            loaded.
          </p>
        )}
        {moveTarget && (
          <CalendarMoveEditor target={moveTarget} onClose={() => view.setMoveTarget(null)} />
        )}
        {taskEditor && (
          <DayTaskEditor
            key={`${taskEditor.id || 'new'}:${taskEditor.date}`}
            {...taskEditor}
            onClose={() => view.setTaskEditor(null)}
          />
        )}
      </section>
    </CalendarDragProvider>
  );
}
