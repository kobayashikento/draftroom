'use client';

import { useRef, useState } from 'react';
import { Sparkles, ChevronUp } from 'lucide-react';
import { AppIcon } from './icons';
import { Button } from './ui';
import { useWorkspace } from './workspace/workspace-context';
import useAssistant from './assistant/use-assistant.ts';
import AssistantPanel from './assistant/assistant-panel';

export default function Assistant() {
  const assistant = useAssistant();
  const { modal } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  function close() {
    setExpanded(false);
    trigger.current?.focus();
  }
  return (
    <aside className="assistant-dock" aria-label="Draftroom assistant" hidden={Boolean(modal)}>
      <AssistantPanel assistant={assistant} onClose={close} inputRef={input} hidden={!expanded} />
      <Button
        ref={trigger}
        className="assistant-trigger"
        aria-expanded={expanded}
        aria-controls="draftroom-assistant"
        onClick={() => {
          if (expanded) close();
          else {
            setExpanded(true);
            setTimeout(() => input.current?.focus(), 0);
          }
        }}
      >
        <span className="assistant-avatar">
          <AppIcon icon={Sparkles} size="md" />
        </span>
        <span className="font-semibold">Ask Draftroom</span>
        <AppIcon icon={ChevronUp} className={expanded ? 'rotate-180' : ''} />
      </Button>
    </aside>
  );
}
