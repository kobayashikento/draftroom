'use client';
import type { View, OverviewSummary, OverviewCategory } from '../../../lib/types.ts';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';
import TaskRow from '../../workspace/task-row';
import { addDays } from '../../../lib/model';
import { fmt } from '../../../lib/display.ts';
import PostResults from './post-results';

type OverviewResultsProps = {
  selected: OverviewCategory;
  summary: OverviewSummary;
  week: string;
  currentDate: string;
  navigate: (view: View) => void;
};

const sections: Record<
  OverviewCategory,
  { title: string; destination: View; action: string; empty: string }
> = {
  planned: {
    title: 'Posts planned',
    destination: 'Calendar',
    action: 'View calendar',
    empty: 'No posts are planned for this week yet.',
  },
  ready: {
    title: 'Ready to publish',
    destination: 'Ideas',
    action: 'View all ideas',
    empty: 'Move a finished idea to a Ready stage to find it here.',
  },
  tasks: {
    title: 'Tasks to work on',
    destination: 'Production',
    action: 'Open production',
    empty: 'You’re all caught up. No unfinished tasks in your working stages.',
  },
  overdue: {
    title: 'Need a new date',
    destination: 'Calendar',
    action: 'View calendar',
    empty: 'A little breathing room. No unposted ideas need a new date.',
  },
};

export default function OverviewResults({
  selected,
  summary,
  week,
  currentDate,
  navigate,
}: OverviewResultsProps) {
  const section = sections[selected];
  const matches = summary[selected];
  const noun = selected === 'tasks' ? 'task' : 'post';
  const scope =
    selected === 'planned' ? `${fmt(week)} – ${fmt(addDays(week, 6))}` : 'Across your workspace';

  return (
    <section id="overview-results" aria-labelledby="overview-results-title">
      <div className="section-head">
        <h2 id="overview-results-title">{section.title}</h2>
        <Button className="link" onClick={() => navigate(section.destination)}>
          {section.action}
          <AppIcon icon={ArrowRight} />
        </Button>
      </div>
      <p className="overview-results-count" role="status">
        {`${matches.length} ${noun}${matches.length === 1 ? '' : 's'} · ${scope}`}
      </p>
      {!matches.length ? (
        <div className="panel empty">{section.empty}</div>
      ) : selected === 'tasks' ? (
        <div className="panel">
          {summary.tasks.map(({ p, t }) => (
            <TaskRow key={t.id} item={p} task={t} />
          ))}
        </div>
      ) : (
        <PostResults
          items={summary[selected]}
          selected={selected}
          week={week}
          currentDate={currentDate}
        />
      )}
    </section>
  );
}
