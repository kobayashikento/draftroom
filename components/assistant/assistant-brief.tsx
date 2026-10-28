'use client';

import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '../ui';
import { AppIcon } from '../icons';
import CreativeReference from '../creative/creative-reference';
import type { AssistantBriefProps } from './assistant-brief.helpers.ts';
import useAssistantBrief from './use-assistant-brief.ts';

export default function AssistantBrief(props: AssistantBriefProps) {
  const { message, index, disabled, onOpen, onNavigate } = props;
  const brief = message.briefs![index];
  const saved = useAssistantBrief(props);
  return (
    <section className="assistant-brief" aria-label={`Creative brief: ${brief.title}`}>
      <div className="creative-brief-intro">
        <CreativeReference reference={brief.reference} />
        <div className="min-w-0 space-y-3">
          <div>
            <div className="mb-2 text-xs text-muted">
              {brief.format} · {brief.length}
              {brief.cadence ? ` · ${brief.cadence}` : ''}
            </div>
            <h3 className="font-sans text-base font-semibold">{brief.title}</h3>
          </div>
          <div className="text-xs font-medium text-muted">Goal: {brief.goal}</div>
          <div className="text-sm leading-6">{brief.concept}</div>
        </div>
      </div>
      <div className="creative-hook">
        <span className="text-xs font-medium text-muted">
          {brief.format === 'Reel' ? 'Opening hook' : 'Cover text'}
        </span>
        <div className="text-sm font-medium leading-6">“{brief.hook}”</div>
      </div>
      <div className="space-y-4">
        <div className="text-sm font-semibold">
          {brief.format === 'Reel' ? 'What to film' : 'What goes on each slide'}
        </div>
        {brief.steps.map((step, stepIndex) => (
          <div className="creative-step" key={stepIndex}>
            <span className="number">{String(stepIndex + 1).padStart(2, '0')}</span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{step.title}</span>
                <span className="text-xs text-muted">{step.timing}</span>
              </div>
              <div className="text-sm leading-6">{step.direction}</div>
              {step.overlay && (
                <div className="text-sm text-muted">On screen: “{step.overlay}”</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-sm leading-6">
        <div className="font-semibold">
          {brief.format === 'Reel' ? 'Edit & audio' : 'Layout & finish'}
        </div>
        <div>{brief.editing}</div>
      </div>
      <div className="creative-caption space-y-2">
        <div className="text-xs font-medium text-muted">Draft caption</div>
        <div className="text-sm leading-6 whitespace-pre-wrap">{brief.caption}</div>
      </div>
      <div className="text-sm leading-6 text-muted">
        <span className="font-medium">Why this idea: </span>
        {brief.rationale}
      </div>
      <Button
        disabled={disabled}
        onClick={
          saved.item
            ? () => {
                onNavigate();
                onOpen(saved.item!.id, 'Storyboard');
              }
            : saved.save
        }
      >
        <AppIcon icon={saved.item ? ArrowUpRight : Plus} />
        {saved.item ? 'Open storyboard' : 'Save idea'}
      </Button>
    </section>
  );
}
