'use client';

import {
  publicationFieldSetter,
  togglePublicationPosted,
  hasInvalidPublicationUrl
} from './publication.helpers.ts';
import type { PublishEditorProps } from './editors.helpers.ts';
import { Input, Textarea, Badge, Button, Field } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';
import PublicationPreview from '../media/publication-preview';
import PublicationPostLinker from '../media/publication-post-linker';
import { useMedia } from '../media/media-context';
import { assessPublicationMedia } from '../media/publication-media.helpers.ts';
import { isIntendedPublication } from '../media/publication-link.helpers.ts';

export default function PublishEditor({ item }: PublishEditorProps) {
  const { updateItem } = useWorkspace();
  const library = useMedia();
  const set = publicationFieldSetter(item.id, updateItem);
  return (
    <>
      <p className="banner">
        Publish from your phone, then move the idea to Posted or mark a channel manually posted to
        sync its connected account. Match the published post below to connect its thumbnail and
        insights and confirm that channel is live.
      </p>
      {item.publications.map(pub => (
        <section className="entry" key={pub.id} aria-label={pub.platform}>
          <div className="section-head mt-0 mb-4">
            <h2>{pub.platform}</h2>
            <Badge className="pill">
              {assessPublicationMedia(item, pub, library.media).confirmed
                ? `Live on ${pub.platform}`
                : pub.linkedPost
                  ? 'Matched post · awaiting sync'
                  : pub.state === 'manually_posted'
                    ? 'Manually posted'
                    : isIntendedPublication(pub)
                      ? 'Planned'
                      : 'Not planned'}
            </Badge>
          </div>
          <PublicationPostLinker item={item} publication={pub} />
          <div className="fields">
            <Field label="Planned publication date">
              <Input
                type="date"
                value={pub.date}
                onInput={e => set(pub.id, 'date', e.currentTarget.value)}
                onChange={e => set(pub.id, 'date', e.target.value)}
              />
            </Field>
            <Field label="Published post URL">
              <Input
                type="url"
                readOnly={Boolean(pub.linkedPost)}
                value={pub.url}
                placeholder="https://…"
                onChange={e => set(pub.id, 'url', e.target.value)}
              />
            </Field>
            <Field label="Platform post ID (optional)">
              <Input
                value={pub.postId}
                readOnly={Boolean(pub.linkedPost)}
                onChange={e => set(pub.id, 'postId', e.target.value)}
              />
            </Field>
            <Field label="Final caption & hashtags" wide>
              <Textarea
                placeholder="Your words, your voice…"
                value={pub.caption}
                onChange={e => set(pub.id, 'caption', e.target.value)}
              />
            </Field>
          </div>
          {hasInvalidPublicationUrl(pub) && (
            <p className="warning">Use a full http or https link.</p>
          )}
          <PublicationPreview item={item} publication={pub} />
          {!pub.linkedPost && (
            <div className="mt-4">
              <Button
                className="small"
                onClick={() => updateItem(item.id, p => togglePublicationPosted(p, pub.id))}
              >
                {pub.state === 'manually_posted' ? 'Undo posted status' : 'Mark manually posted'}
              </Button>
            </div>
          )}
        </section>
      ))}
    </>
  );
}
