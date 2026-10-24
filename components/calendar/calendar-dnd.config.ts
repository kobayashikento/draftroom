import {
  Accessibility,
  Feedback,
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor
} from '@dnd-kit/dom';
import type { DragDropManagerInput } from '@dnd-kit/dom';
import { readCalendarDragData, readCalendarDropDate } from './calendar-dnd.helpers.ts';
import { fmt } from '../../lib/display.ts';

const accessibility: NonNullable<ConstructorParameters<typeof Accessibility>[1]> = {
  screenReaderInstructions: {
    draggable:
      'Press Space or Enter to pick up this card. Use arrow keys to move between days, Space or Enter to drop, or Escape to cancel.'
  },
  announcements: {
    dragstart({ operation }) {
      return `Picked up ${readCalendarDragData(operation.source?.data)?.label || 'calendar card'}.`;
    },
    dragover({ operation }) {
      const date = readCalendarDropDate(operation.target?.data);
      return date
        ? `Move to ${fmt(date, { dateStyle: 'full' })}.`
        : 'Move over a calendar day to drop.';
    },
    dragend({ operation, canceled }) {
      const date = readCalendarDropDate(operation.target?.data);
      return canceled || !date
        ? 'Move canceled. The date stays as it was.'
        : `Dropped on ${fmt(date, { dateStyle: 'full' })}.`;
    }
  }
};

export const calendarSensors = [
  PointerSensor.configure({
    activatorElements: source => [source.element],
    activationConstraints: event =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({ value: 220, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 6 })],
    preventActivation(event, source) {
      const element = event.target;
      if (!(element instanceof Element)) return true;
      if (source.handle?.contains(element)) return false;
      if (element.closest('input, select, textarea, label, a, video, [data-no-drag]')) return true;
      const button = element.closest('button');
      return Boolean(button && !button.matches('.planner-card-open, .planner-task-open'));
    }
  }),
  KeyboardSensor.configure({ offset: { x: 144, y: 200 } })
];

export const calendarPlugins: DragDropManagerInput['plugins'] = defaults => [
  ...defaults,
  Accessibility.configure(accessibility),
  Feedback.configure({ keyboardTransition: null })
];
