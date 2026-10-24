'use client';
import type { ReactNode } from 'react';
import { Dialog, Portal } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';

type ModalProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  eyebrow?: string;
  compact?: boolean;
};

export default function Modal({
  title,
  children,
  footer,
  onClose,
  eyebrow,
  compact = false,
}: ModalProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
      placement="center"
      scrollBehavior="inside"
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop bg="draftroom.overlay" backdropFilter="blur(3px)" />
        <Dialog.Positioner padding={{ base: '4', md: '8' }}>
          <Dialog.Content
            className="studio-dialog"
            width={compact ? '480px' : '920px'}
            maxWidth="95vw"
            maxHeight="92vh"
            bg="draftroom.canvas"
            color="draftroom.ink"
            overflow="hidden"
          >
            <Dialog.Header className="modal-head">
              <div>
                {eyebrow && <div className="meta">{eyebrow}</div>}
                <Dialog.Title asChild>
                  <h2>{title}</h2>
                </Dialog.Title>
              </div>
              <Button className="icon-button" aria-label="Close editor" onClick={onClose}>
                <AppIcon icon={X} />
              </Button>
            </Dialog.Header>
            <Dialog.Body className="modal-body" overflowY="auto">
              {children}
            </Dialog.Body>
            {footer && <Dialog.Footer className="modal-footer">{footer}</Dialog.Footer>}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
