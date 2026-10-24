'use client';
import type { LucideIcon } from 'lucide-react';
import type { OverviewSummary, OverviewCategory } from '../../../lib/types.ts';
import { ArrowRight, CalendarDays, CalendarClock, Check, ListChecks } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';

type SummaryCardsProps = {
  summary: OverviewSummary;
  selected: OverviewCategory;
  onSelect: (category: OverviewCategory) => void;
};

const cards: [OverviewCategory, string, string, LucideIcon][] = [
  ['planned', 'Posts planned', 'In your selected week', CalendarDays],
  ['ready', 'Ready to publish', 'Across your workspace', Check],
  ['tasks', 'Tasks to work on', 'One small step at a time', ListChecks],
  ['overdue', 'Need a new date', 'Past dates, still unposted', CalendarClock],
];

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
