'use client';
import type { Item, Publication } from '../../lib/types.ts';
type PublishEditorProps = { item: Item };

import { Input, Textarea, Badge, Button, Field } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function PublishEditor({ item }: PublishEditorProps) {
  const { updateItem } = useWorkspace();
  const set = <K extends keyof Publication>(id: string, key: K, value: Publication[K]) =>
    updateItem(item.id, (draft) => {
      const target = draft.publications.find((entry) => entry.id === id);
      if (target) target[key] = value;
    });
  return (
    <>
      <p className="banner">
        Plan each platform separately. Marking a publication posted records your manual update; it
        does not publish online or change the idea’s workflow stage.
      </p>
      {item.publications.map((pub) => (
        <section className="entry" key={pub.id} aria-label={pub.platform}>
          <div className="section-head mt-0 mb-4">
            <h2>{pub.platform}</h2>
            <Badge className="pill">
              {pub.state === 'manually_posted' ? 'Manually posted' : 'Planned'}
            </Badge>
          </div>
          <div className="fields">
            <Field label="Planned publication date">
              <Input
                type="date"
                value={pub.date}
                onInput={(e) => set(pub.id, 'date', e.currentTarget.value)}
                onChange={(e) => set(pub.id, 'date', e.target.value)}
              />
            </Field>
            <Field label="Published post URL">
              <Input
                type="url"
                value={pub.url}
                placeholder="https://…"
                onChange={(e) => set(pub.id, 'url', e.target.value)}
              />
            </Field>
            <Field label="Platform post ID (optional)">
              <Input value={pub.postId} onChange={(e) => set(pub.id, 'postId', e.target.value)} />
            </Field>
            <Field label="Final caption & hashtags" wide>
              <Textarea
                placeholder="Your words, your voice…"
                value={pub.caption}
                onChange={(e) => set(pub.id, 'caption', e.target.value)}
              />
            </Field>
          </div>
          {pub.url && !/^https?:\/\//i.test(pub.url) && (
            <p className="warning">Use a full http or https link.</p>
          )}
          <div className="mt-4">
            <Button
              className="small"
              onClick={() =>
                updateItem(item.id, (p) => {
                  const target = p.publications.find((x) => x.id === pub.id);
                  if (!target) return;
                  target.state = target.state === 'planned' ? 'manually_posted' : 'planned';
                  target.publishedAt =
                    target.state === 'manually_posted' ? new Date().toISOString() : null;
                })
              }
            >
              {pub.state === 'manually_posted' ? 'Undo posted status' : 'Mark manually posted'}
            </Button>
          </div>
        </section>
      ))}
    </>
  );
}
