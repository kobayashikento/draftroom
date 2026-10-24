'use client';

import { BrandMark } from '../icons';
import useSocialCallback from './use-social-callback.ts';

export default function SocialCallback() {
  const error = useSocialCallback();
  return (
    <main className="social-callback-page">
      <BrandMark />
      <h1>{error ? 'Let’s try that connection again.' : 'Bringing your work home…'}</h1>
      <p role={error ? 'alert' : 'status'}>
        {error || 'Finishing your secure account connection.'}
      </p>
      {error && <a href="/?view=Library">Return to your library</a>}
    </main>
  );
}
