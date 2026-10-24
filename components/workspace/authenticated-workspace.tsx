'use client';
import type { ReactNode } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';
import { useEffect, useState } from 'react';
import AccountShell from '../account/account-shell';
import SignIn from '../account/sign-in';
import CloudWorkspace from './cloud-workspace';

type AuthenticatedWorkspaceProps = { client: SupabaseClient<Database>; children: ReactNode };

export default function AuthenticatedWorkspace({ client, children }: AuthenticatedWorkspaceProps) {
  const [auth, setAuth] = useState<{ loading: boolean; session: Session | null; error: string }>({
    loading: true,
    session: null,
    error: '',
  });
  useEffect(() => {
    let active = true;
    let observed = false;
    // Keep this callback synchronous; Supabase performs session refresh under a lock.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      observed = true;
      if (active) setAuth({ loading: false, session, error: '' });
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !observed)
          setAuth({
            loading: false,
            session: data.session,
            error: error ? 'Please sign in again to open your workspace.' : '',
          });
      })
      .catch(() => {
        if (active)
          setAuth({
            loading: false,
            session: null,
            error: 'Please sign in again to open your workspace.',
          });
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);
  if (auth.loading) return <AccountShell title="Opening draftroom…" />;
  if (!auth.session) return <SignIn client={client} sessionError={auth.error} />;
  return (
    <CloudWorkspace key={auth.session.user.id} client={client} session={auth.session}>
      {children}
    </CloudWorkspace>
  );
}
