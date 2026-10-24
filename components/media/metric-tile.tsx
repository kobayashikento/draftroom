'use client';

import { AppIcon } from '../icons';
import type { MetricTileProps } from './media.helpers.ts';
import { formatMetric } from './media.helpers.ts';

export default function MetricTile({ label, value, icon }: MetricTileProps) {
  return (
    <div className="media-metric">
      <span>
        <AppIcon icon={icon} />
        {label}
      </span>
      <strong>{formatMetric(value)}</strong>
    </div>
  );
}
