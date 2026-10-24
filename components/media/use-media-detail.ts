'use client';

import { useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { useMedia } from './media-context';
import type { MediaDetailProps } from './media.helpers.ts';

export default function useMediaDetail({ record, close }: MediaDetailProps) {
  const library = useMedia();
  const { state, open } = useWorkspace();
  const [error, setError] = useState('');
  const idea = state.items.find(item => item.id === record.linked_item_id);
  const account = library.accounts.find(account => account.platform === record.platform);
  async function archive() {
    try {
      await library.updateMedia(record, record.linked_item_id, !record.archived_at);
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'This change could not be saved.');
    }
  }
  function linkIdea(value: string) {
    setError('');
    void library
      .updateMedia(record, value, Boolean(record.archived_at))
      .catch(error =>
        setError(error instanceof Error ? error.message : 'The idea could not be linked.')
      );
  }
  function openIdea() {
    if (!idea) return;
    close();
    open(idea.id, 'Production');
  }
  return { library, state, error, idea, account, archive, linkIdea, openIdea };
}
