'use client';

import type { CalendarDraggableCardProps } from './calendar-dnd.helpers.ts';
import { GripVertical } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import useCalendarDraggable from './use-calendar-draggable.ts';

export default function CalendarDraggableCard(props: CalendarDraggableCardProps) {
  if (!props.canDrag) return <article className={props.className}>{props.children(null)}</article>;
  return <DraggableCard {...props} />;
}

function DraggableCard(props: CalendarDraggableCardProps) {
  const drag = useCalendarDraggable(props);
  const handle = props.canDrag ? (
    <Button
      ref={drag.handleRef}
      className="icon-button planner-drag-handle"
      aria-label={`Drag ${props.kind.toLowerCase()}: ${props.label} to another day`}
      title="Drag to move. Press Space for keyboard controls."
    >
      <AppIcon icon={GripVertical} />
    </Button>
  ) : null;
  return (
    <article
      ref={drag.ref}
      className={props.className}
      draggable={false}
      data-movable={props.canDrag}
      data-dragging={drag.isDragSource || undefined}
    >
      {props.children(handle)}
    </article>
  );
}
