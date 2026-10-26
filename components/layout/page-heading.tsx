'use client';

import { pages } from './layout.helpers.ts';
import type { PageHeadingProps } from './layout.helpers.ts';
import { Plus } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import SocialSyncStatus from '../media/social-sync-status';

export default function PageHeading({ view }: PageHeadingProps) {
  const { setModal } = useWorkspace();
  return (
    <div className="heading">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4 md:items-center md:gap-6">
          <div className="min-w-0">
            <h1>{pages[view][1]}</h1>
            <p className="subtitle">{pages[view][2]}</p>
          </div>
          {view !== 'Library' && (
            <Button className="primary shrink-0" onClick={() => setModal({ type: 'add' })}>
              <AppIcon icon={Plus} />
              New idea
            </Button>
          )}
        </div>
        <SocialSyncStatus />
      </div>
    </div>
  );
}
