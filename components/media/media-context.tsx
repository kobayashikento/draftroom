'use client';

import { createContext, useContext } from 'react';
import type { MediaController, MediaLibraryProps } from './media.helpers.ts';
import useMediaLibrary from './use-media-library.ts';
import useMediaSync from './use-media-sync.ts';

const Context = createContext<MediaController | null>(null);

export function useMedia(): MediaController {
  const library = useContext(Context);
  if (!library) throw new Error('Media library context is unavailable.');
  return library;
}

export default function MediaProvider({ children, onOpenLibrary }: MediaLibraryProps) {
  const library = useMediaLibrary(onOpenLibrary);
  useMediaSync(library);
  return <Context.Provider value={library}>{children}</Context.Provider>;
}
