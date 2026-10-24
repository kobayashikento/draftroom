'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { View } from '../../lib/types.ts';
import { viewForPathname, viewPaths } from '../../lib/navigation.ts';
import { useWorkspaceContext } from '../workspace/workspace-context';

export default function useWorkspaceNavigation() {
  const router = useRouter();
  const view = viewForPathname(usePathname());
  const { setModal } = useWorkspaceContext();
  const [compactNav, setCompactNav] = useState(false);

  return {
    view,
    compactNav,
    toggleNavigation: () => setCompactNav(value => !value),
    navigate: (name: View) => router.push(viewPaths[name]),
    openLibrary: () => {
      setModal(null);
      router.push(viewPaths.Library);
    }
  };
}
