'use client';

import { useMemo } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { useMedia } from '../media/media-context';
import { assistantReferenceIndex } from './assistant-links.helpers.ts';

export default function useAssistantLinks() {
  const { state } = useWorkspace();
  const { media } = useMedia();
  return useMemo(() => assistantReferenceIndex(state, media), [state, media]);
}
