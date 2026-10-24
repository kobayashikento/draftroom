'use client';

import { useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import type { CalendarSyncedPost } from './calendar.helpers.ts';

export default function useCalendarPost(post: CalendarSyncedPost) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { open } = useWorkspace();
  return {
    previewOpen,
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false),
    openIdea: () => {
      if (post.item) open(post.item.id, 'Publish');
    }
  };
}
