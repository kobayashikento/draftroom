'use client';

import { overviewResultCount, sections } from './overview.helpers.ts';
import type { OverviewResultsProps } from './overview.helpers.ts';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';
import Link from 'next/link';
import { viewPaths } from '../../../lib/navigation.ts';
import TaskRow from '../../workspace/task-row';
import PostResults from './post-results';
import IdeaSketch from '../../workspace/idea-sketch';

export default function OverviewResults({
  selected,
  summary,
  week,
  currentDate
}: OverviewResultsProps) {
  const section = sections[selected];
  const matches = summary[selected];

  return (
    <section id="overview-results" aria-labelledby="overview-results-title">
      <div className="section-head">
        <h2 id="overview-results-title">{section.title}</h2>
        <Button className="link" asChild>
          <Link href={viewPaths[section.destination]}>
            {section.action}
            <AppIcon icon={ArrowRight} />
          </Link>
        </Button>
      </div>
      <p className="overview-results-count" role="status">
        {overviewResultCount(selected, matches.length, week)}
      </p>
      {!matches.length ? (
        <div className="panel empty">
          <IdeaSketch />
          <p>{section.empty}</p>
        </div>
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
