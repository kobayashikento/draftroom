'use client';

import { signInToWorkspace } from './account.helpers.ts';
import type { SignInProps } from './account.helpers.ts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Text, Stack } from '@chakra-ui/react';
import { LogIn } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Field, Input } from '../ui';
import AccountShell from './account-shell';

export default function SignIn({ client, sessionError }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(sessionError || '');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setError(await signInToWorkspace(client, { email, password }));
    setBusy(false);
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
              onChange={e => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              required
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
