'use client';

import type { StagePillProps } from './workspace.helpers.ts';
import { Badge } from '../ui';
import { useWorkspace } from './workspace-context';

export default function StagePill({ item }: StagePillProps) {
  const { state } = useWorkspace();
  const stage = state.stages.find(s => s.id === item.stageId);
  return (
    <Badge className={`pill ${item.stageId}`} data-stage-kind={stage?.kind}>
      {stage?.name}
    </Badge>
  );
}
