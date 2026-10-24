'use client';
import type { DragEvent } from 'react';
import type { Item, Publication } from '../../lib/types.ts';
export type PublicationDrag = ReturnType<typeof usePublicationDrag>;
import { useState } from 'react';
import { useWorkspace } from '../workspace/workspace-context';
import { fmt } from '../../lib/display.ts';
import { reschedulePublication } from '../../lib/calendar';

export default function usePublicationDrag() {
  const { state, updateItem, notify } = useWorkspace();
  const [drag, setDrag] = useState<{ itemId: string; publicationId: string } | null>(null);
  const [targetDate, setTargetDate] = useState('');
  function cancel() {
    setDrag(null);
    setTargetDate('');
  }
  function start(event: DragEvent<HTMLElement>, item: Item, publication: Publication) {
    if (publication.state === 'manually_posted') return event.preventDefault();
    setDrag({ itemId: item.id, publicationId: publication.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${item.title} · ${publication.platform}`);
  }
  function over(date: string, event: DragEvent<HTMLElement>) {
    if (!drag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setTargetDate(date);
  }
  function leave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) setTargetDate('');
  }
  function drop(date: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!drag) return;
    const item = state.items.find((p) => p.id === drag.itemId);
    const publication = item?.publications.find((p) => p.id === drag.publicationId);
    if (item && publication && publication.state !== 'manually_posted' && publication.date !== date) {
      updateItem(item.id, (draft) => reschedulePublication(draft, publication.id, date));
      notify(`${publication.platform} plan moved to ${fmt(date)}.`);
    }
    cancel();
  }
  return { targetDate, start, over, leave, drop, cancel };
}
