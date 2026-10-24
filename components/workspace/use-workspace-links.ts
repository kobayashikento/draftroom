'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { WorkspaceModal } from '../../lib/types.ts';
import { clearWorkspaceLink, parseWorkspaceLink } from '../../lib/workspace-links.ts';
import { useWorkspace } from './workspace-context';
import { useMedia } from '../media/media-context';
import { linkedWorkspaceModal, sameWorkspaceModal } from './workspace-links.helpers.ts';

export default function useWorkspaceLinks() {
  const { state, setModal, notify } = useWorkspace();
  const library = useMedia();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const handled = useRef('');
  const opened = useRef<WorkspaceModal | null>(null);
  useEffect(() => {
    const href = `${pathname}${search ? `?${search}` : ''}`;
    const link = parseWorkspaceLink(href);
    if (!link || link.type === 'view') {
      if (opened.current) {
        const previous = opened.current;
        setModal(current => (sameWorkspaceModal(current, previous) ? null : current));
      }
      handled.current = '';
      opened.current = null;
      return;
    }
    if (handled.current === href || (link.type === 'post' && (library.loading || library.error)))
      return;
    handled.current = href;
    const modal = linkedWorkspaceModal(link, state, library.media);
    opened.current = modal;
    if (modal) setModal(modal);
    else {
      notify('That item is no longer available in this workspace.');
      router.replace(clearWorkspaceLink(href), { scroll: false });
    }
  }, [
    pathname,
    search,
    state,
    library.media,
    library.loading,
    library.error,
    setModal,
    notify,
    router
  ]);
}
