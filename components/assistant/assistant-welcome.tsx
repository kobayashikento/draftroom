'use client';

import { suggestions } from './assistant.helpers.ts';
import type { AssistantWelcomeProps } from './assistant.helpers.ts';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';

export default function AssistantWelcome({ onSend, disabled }: AssistantWelcomeProps) {
  return (
    <div className="assistant-welcome">
      <span className="assistant-emblem">
        <AppIcon icon={Sparkles} size="lg" />
      </span>
      <p className="text-xs font-medium text-muted">A LITTLE SPACE TO THINK</p>
      <h2>What are we making next?</h2>
      <p className="text-sm text-muted">
        Talk through an idea, find your next step, or ask me to add tasks to your projects.
      </p>
      <div className="assistant-suggestions">
        {suggestions.map(text => (
          <Button key={text} onClick={() => onSend(text)} disabled={disabled}>
            {text}
            <AppIcon icon={ArrowUpRight} />
          </Button>
        ))}
      </div>
    </div>
  );
}
