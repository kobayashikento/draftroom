'use client';

import type { WorkspaceProblemProps } from './account.helpers.ts';
import { Text, Stack } from '@chakra-ui/react';
import { RefreshCw, LogOut } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import AccountShell from './account-shell';

export default function WorkspaceProblem({ message, retry, signOut }: WorkspaceProblemProps) {
  return (
    <AccountShell title="Let’s reconnect your workspace.">
      <Text role="alert">{message}</Text>
      <Text className="subtitle">Your saved copies have been preserved.</Text>
      <Stack direction="row" gap="3">
        <Button className="primary" onClick={retry}>
          <AppIcon icon={RefreshCw} />
          Try again
        </Button>
        {signOut && (
          <Button onClick={signOut}>
            <AppIcon icon={LogOut} />
            Sign out
          </Button>
        )}
      </Stack>
    </AccountShell>
  );
}
