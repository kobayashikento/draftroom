'use client';

import { cards } from './overview.helpers.ts';
import type { SummaryCardsProps } from './overview.helpers.ts';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';

export default function SummaryCards({ summary, selected, onSelect }: SummaryCardsProps) {
  return (
    <div className="stats" role="group" aria-label="Overview summaries">
      {cards.map(([key, label, detail, Icon]) => (
        <Button
          className="stat"
          key={key}
          aria-label={`Show ${label.toLowerCase()} (${summary[key].length})`}
          aria-pressed={selected === key}
          aria-controls="overview-results"
          onClick={() => onSelect(key)}
        >
          <span className="stat-head">
            <span className="stat-label">{label}</span>
            <span className="stat-icon">
              <AppIcon icon={Icon} size="md" />
            </span>
          </span>
          <strong>{summary[key].length}</strong>
          <span className="tiny">{detail}</span>
          <span className="stat-action">
            {key === 'tasks' ? 'View tasks' : 'View posts'}
            <AppIcon icon={ArrowRight} />
          </span>
        </Button>
      ))}
    </div>
  );
}
