'use client';

import {
  addStage,
  removeStage,
  setStageField,
  stageBehaviors,
  isStageKind
} from './stage.helpers.ts';
import type { StageEditorProps } from './editors.helpers.ts';
import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { reorder } from '../../lib/reorder.ts';
import Modal from './modal';

export default function StageEditor({ close }: StageEditorProps) {
  const { state, update, notify } = useWorkspace();
  function remove(id: string) {
    if (state.stages.length === 1) {
      notify('Keep at least one stage.');
      return;
    }
    update(s => {
      removeStage(s, id);
    });
  }
  return (
    <Modal
      title="Your workflow, your way."
      onClose={close}
      footer={
        <>
          <span className="tiny muted">Changes save automatically</span>
          <Button className="primary" onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <p className="banner">
        Stage behavior controls production queues. Removing a stage moves its ideas to the first
        remaining stage.
      </p>
      {state.stages.map((s, i) => (
        <div className="stage-row" key={s.id}>
          <Input
            aria-label="Stage name"
            value={s.name}
            onChange={e => {
              const name = e.target.value;
              update(d => setStageField(d, s.id, 'name', name));
            }}
          />
          <Select
            aria-label="Stage behavior"
            options={stageBehaviors}
            value={s.kind}
            onChange={v => {
              if (isStageKind(v)) update(d => setStageField(d, s.id, 'kind', v));
            }}
          />
          <Button
            className="icon-button"
            aria-label="Move stage up"
            disabled={i === 0}
            onClick={() => update(d => reorder(d.stages, s.id, -1))}
          >
            <AppIcon icon={ArrowUp} />
          </Button>
          <Button
            className="icon-button"
            aria-label="Move stage down"
            disabled={i === state.stages.length - 1}
            onClick={() => update(d => reorder(d.stages, s.id, 1))}
          >
            <AppIcon icon={ArrowDown} />
          </Button>
          <Button className="icon-button" aria-label="Remove stage" onClick={() => remove(s.id)}>
            <AppIcon icon={X} />
          </Button>
        </div>
      ))}
      <Button onClick={() => update(addStage)}>
        <AppIcon icon={Plus} />
        Add stage
      </Button>
    </Modal>
  );
}
