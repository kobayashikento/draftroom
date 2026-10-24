import type { Item, ItemUpdater } from '../../lib/types.ts';
import { uid } from '../../lib/model.ts';

export type StoryboardFields = {
  title: string;
  notes: string;
  overlay: string;
  reference: string;
  done: boolean;
};
export type StoryboardFieldSetter = <K extends keyof StoryboardFields>(
  id: string,
  key: K,
  value: StoryboardFields[K]
) => void;

export function storyboardFieldSetter(
  itemId: string,
  updateItem: ItemUpdater
): StoryboardFieldSetter {
  return (id, key, value) =>
    updateItem(itemId, draft => {
      const entry = draft.storyboard.find(entry => entry.id === id);
      if (entry) {
        const fields: StoryboardFields = entry;
        fields[key] = value;
      }
    });
}

export function addStoryboardEntry(item: Item): void {
  item.storyboard.push({
    id: uid(),
    title: 'A new moment',
    overlay: '',
    notes: '',
    reference: '',
    done: false
  });
}

export function removeStoryboardEntry(item: Item, id: string): void {
  item.storyboard = item.storyboard.filter(entry => entry.id !== id);
}
