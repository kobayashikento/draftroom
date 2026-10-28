import { CREATIVE_REFERENCES } from '../../supabase/functions/_shared/creative-brief.ts';
import type { MediaRecord } from '../../supabase/functions/_shared/social-types.ts';
import { safeHttpsUrl } from '../../supabase/functions/_shared/media-helpers.ts';
import { workspaceLinkHref } from '../../lib/workspace-links.ts';

export type CreativeReferenceProps = { reference: string };
export type CreativeReferenceImage = { src: string; alt: string; label: string; href: string };
export function creativeReferenceImage(
  reference: string,
  media: MediaRecord[]
): CreativeReferenceImage | null {
  const inspiration = CREATIVE_REFERENCES.find(
    image => image.id === reference || image.src === reference
  );
  if (inspiration)
    return {
      src: inspiration.src,
      alt: inspiration.alt,
      label: 'AI-generated inspiration',
      href: ''
    };
  if (reference.startsWith('media:')) {
    const post = media.find(record => record.id === reference.slice(6));
    if (!post) return null;
    return {
      src: safeHttpsUrl(post.thumbnail_url || (post.media_type !== 'video' ? post.media_url : '')),
      alt: `Reference: ${post.title}`,
      label: `From your library · ${post.platform || 'uploaded media'}`,
      href: workspaceLinkHref({ type: 'post', id: post.id })
    };
  }
  const url = safeHttpsUrl(reference);
  return url
    ? { src: url, alt: 'Saved visual reference', label: 'Your reference', href: url }
    : null;
}
