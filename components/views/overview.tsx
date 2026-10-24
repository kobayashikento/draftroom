'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { View, OverviewCategory } from '../../lib/types.ts';
type OverviewProps = { week: string; setWeek: Dispatch<SetStateAction<string>>; navigate: (view: View) => void };

import { useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { today } from '../../lib/display.ts';
import { overviewSummary } from '../../lib/overview.ts';
import WeekBar from '../week-bar';
import SummaryCards from './overview/summary-cards';
import OverviewResults from './overview/overview-results';
import SecondaryPanels from './overview/secondary-panels';

export default function Overview({ week, setWeek, navigate }: OverviewProps) {
  const { state } = useWorkspace();
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
        navigate={navigate}
      />
      {selected === 'planned' && (
        <SecondaryPanels work={summary.tasks} ready={summary.ready} navigate={navigate} />
      )}
    </>
  );
}
