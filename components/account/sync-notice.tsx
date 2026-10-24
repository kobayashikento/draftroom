'use client';
import type { WorkspaceRow, ConflictChoice } from '../../lib/types.ts';
type SyncNoticeProps = { cloud?: boolean; error?: string; cacheError?: string; conflict?: WorkspaceRow | null; retry?: () => void | Promise<void>; resolve?: (choice: ConflictChoice) => Promise<void>; exportData: () => void };

import { useState } from 'react';
import { Text, Stack, Alert } from '@chakra-ui/react';
import { Info, TriangleAlert, Download, RefreshCw } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';

export default function SyncNotice({
  cloud,
  error,
  cacheError,
  conflict,
  retry,
  resolve,
  exportData,
}: SyncNoticeProps) {
  const [resolving, setResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState('');
  async function choose(choice: ConflictChoice) {
    setResolving(true);
    setResolutionError('');
    try {
      await resolve?.(choice);
    } catch {
      setResolutionError('Could not preserve a recovery copy. Export your drafts, then try again.');
    } finally {
      setResolving(false);
    }
  }
  if (!cloud)
    return (
      <Alert.Root
        colorPalette="pistachio"
        bg="draftroom.accentSoft"
        color="draftroom.ink"
        status="info"
        className="sync-notice local-notice"
        variant="subtle"
      >
        <Alert.Indicator color="draftroom.mossStrong">
          <AppIcon icon={Info} size="md" />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Saved on this browser</Alert.Title>
          <Alert.Description>
            Cloud storage isn’t connected yet. Your drafts are available on this device.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  if (conflict)
    return (
      <Alert.Root
        colorPalette="pistachio"
        bg="draftroom.warning"
        color="draftroom.ink"
        status="warning"
        className="sync-notice"
        variant="subtle"
      >
        <Alert.Indicator color="draftroom.mossStrong">
          <AppIcon icon={TriangleAlert} size="md" />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>A newer version is saved in the cloud</Alert.Title>
          <Alert.Description>
            Choose which version to continue with. The version being replaced is kept as a recovery
            copy on this browser.
          </Alert.Description>
          {resolutionError && (
            <Text role="alert" fontSize="sm">
              {resolutionError}
            </Text>
          )}
          <Stack direction={{ base: 'column', md: 'row' }} gap="3" mt="3">
            <Button onClick={exportData}>
              <AppIcon icon={Download} />
              Export this device’s version
            </Button>
            <Button disabled={resolving} onClick={() => choose('cloud')}>
              Load cloud version
            </Button>
            <Button disabled={resolving} className="primary" onClick={() => choose('local')}>
              Keep this device’s version
            </Button>
          </Stack>
        </Alert.Content>
      </Alert.Root>
    );
  if (!error && !cacheError) return null;
  return (
    <Alert.Root
      colorPalette="pistachio"
      bg="draftroom.warning"
      color="draftroom.ink"
      status="warning"
      className="sync-notice"
      variant="subtle"
    >
      <Alert.Indicator color="draftroom.mossStrong">
        <AppIcon icon={TriangleAlert} size="md" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>Some changes need attention</Alert.Title>
        <Alert.Description>{error || cacheError}</Alert.Description>
        <Stack direction="row" gap="3" mt="3">
          <Button onClick={retry}>
            <AppIcon icon={RefreshCw} />
            Retry sync
          </Button>
          <Button onClick={exportData}>
            <AppIcon icon={Download} />
            Export backup
          </Button>
        </Stack>
      </Alert.Content>
    </Alert.Root>
  );
}
