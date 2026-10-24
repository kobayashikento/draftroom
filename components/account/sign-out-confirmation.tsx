'use client';
type SignOutConfirmationProps = { onClose: () => void; onConfirm: () => void | Promise<void>; exportData: () => void; cacheError?: string };

import { Text, Dialog, Portal } from '@chakra-ui/react';
import { Download, LogOut } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';

export default function SignOutConfirmation({ onClose, onConfirm, exportData, cacheError }: SignOutConfirmationProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop bg="draftroom.overlay" />
        <Dialog.Positioner padding="5">
          <Dialog.Content bg="draftroom.surface" borderRadius="16px" maxWidth="460px" padding="6">
            <Dialog.Header>
              <Dialog.Title>Keep your latest changes safe.</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                {cacheError
                  ? 'This browser could not save a recovery copy. Export a backup before signing out.'
                  : 'Your latest changes are saved on this device, but have not reached the cloud. They will be here when you sign in again on this browser.'}
              </Text>
            </Dialog.Body>
            <Dialog.Footer flexWrap="wrap" gap="3">
              <Button onClick={exportData}>
                <AppIcon icon={Download} />
                Export backup
              </Button>
              <Button onClick={onClose}>Keep working</Button>
              <Button disabled={Boolean(cacheError)} onClick={onConfirm}>
                <AppIcon icon={LogOut} />
                Sign out
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
