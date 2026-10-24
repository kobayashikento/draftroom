import type { Item, Publication } from '../../lib/types.ts';
import type { MediaRecord } from '../../supabase/functions/_shared/social-types.ts';
import { canonicalPost, newMediaRecord } from '../../supabase/functions/_shared/media-helpers.ts';

export type PublicationMediaMatch = {
  record: MediaRecord | null;
  basis: 'url' | 'post_id' | 'linked' | 'upload' | 'none';
  issue: string;
};
export type PublicationMediaAssessment = PublicationMediaMatch & {
  confirmed: boolean;
  label: string;
  format: string;
  issues: string[];
  actualDate: string;
  description: string;
};
export type PublicationArtworkProps = { item: Item; record: MediaRecord | null };

function postReference(url: string) {
  try {
    return canonicalPost(url);
  } catch {
    return null;
  }
}

function preferredRecord(records: MediaRecord[]): MediaRecord | null {
  return (
    [...records].sort(
      (a, b) =>
        Number(b.source === 'api') - Number(a.source === 'api') ||
        b.updated_at.localeCompare(a.updated_at)
    )[0] || null
  );
}

function unmatched(issue = ''): PublicationMediaMatch {
  return { record: null, basis: 'none', issue };
}

/** Explicit references win. Never guess from titles or pick between different linked posts. */
export function resolvePublicationMedia(
  item: Item,
  publication: Publication,
  media: MediaRecord[]
): PublicationMediaMatch {
  const url = publication.url.trim();
  const postId = publication.postId.trim();
  const reference = url ? postReference(url) : null;
  if (url && !reference)
    return unmatched('Use a full Instagram or TikTok post link to match this publication.');
  if (reference && reference.platform !== publication.platform)
    return unmatched(
      `This ${publication.platform} plan links to ${reference.platform}. Check the published post URL.`
    );

  const candidates = media.filter(record => {
    if (record.platform !== publication.platform || record.source === 'upload') return false;
    const recordReference = postReference(record.permalink);
    return !record.permalink || recordReference?.platform === publication.platform;
  });
  const byUrl = reference
    ? preferredRecord(
        candidates.filter(record => postReference(record.permalink)?.id === reference.id)
      )
    : null;
  const byId = postId
    ? preferredRecord(
        candidates.filter(
          record => record.external_id === postId || postReference(record.permalink)?.id === postId
        )
      )
    : null;

  if (reference && postId) {
    const conflict =
      (publication.platform === 'TikTok' && postId !== reference.id) ||
      (byId && postReference(byId.permalink)?.id !== reference.id) ||
      (byUrl?.source === 'api' && byUrl.external_id !== postId && reference.id !== postId);
    if (conflict)
      return unmatched(
        'The post link and platform post ID refer to different posts. Review them before using a preview.'
      );
  }
  if (byUrl) return { record: byUrl, basis: 'url', issue: '' };
  if (reference) {
    const record: MediaRecord = {
      ...newMediaRecord('preview', { title: item.title, source: 'link', linkedItemId: item.id }),
      id: `publication-${publication.id}`,
      platform: publication.platform,
      external_id: reference.id,
      permalink: reference.url
    };
    return { record, basis: 'url', issue: '' };
  }
  if (byId) return { record: byId, basis: 'post_id', issue: '' };
  if (postId)
    return unmatched(
      `No imported ${publication.platform} post matches this ID yet. Sync the account or add its published post URL.`
    );

  const linked = candidates.filter(
    record => record.linked_item_id === item.id && !record.archived_at
  );
  const identities = new Set(
    linked.map(record => postReference(record.permalink)?.id || record.external_id || record.id)
  );
  if (identities.size > 1)
    return unmatched(
      `More than one ${publication.platform} post is linked to this idea. Add the exact published URL or post ID.`
    );
  const record = preferredRecord(linked);
  if (record) return { record, basis: 'linked', issue: '' };

  // An uploaded work-in-progress can illustrate a plan, but cannot verify a published post.
  const uploads = media.filter(
    record => record.source === 'upload' && record.linked_item_id === item.id && !record.archived_at
  );
  if (publication.state === 'planned' && uploads.length === 1)
    return { record: uploads[0], basis: 'upload', issue: '' };
  return unmatched();
}

export function publicationLocalDate(timestamp: string | null, timeZone: string): string {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date(timestamp));
    const part = (type: string) => parts.find(part => part.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return '';
  }
}

function normalizedCaption(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function assessPublicationMedia(
  item: Item,
  publication: Publication,
  media: MediaRecord[],
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
): PublicationMediaAssessment {
  const match = resolvePublicationMedia(item, publication, media);
  const { record } = match;
  const actualDate = publicationLocalDate(record?.published_at || null, timeZone);
  const confirmed = record?.source === 'api' && Boolean(actualDate);
  const issues = match.issue ? [match.issue] : [];
  if (confirmed && record) {
    if (publication.state !== 'manually_posted')
      issues.push(
        `This post was synced as published on ${publication.platform}, but the plan is still marked Planned.`
      );
    if (publication.date && actualDate !== publication.date)
      issues.push(`Published ${actualDate}; calendar plan is dated ${publication.date}.`);
    if (
      publication.caption.trim() &&
      normalizedCaption(publication.caption) !== normalizedCaption(record.caption)
    )
      issues.push('The saved final caption differs from the synced post caption.');
    if (
      (item.format === 'Reel' && record.media_type !== 'video') ||
      (item.format === 'Carousel' && record.media_type !== 'carousel')
    )
      issues.push(
        `The synced post is ${record.media_type === 'image' ? 'a photo' : record.media_type === 'video' ? 'a video' : 'a carousel'}; this idea is labelled ${item.format}.`
      );
  }
  const label = confirmed
    ? 'Synced post'
    : publication.state === 'manually_posted'
      ? 'Manually posted · unverified'
      : match.basis === 'upload'
        ? 'Private draft clip'
        : record
          ? 'Linked post · unverified'
          : 'Draft cover';
  const description = confirmed
    ? `Matched ${publication.platform} post by ${match.basis === 'url' ? 'URL' : match.basis === 'post_id' ? 'platform post ID' : 'its explicit idea link'}. Published ${actualDate}.`
    : publication.state === 'manually_posted'
      ? 'Posted status was recorded manually. Sync the matching post to verify its date, caption and media.'
      : record?.source === 'upload'
        ? 'This private clip is linked to the idea. It is not evidence of a published social post.'
        : record
          ? 'This saved link can be previewed. Sync the account to verify its published details.'
          : 'No matching social media is linked to this plan yet.';
  return {
    ...match,
    confirmed,
    label,
    issues,
    actualDate,
    description,
    format:
      record?.source === 'api'
        ? record.media_type === 'image'
          ? 'Photo'
          : record.media_type === 'carousel'
            ? 'Carousel'
            : 'Reel'
        : item.format
  };
}
