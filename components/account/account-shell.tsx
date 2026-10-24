'use client';

import type { AccountShellProps } from './account.helpers.ts';
import { Box, Card, Heading } from '@chakra-ui/react';
import { BrandMark } from '../icons';

export default function AccountShell({ title, children }: AccountShellProps) {
  return (
    <Box as="main" className="account-page">
      <Card.Root
        className="account-card"
        bg="draftroom.surface"
        borderColor="draftroom.border"
        borderRadius="16px"
      >
        <Card.Body gap="6" padding={{ base: '6', md: '8' }}>
          <div className="brand">
            <BrandMark />
            draftroom
          </div>
          <Heading as="h1">{title}</Heading>
          {children}
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
