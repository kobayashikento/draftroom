'use client';

import { overviewSummary } from './overview/overview.helpers.ts';
import { useState } from 'react';
import type { OverviewCategory } from '../../lib/types.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { today } from '../../lib/display.ts';
import { monday } from '../../lib/model.ts';
import WeekBar from '../week-bar';
import SummaryCards from './overview/summary-cards';
import OverviewResults from './overview/overview-results';
import SecondaryPanels from './overview/secondary-panels';

export default function Overview() {
  const { state, week: anchor, setWeek } = useWorkspace();
  const week = monday(anchor);
  const [selected, setSelected] = useState<OverviewCategory>('planned');
  const currentDate = today();
  const summary = overviewSummary(state, week, currentDate);

  return (
    <>
      <WeekBar week={week} setWeek={setWeek} />
      <SummaryCards summary={summary} selected={selected} onSelect={setSelected} />
      <OverviewResults
        selected={selected}
        summary={summary}
        week={week}
        currentDate={currentDate}
      />
      {selected === 'planned' && <SecondaryPanels work={summary.tasks} ready={summary.ready} />}
    </>
  );
}
