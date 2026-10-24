'use client';
import type { Item, ProductionTask } from '../../lib/types.ts';
import { useId, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, PriorityButton } from '../ui';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import StagePill from '../workspace/stage-pill';
import TaskRow from '../workspace/task-row';

type ChecklistProps = { item: Item; tasks: ProductionTask[]; finished: boolean };

export default function Checklist({ item, tasks, finished }: ChecklistProps) {
  const { updateItem, open } = useWorkspace();
  const [expanded, setExpanded] = useState(!finished);
  const contentId = useId();
  const done = item.tasks.filter((task) => task.done).length;
  return (
    <section className="panel production-checklist">
      <div className="checklist-header">
        <Button
          className="checklist-toggle"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} checklist for ${item.title}`}
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          <AppIcon icon={expanded ? ChevronDown : ChevronRight} />
          <span className="checklist-heading">
            <span className="checklist-title">{item.title}</span>
            <span className="tiny muted">
              {item.format} · {done}/{item.tasks.length} completed
            </span>
          </span>
        </Button>
        <div className="checklist-actions">
          <StagePill item={item} />
          <PriorityButton
            label={`project: ${item.title}`}
            active={item.priority === 'High'}
            onClick={() =>
              updateItem(item.id, (p) => (p.priority = p.priority === 'High' ? 'Normal' : 'High'))
            }
          />
        </div>
      </div>
      <div id={contentId} hidden={!expanded}>
        <div className="checklist-body">
          {tasks.map(({ t }) => (
            <TaskRow key={t.id} item={item} task={t} prioritizable />
          ))}
          <Button className="link checklist-edit" onClick={() => open(item.id, 'Production')}>
            Edit checklist <AppIcon icon={ArrowRight} />
          </Button>
        </div>
      </div>
    </section>
  );
}
