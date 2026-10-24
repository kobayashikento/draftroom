'use client';

import type { UnscheduledPlansProps } from './calendar.helpers.ts';
import { X, ArrowRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { PublicationCards } from './publication-card';
import IdeaSketch from '../workspace/idea-sketch';

export default function UnscheduledPlans({
  entries,
  mode,
  hasFilters,
  visible,
  onClose,
  drag
}: UnscheduledPlansProps) {
  const { setModal } = useWorkspace();
  return (
    <section
      className="planner-drafts"
      id="unscheduled-plans"
      hidden={!visible}
      aria-label="Unscheduled plans"
    >
      <div className="planner-drafts-head">
        <div>
          <h2>Unscheduled</h2>
          <p>
            {mode === 'List' ? 'Choose a date on any card.' : 'Drag onto a day, or choose a date.'}
          </p>
        </div>
        <Button className="icon-button" aria-label="Close unscheduled plans" onClick={onClose}>
          <AppIcon icon={X} />
        </Button>
      </div>
      <div className="planner-draft-cards">
        <PublicationCards
          entries={entries}
          canDrag={mode !== 'List'}
          onDragStart={drag.start}
          onDragEnd={drag.cancel}
        />
      </div>
      {!entries.length && (
        <div className="planner-drafts-empty">
          <IdeaSketch variant={1} />
          <p>
            {hasFilters
              ? 'No unscheduled plans match these filters.'
              : 'Every idea has a date. Your next spark can start here.'}
          </p>
        </div>
      )}
      <Button className="link" onClick={() => setModal({ type: 'add' })}>
        Capture a new idea
        <AppIcon icon={ArrowRight} />
      </Button>
    </section>
  );
}
