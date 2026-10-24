'use client';

import Link from 'next/link';
import { BrandMark } from '../components/layout/brand-logo';
import useWorkspaceRedirect from '../components/layout/use-workspace-redirect.ts';
import { viewPaths } from '../lib/navigation.ts';

export default function Page() {
  useWorkspaceRedirect();
  return (
    <div className="loading">
      <BrandMark />
      <h1>Opening draftroom…</h1>
      <Link href={viewPaths.Calendar}>Open your calendar</Link>
    </div>
  );
}
