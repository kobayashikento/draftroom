'use client';

import { suggestions } from './assistant.helpers.ts';
import type { AssistantWelcomeProps } from './assistant.helpers.ts';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';

export default function AssistantWelcome({
  onSend,
  disabled,
  showSuggestions = true
}: AssistantWelcomeProps) {
  return (
    <div className="assistant-welcome">
      {showSuggestions && (
        <span className="assistant-emblem">
          <AppIcon icon={Sparkles} size="lg" />
        </span>
      )}
      <p className="text-xs font-medium text-muted">A LITTLE SPACE TO THINK</p>
      <h2>What are we making next?</h2>
      <p className="text-sm text-muted">
        Explore what’s working in your imported posts, talk through an idea, or bring a planning PDF
        or image to turn it into next steps.
      </p>
      {showSuggestions && (
        <div className="assistant-suggestions">
          {suggestions.map(text => (
            <Button key={text} onClick={() => onSend(text)} disabled={disabled}>
              {text}
              <AppIcon icon={ArrowUpRight} />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
