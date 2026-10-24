import type { Stage, StageKind, Workspace } from '../../lib/types.ts';
import { uid } from '../../lib/model.ts';

export type StageFields = { name: string; kind: StageKind };
export const stageBehaviors: [StageKind, string][] = [
  ['prep', 'Needs prep'],
  ['ready', 'Ready'],
  ['posted', 'Posted']
];

export function isStageKind(value: string): value is StageKind {
  return stageBehaviors.some(([kind]) => kind === value);
}

export function setStageField<K extends keyof StageFields>(
  state: Workspace,
  id: string,
  key: K,
  value: StageFields[K]
): void {
  const stage = state.stages.find(stage => stage.id === id);
  if (stage) {
    const fields: StageFields = stage;
    fields[key] = value;
  }
}

export function removeStage(state: Workspace, id: string): boolean {
  if (state.stages.length <= 1 || !state.stages.some(stage => stage.id === id)) return false;
  state.stages = state.stages.filter(stage => stage.id !== id);
  for (const item of state.items) if (item.stageId === id) item.stageId = state.stages[0].id;
  return true;
}

export function addStage(state: Workspace): void {
  const stage: Stage = { id: uid(), name: 'New stage', kind: 'prep' };
  state.stages.push(stage);
}
