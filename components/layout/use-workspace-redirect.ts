'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { workspaceEntryPath } from '../../lib/navigation.ts';

export default function useWorkspaceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(workspaceEntryPath(new URL(window.location.href)));
  }, [router]);
}
