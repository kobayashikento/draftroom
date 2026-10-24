'use client';
import type { Item, StoryboardEntry } from '../../lib/types.ts';
type StoryboardProps = { item: Item };

import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Textarea, Button, Field } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import { reorder } from '../../lib/reorder.ts';
import { uid } from '../../lib/model';

export default function Storyboard({ item }: StoryboardProps) {
  const { updateItem } = useWorkspace();
  const set = <K extends keyof StoryboardEntry>(id: string, key: K, value: StoryboardEntry[K]) =>
    updateItem(item.id, (draft) => {
      const target = draft.storyboard.find((entry) => entry.id === id);
      if (target) target[key] = value;
    });
  return (
    <>
      <p className="subtitle mb-4">
        {item.format === 'Reel'
          ? 'Build your reel, one shot at a time.'
          : 'Tell your story, one slide at a time.'}
      </p>
      {item.storyboard.map((entry, i) => (
        <div className="entry" key={entry.id}>
          <div className="entry-head">
            <span className="number">{String(i + 1).padStart(2, '0')}</span>
            <Input
              type="checkbox"
              aria-label={`Complete ${noun} ${i + 1}`}
              checked={entry.done}
              onChange={(e) => set(entry.id, 'done', e.target.checked)}
            />
            <Input
              aria-label={`Entry ${i + 1} title`}
              type="text"
              value={entry.title}
              onChange={(e) => set(entry.id, 'title', e.target.value)}
            />
            <div className="entry-controls">
              <Button
                className="icon-button"
                aria-label="Move entry up"
                disabled={i === 0}
                onClick={() => updateItem(item.id, (p) => reorder(p.storyboard, entry.id, -1))}
              >
                <AppIcon icon={ArrowUp} />
              </Button>
              <Button
                className="icon-button"
                aria-label="Move entry down"
                disabled={i === item.storyboard.length - 1}
                onClick={() => updateItem(item.id, (p) => reorder(p.storyboard, entry.id, 1))}
              >
                <AppIcon icon={ArrowDown} />
              </Button>
              <Button
                className="icon-button"
                aria-label="Remove entry"
                onClick={() =>
                  updateItem(
                    item.id,
                    (p) => (p.storyboard = p.storyboard.filter((x) => x.id !== entry.id)),
                  )
                }
              >
                <AppIcon icon={X} />
              </Button>
            </div>
          </div>
          <div className="fields">
            <Field label="Overlay text">
              <Input
                placeholder="A few words on screen"
                value={entry.overlay}
                onChange={(e) => set(entry.id, 'overlay', e.target.value)}
              />
            </Field>
            <Field label="Reference image / inspiration URL">
              <Input
                type="url"
                placeholder="https://…"
                value={entry.reference}
                onChange={(e) => set(entry.id, 'reference', e.target.value)}
              />
            </Field>
            <Field
              wide
              label={
                item.format === 'Reel'
                  ? 'Shot notes · framing, action, audio, duration'
                  : 'Personal note · why this little moment matters'
              }
            >
              <Textarea
                value={entry.notes}
                onChange={(e) => set(entry.id, 'notes', e.target.value)}
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        onClick={() =>
          updateItem(item.id, (p) =>
            p.storyboard.push({
              id: uid(),
              title: 'A new moment',
              overlay: '',
              notes: '',
              reference: '',
              done: false,
            }),
          )
        }
      >
        <AppIcon icon={Plus} />
        Add {noun}
      </Button>
    </>
  );
}
