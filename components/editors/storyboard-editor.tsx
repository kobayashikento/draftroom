'use client';

import {
  storyboardFieldSetter,
  addStoryboardEntry,
  removeStoryboardEntry
} from './storyboard.helpers.ts';
import type { StoryboardProps } from './editors.helpers.ts';
import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Textarea, Button, Field, Select } from '../ui';
import { CREATIVE_REFERENCES } from '../../supabase/functions/_shared/creative-brief.ts';
import { useWorkspace } from '../workspace/workspace-context';
import { reorder } from '../../lib/reorder.ts';
import CreativeReference from '../creative/creative-reference';

export default function Storyboard({ item }: StoryboardProps) {
  const { updateItem } = useWorkspace();
  const set = storyboardFieldSetter(item.id, updateItem);
  const noun = item.format === 'Reel' ? 'shot' : 'slide';
  return (
    <>
      <p className="subtitle mb-4">
        {item.format === 'Reel'
          ? 'Build your reel, one shot at a time.'
          : 'Tell your story, one slide at a time.'}
      </p>
      {item.notes && (
        <details className="storyboard-direction mb-4" open>
          <summary className="text-sm font-medium">Creative direction</summary>
          <div className="mt-3 text-sm leading-6 whitespace-pre-wrap">{item.notes}</div>
        </details>
      )}
      {item.storyboard.map((entry, i) => (
        <div className="entry" key={entry.id}>
          <div className="entry-head">
            <span className="number">{String(i + 1).padStart(2, '0')}</span>
            <Input
              type="checkbox"
              aria-label={`Complete ${noun} ${i + 1}`}
              checked={entry.done}
              onChange={e => set(entry.id, 'done', e.target.checked)}
            />
            <Input
              aria-label={`Entry ${i + 1} title`}
              type="text"
              value={entry.title}
              onChange={e => set(entry.id, 'title', e.target.value)}
            />
            <div className="entry-controls">
              <Button
                className="icon-button"
                aria-label="Move entry up"
                disabled={i === 0}
                onClick={() => updateItem(item.id, p => reorder(p.storyboard, entry.id, -1))}
              >
                <AppIcon icon={ArrowUp} />
              </Button>
              <Button
                className="icon-button"
                aria-label="Move entry down"
                disabled={i === item.storyboard.length - 1}
                onClick={() => updateItem(item.id, p => reorder(p.storyboard, entry.id, 1))}
              >
                <AppIcon icon={ArrowDown} />
              </Button>
              <Button
                className="icon-button"
                aria-label="Remove entry"
                onClick={() => updateItem(item.id, p => removeStoryboardEntry(p, entry.id))}
              >
                <AppIcon icon={X} />
              </Button>
            </div>
          </div>
          <div className="storyboard-entry-body">
            <CreativeReference reference={entry.reference} />
            <div className="fields">
              <Field label="Overlay text">
                <Input
                  placeholder="A few words on screen"
                  value={entry.overlay}
                  onChange={e => set(entry.id, 'overlay', e.target.value)}
                />
              </Field>
              <Field label="Reference image / inspiration URL">
                <Select
                  aria-label={`Visual inspiration for ${noun} ${i + 1}`}
                  options={[
                    ['', 'Your own reference'],
                    ...CREATIVE_REFERENCES.map(image => [image.id, image.title])
                  ]}
                  value={CREATIVE_REFERENCES.find(image => image.id === entry.reference)?.id || ''}
                  onChange={value => set(entry.id, 'reference', value)}
                />
                {!CREATIVE_REFERENCES.some(image => image.id === entry.reference) &&
                  !entry.reference.startsWith('media:') && (
                    <Input
                      placeholder="https://…"
                      value={entry.reference}
                      onChange={e => set(entry.id, 'reference', e.target.value)}
                    />
                  )}
                {entry.reference.startsWith('media:') && (
                  <Button onClick={() => set(entry.id, 'reference', '')}>Remove reference</Button>
                )}
              </Field>
              <Field
                wide
                label={
                  item.format === 'Reel'
                    ? 'Shot notes · framing, action, audio, duration'
                    : 'Slide notes · photo, composition, layout'
                }
              >
                <Textarea
                  rows={5}
                  value={entry.notes}
                  onChange={e => set(entry.id, 'notes', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      ))}
      <Button onClick={() => updateItem(item.id, addStoryboardEntry)}>
        <AppIcon icon={Plus} />
        Add {noun}
      </Button>
      {item.publications.some(publication => publication.caption) && (
        <details className="storyboard-direction mt-4">
          <summary className="text-sm font-medium">Draft captions</summary>
          {item.publications
            .filter(publication => publication.caption)
            .map(publication => (
              <div key={publication.id} className="mt-3 space-y-2">
                <div className="text-xs font-medium text-muted">{publication.platform}</div>
                <div className="text-sm leading-6 whitespace-pre-wrap">{publication.caption}</div>
              </div>
            ))}
        </details>
      )}
    </>
  );
}
