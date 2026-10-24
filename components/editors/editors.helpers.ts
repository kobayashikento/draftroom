import type {
  AddIdeaModal,
  Item,
  EditorTab,
  Publication,
  Format,
  ItemUpdater,
  Workspace
} from '../../lib/types.ts';
import type { ReactNode } from 'react';
import { createItem } from '../../lib/model.ts';

export type ItemFields = {
  title: string;
  format: Format;
  stageId: string;
  seriesId: string;
  cadence: string;
  hook: string;
  notes: string;
  tags: string;
  priority: string;
};
export type ItemFieldSetter = <K extends keyof ItemFields>(key: K, value: ItemFields[K]) => void;
export type NewIdeaFields = { title: string; format: Format; seriesId: string };

export const editorTabs: EditorTab[] = [
  'Storyboard',
  'Production',
  'Publish',
  'Notes',
  'Analytics'
];

export function isEditorTab(value: string): value is EditorTab {
  return editorTabs.some(tab => tab === value);
}

export function isFormat(value: string): value is Format {
  return value === 'Reel' || value === 'Carousel';
}

export function itemFieldSetter(itemId: string, updateItem: ItemUpdater): ItemFieldSetter {
  return (key, value) =>
    updateItem(itemId, draft => {
      const fields: ItemFields = draft;
      fields[key] = value;
    });
}

export function assignItemSeries(item: Item, seriesId: string, workspace: Workspace): void {
  item.seriesId = seriesId;
  item.cadence = workspace.series.find(series => series.id === seriesId)?.cadence || item.cadence;
}

export function captureIdea(
  state: Workspace,
  fields: NewIdeaFields,
  modal: AddIdeaModal
): Item | null {
  const title = fields.title.trim();
  if (!title) return null;
  const item = createItem(state, { ...fields, title });
  if (modal.date) {
    const publication =
      item.publications.find(plan => plan.platform === modal.platform) || item.publications[0];
    publication.date = modal.date;
  }
  return item;
}

export function deleteIdea(state: Workspace, id: string): void {
  state.items = state.items.filter(item => item.id !== id);
}

export type AddIdeaProps = { modal: AddIdeaModal; close: () => void };

export type ContentEditorProps = { item: Item; initialTab?: EditorTab; close: () => void };

export type ContentFieldsProps = { item: Item };

export type DeleteIdeaDialogProps = { item: Item; onCancel: () => void; close: () => void };

export type ModalProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  eyebrow?: string;
  compact?: boolean;
};

export type NotesEditorProps = { item: Item };

export type PublishEditorProps = { item: Item };

export type RescheduleEditorProps = { item: Item; publication: Publication; close: () => void };

export type SeriesEditorProps = { id?: string; close: () => void };

export type StageEditorProps = { close: () => void };

export type StoryboardProps = { item: Item };

export type TaskEditorProps = { item: Item };
