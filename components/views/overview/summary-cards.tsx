'use client';

import { cards, summaryPreview } from './overview.helpers.ts';
import type { SummaryCardsProps } from './overview.helpers.ts';
import { ArrowRight } from 'lucide-react';
import { AppIcon } from '../../icons';
import { Button } from '../../ui';
import CoverIllustration from '../../workspace/cover-illustration';
import IdeaSketch from '../../workspace/idea-sketch';
import { coverSubject } from '../../workspace/artwork.helpers.ts';

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
          <span className="stat-value">
            <strong>{summary[key].length}</strong>
            <span className="stat-previews" aria-hidden="true">
              {summaryPreview(summary, key).map(item => (
                <span className="stat-preview" key={item.id}>
                  <CoverIllustration subject={coverSubject(item.seriesId, item.title)} />
                </span>
              ))}
              {!summary[key].length && (
                <IdeaSketch variant={cards.findIndex(card => card[0] === key)} />
              )}
            </span>
          </span>
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
