'use client';

import { useWorkspace } from '../workspace/workspace-context';
import { assistantBriefItem, saveAssistantBrief } from './assistant-brief.helpers.ts';
import type { AssistantBriefProps } from './assistant-brief.helpers.ts';

export default function useAssistantBrief({ message, index, conversationId }: AssistantBriefProps) {
  const { state, update, notify } = useWorkspace();
  const item = assistantBriefItem(state, message, index);
  function save() {
    update(draft => saveAssistantBrief(draft, conversationId, message.id, index));
    notify('Idea saved with its storyboard and draft captions.');
  }
  return { item, save };
}
