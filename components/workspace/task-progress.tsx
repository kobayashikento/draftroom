import type { TaskProgressProps } from './artwork.helpers.ts';
import { Check } from 'lucide-react';
import { AppIcon } from '../icons';

export default function TaskProgress({ completed, total, label }: TaskProgressProps) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <span
      className="task-progress-ring"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total || 1}
      aria-valuenow={completed}
      aria-valuetext={total ? `${completed} of ${total} tasks completed` : 'No tasks yet'}
    >
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <circle className="progress-track" cx="24" cy="24" r="20" />
        <circle
          className="progress-value"
          cx="24"
          cy="24"
          r="20"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span aria-hidden="true">
        {total > 0 && completed === total ? <AppIcon icon={Check} /> : `${percent}%`}
      </span>
    </span>
  );
}
