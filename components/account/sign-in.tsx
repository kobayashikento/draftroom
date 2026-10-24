'use client';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';
import { useState } from 'react';
import { Text, Stack } from '@chakra-ui/react';
import { LogIn } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Field, Input } from '../ui';
import AccountShell from './account-shell';

type SignInProps = { client: SupabaseClient<Database>; sessionError?: string };

export default function SignIn({ client, sessionError }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(sessionError || '');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error)
        setError('We couldn’t sign you in. Check your email and password, then try again.');
    } catch {
      setError('We couldn’t reach your workspace. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountShell title="Your ideas have a home.">
      <Text className="subtitle">
        Sign in to your private workspace to pick up where you left off.
      </Text>
      <form onSubmit={submit}>
        <Stack gap="6">
          <Field label="Email">
            <Input
              required
              autoFocus
              autoComplete="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              required
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <Text role="alert" className="warning">
              {error}
            </Text>
          )}
          <Button type="submit" className="primary" disabled={busy}>
            <AppIcon icon={LogIn} />
            {busy ? 'Signing in…' : 'Sign in to draftroom'}
          </Button>
        </Stack>
      </form>
      <Text className="footnote">
        This is a private workspace. Use the account created by the project owner.
      </Text>
    </AccountShell>
  );
}
