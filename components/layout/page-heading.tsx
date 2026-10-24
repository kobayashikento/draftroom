'use client';

import { pages } from './layout.helpers.ts';
import type { PageHeadingProps } from './layout.helpers.ts';
import { Plus } from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';

export default function PageHeading({ view }: PageHeadingProps) {
  const { setModal } = useWorkspace();
  return (
    <div className="heading">
      <div>
        <h1>{pages[view][1]}</h1>
        <p className="subtitle">{pages[view][2]}</p>
      </div>
      <Button className="primary" onClick={() => setModal({ type: 'add' })}>
        <AppIcon icon={Plus} />
        New idea
      </Button>
    </div>
  );
}
