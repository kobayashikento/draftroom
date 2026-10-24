'use client';

import { useCallback, useRef } from 'react';

export default function useLinkedTask(taskId?: string) {
  const target = useRef<HTMLDivElement | null>(null);
  const initialFocusEl = useCallback(() => {
    target.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    return target.current?.querySelector<HTMLInputElement>('input[type="text"]') || null;
  }, []);
  return {
    target,
    initialFocusEl: taskId ? initialFocusEl : undefined
  };
}
