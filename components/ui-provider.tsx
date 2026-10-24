'use client';

import { draftroomSystem } from './ui.helpers.ts';
import type { UIProviderProps } from './ui.helpers.ts';
import { ChakraProvider } from '@chakra-ui/react';

export default function UIProvider({ children }: UIProviderProps) {
  return <ChakraProvider value={draftroomSystem}>{children}</ChakraProvider>;
}
