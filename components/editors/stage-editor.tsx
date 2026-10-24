'use client';
import type { StageKind } from '../../lib/types.ts';
import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { reorder } from '../../lib/reorder.ts';
import { uid } from '../../lib/model';
import Modal from './modal';

type StageEditorProps = { close: () => void };

export default function StageEditor({ close }: StageEditorProps) {
  const { state, update, notify } = useWorkspace();
  function remove(id: string) {
    if (state.stages.length === 1) {
      notify('Keep at least one stage.');
      return;
    }
    update((s) => {
      s.stages = s.stages.filter((x) => x.id !== id);
      s.items.filter((p) => p.stageId === id).forEach((p) => (p.stageId = s.stages[0].id));
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
            onChange={(e) => {
              const name = e.target.value;
              update((d) => (d.stages.find((x) => x.id === s.id)!.name = name));
            }}
          />
          <Select
            aria-label="Stage behavior"
            options={[
              ['prep', 'Needs prep'],
              ['ready', 'Ready'],
              ['posted', 'Posted'],
            ]}
            value={s.kind}
            onChange={(v) =>
              update((d) => (d.stages.find((x) => x.id === s.id)!.kind = v as StageKind))
            }
          />
          <Button
            className="icon-button"
            aria-label="Move stage up"
            disabled={i === 0}
            onClick={() => update((d) => reorder(d.stages, s.id, -1))}
          >
            <AppIcon icon={ArrowUp} />
          </Button>
          <Button
            className="icon-button"
            aria-label="Move stage down"
            disabled={i === state.stages.length - 1}
            onClick={() => update((d) => reorder(d.stages, s.id, 1))}
          >
            <AppIcon icon={ArrowDown} />
          </Button>
          <Button className="icon-button" aria-label="Remove stage" onClick={() => remove(s.id)}>
            <AppIcon icon={X} />
          </Button>
        </div>
      ))}
      <Button
        onClick={() => update((s) => s.stages.push({ id: uid(), name: 'New stage', kind: 'prep' }))}
      >
        <AppIcon icon={Plus} />
        Add stage
      </Button>
    </Modal>
  );
}
