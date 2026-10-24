'use client';

import { BrandMark } from '../layout/brand-logo';
import useSocialCallback from './use-social-callback.ts';
import Link from 'next/link';
import { viewPaths } from '../../lib/navigation.ts';

export default function SocialCallback() {
  const error = useSocialCallback();
  return (
    <main className="social-callback-page">
      <BrandMark />
      <h1>{error ? 'Let’s try that connection again.' : 'Bringing your work home…'}</h1>
      <p role={error ? 'alert' : 'status'}>
        {error || 'Finishing your secure account connection.'}
      </p>
      {error && <Link href={viewPaths.Library}>Return to your library</Link>}
    </main>
  );
}
