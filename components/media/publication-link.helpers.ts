import type { Item, Publication, Workspace } from '../../lib/types.ts';
import type { MediaRecord } from '../../supabase/functions/_shared/social-types.ts';
import { canonicalPost } from '../../supabase/functions/_shared/media-helpers.ts';
import { assessPublicationMedia, resolvePublicationMedia } from './publication-media.helpers.ts';

export type PublicationPostLinkInput = { itemId: string; publicationId: string; mediaId: string };
export type PublicationPostLinkProps = { item: Item; publication: Publication };
export type ItemPostConnectionProps = { item: Item; onLink?: () => void };
export type PublishedPostCandidate = { record: MediaRecord; unavailableReason: string };
export type PreparedPublicationPostLink = {
  input: PublicationPostLinkInput;
  record: MediaRecord;
  publishedAt: string;
  previousRecord: MediaRecord | null;
  previousLinkedItemId: string;
};

function postIdentity(record: MediaRecord): string {
  try {
    const post = canonicalPost(record.permalink);
    return `${post.platform}:${post.id}`;
  } catch {
    return `${record.platform}:${record.external_id || record.id}`;
  }
}

function recordLinkError(
  state: Workspace,
  item: Item,
  publication: Publication,
  record: MediaRecord
): string {
  if (
    record.source !== 'api' ||
    !record.external_id ||
    !record.published_at ||
    !Number.isFinite(Date.parse(record.published_at)) ||
    record.archived_at
  )
    return 'Choose an active, API-synced post with a published date.';
  if (record.platform !== publication.platform)
    return `Choose a ${publication.platform} post for this publication.`;
  try {
    if (canonicalPost(record.permalink).platform !== publication.platform)
      return 'This post has an invalid platform link.';
  } catch {
    return 'Sync this post again to get its published link.';
  }
  if (record.linked_item_id && record.linked_item_id !== item.id)
    return `Already connected to ${state.items.find(p => p.id === record.linked_item_id)?.title || 'another idea'}.`;
  return '';
}

export function publicationPostLinkError(
  state: Workspace,
  media: MediaRecord[],
  input: PublicationPostLinkInput
): string {
  const item = state.items.find(item => item.id === input.itemId);
  const publication = item?.publications.find(pub => pub.id === input.publicationId);
  const record = media.find(record => record.id === input.mediaId);
  if (!item || !publication) return 'This idea or publication is no longer available.';
  if (!record) return 'This post is no longer available.';
  const error = recordLinkError(state, item, publication, record);
  if (error) return error;
  for (const other of state.items) {
    for (const pub of other.publications) {
      if (other.id === item.id && pub.id === publication.id) continue;
      const matched = resolvePublicationMedia(other, pub, media).record;
      if (matched && postIdentity(matched) === postIdentity(record))
        return `Already matched to ${other.title}.`;
    }
  }
  return '';
}

export function publishedPostCandidates(
  state: Workspace,
  media: MediaRecord[],
  item: Item,
  publication: Publication,
  query = ''
): PublishedPostCandidate[] {
  const claimed = new Map<string, string>();
  for (const other of state.items) {
    for (const pub of other.publications) {
      if (
        (other.id === item.id && pub.id === publication.id) ||
        pub.platform !== publication.platform
      )
        continue;
      const record = resolvePublicationMedia(other, pub, media).record;
      if (record) claimed.set(postIdentity(record), `Already matched to ${other.title}.`);
    }
  }
  const candidates = media
    .filter(
      record =>
        record.source === 'api' &&
        record.platform === publication.platform &&
        !record.archived_at &&
        record.published_at &&
        Number.isFinite(Date.parse(record.published_at))
    )
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
    .map(record => ({
      record,
      unavailableReason:
        recordLinkError(state, item, publication, record) || claimed.get(postIdentity(record)) || ''
    }));
  return filterPublishedPostCandidates(candidates, query);
}

export function filterPublishedPostCandidates(
  candidates: PublishedPostCandidate[],
  query: string
): PublishedPostCandidate[] {
  const search = query.trim().toLocaleLowerCase();
  return candidates.filter(
    ({ record }) =>
      !search || `${record.title} ${record.caption}`.toLocaleLowerCase().includes(search)
  );
}

export function preparePublicationPostLink(
  state: Workspace,
  media: MediaRecord[],
  input: PublicationPostLinkInput
): PreparedPublicationPostLink {
  const error = publicationPostLinkError(state, media, input);
  if (error) throw new Error(error);
  const publication = state.items
    .find(item => item.id === input.itemId)
    ?.publications.find(pub => pub.id === input.publicationId);
  const record = media.find(record => record.id === input.mediaId);
  if (!publication || !record?.published_at) throw new Error('This post is no longer available.');
  return {
    input,
    record,
    publishedAt: new Date(record.published_at).toISOString(),
    previousRecord:
      media.find(
        record => record.id === publication.linkedPost?.mediaId && record.id !== input.mediaId
      ) || null,
    previousLinkedItemId: publication.linkedPost?.previousLinkedItemId || ''
  };
}

export function allIntendedPublicationsPosted(item: Item): boolean {
  const intended = item.publications.filter(isIntendedPublication);
  return intended.length > 0 && intended.every(pub => pub.state === 'manually_posted');
}

export function isIntendedPublication(publication: Publication): boolean {
  return Boolean(
    publication.linkedPost ||
    publication.state === 'manually_posted' ||
    publication.date ||
    publication.caption.trim() ||
    publication.url.trim() ||
    publication.postId.trim()
  );
}

export function applyPublicationPostLink(
  state: Workspace,
  prepared: PreparedPublicationPostLink,
  timestamp = new Date().toISOString()
): void {
  const item = state.items.find(item => item.id === prepared.input.itemId);
  const publication = item?.publications.find(pub => pub.id === prepared.input.publicationId);
  if (!item || !publication) return;
  const previousLink = publication.linkedPost;
  publication.linkedPost = {
    mediaId: prepared.record.id,
    previous: previousLink?.previous || {
      url: publication.url,
      postId: publication.postId,
      state: publication.state,
      publishedAt: publication.publishedAt
    },
    previousStageId: previousLink?.previousStageId || item.stageId,
    previousLinkedItemId:
      previousLink?.mediaId === prepared.record.id
        ? previousLink.previousLinkedItemId
        : prepared.record.linked_item_id
  };
  publication.url = prepared.record.permalink;
  publication.postId = prepared.record.external_id || '';
  publication.state = 'manually_posted';
  publication.publishedAt = prepared.publishedAt;
  const posted = state.stages.find(stage => stage.kind === 'posted');
  if (posted && allIntendedPublicationsPosted(item)) item.stageId = posted.id;
  item.updatedAt = timestamp;
}

export function removePublicationPostLink(
  state: Workspace,
  itemId: string,
  publicationId: string,
  timestamp = new Date().toISOString()
): void {
  const item = state.items.find(item => item.id === itemId);
  const publication = item?.publications.find(pub => pub.id === publicationId);
  const link = publication?.linkedPost;
  if (!item || !publication || !link) return;
  Object.assign(publication, link.previous);
  delete publication.linkedPost;
  if (
    !allIntendedPublicationsPosted(item) &&
    state.stages.find(stage => stage.id === item.stageId)?.kind === 'posted'
  ) {
    const restored =
      state.stages.find(stage => stage.id === link.previousStageId) ||
      state.stages.find(stage => stage.kind === 'prep') ||
      state.stages.find(stage => stage.kind === 'ready');
    if (restored) item.stageId = restored.id;
  }
  item.updatedAt = timestamp;
}

export function liveItemPublications(item: Item, media: MediaRecord[]): Publication[] {
  return item.publications.filter(pub => assessPublicationMedia(item, pub, media).confirmed);
}
