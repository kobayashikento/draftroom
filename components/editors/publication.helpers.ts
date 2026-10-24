import type { Item, ItemUpdater, Publication } from '../../lib/types.ts';
import { reschedulePublication } from '../calendar/calendar.helpers.ts';

export type PublicationFields = { date: string; url: string; postId: string; caption: string };
export type PublicationFieldSetter = <K extends keyof PublicationFields>(
  id: string,
  key: K,
  value: PublicationFields[K]
) => void;

export function publicationFieldSetter(
  itemId: string,
  updateItem: ItemUpdater
): PublicationFieldSetter {
  return (id, key, value) =>
    updateItem(itemId, draft => {
      const publication = draft.publications.find(publication => publication.id === id);
      if (publication) {
        const fields: PublicationFields = publication;
        fields[key] = value;
      }
    });
}

export function togglePublicationPosted(
  item: Item,
  id: string,
  timestamp = new Date().toISOString()
): void {
  const publication = item.publications.find(publication => publication.id === id);
  if (!publication) return;
  publication.state = publication.state === 'planned' ? 'manually_posted' : 'planned';
  publication.publishedAt = publication.state === 'manually_posted' ? timestamp : null;
}

export function canReschedulePublication(publication: Publication, date: string): boolean {
  return reschedulePublication({ publications: [{ ...publication }] }, publication.id, date);
}

export function hasInvalidPublicationUrl(publication: Publication): boolean {
  return Boolean(publication.url && !/^https?:\/\//i.test(publication.url));
}
