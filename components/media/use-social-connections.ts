'use client';

import { useState } from 'react';
import { useMedia } from './media-context';
import type { ProviderSetup, SocialPlatform } from './media.helpers.ts';

export default function useSocialConnections() {
  const library = useMedia();
  const [setup, setSetup] = useState<ProviderSetup | null>(null);
  const [managing, setManaging] = useState<SocialPlatform | null>(null);
  const busy = Boolean(library.busy);
  function connect(platform: SocialPlatform) {
    const config = library.setup.find(setup => setup.platform === platform);
    if (!library.cloud || !config?.configured)
      setSetup(
        config || {
          platform,
          configured: false,
          missing: ['Sign in to a Supabase-connected workspace'],
          callbackUrl: ''
        }
      );
    else void library.connect(platform).catch(() => {});
  }
  function disconnect() {
    if (!managing) return;
    void library
      .disconnect(managing)
      .then(() => setManaging(null))
      .catch(() => {});
  }
  return { library, setup, setSetup, managing, setManaging, busy, connect, disconnect };
}
