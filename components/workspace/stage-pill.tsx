'use client';
import type { Item } from '../../lib/types.ts';
import { Badge } from '../ui';
import { useWorkspace } from './workspace-context';

type StagePillProps = { item: Item };

export default function StagePill({ item }: StagePillProps) {
  const { state } = useWorkspace();
  const stage = state.stages.find((s) => s.id === item.stageId);
  return (
    <Badge className={`pill ${item.stageId}`} data-stage-kind={stage?.kind}>
      {stage?.name}
    </Badge>
  );
}
