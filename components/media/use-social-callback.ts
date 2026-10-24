'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseConfig } from '../../lib/supabase.ts';

export default function useSocialCallback() {
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const config = getSupabaseConfig();
      if (!config) throw new Error('The connected workspace is not configured on this website.');
      const params = new URL(window.location.href).searchParams;
      const state = params.get('state') || '';
      const code = params.get('code') || '';
      if (
        !/^[A-Za-z0-9_-]{43}$/.test(state) ||
        code.length > 4096 ||
        (!code && !params.has('error'))
      )
        throw new Error(
          'This connection link is incomplete. Return to the library and start again.'
        );
      const destination = new URL(`${config.url}/functions/v1/draftroom-social-callback`);
      destination.searchParams.set('state', state);
      if (params.has('error')) destination.searchParams.set('error', 'access_denied');
      else destination.searchParams.set('code', code);
      window.history.replaceState(null, '', '/social/callback/');
      window.location.replace(destination.href);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'This connection could not be completed.');
    }
  }, []);
  return error;
}
