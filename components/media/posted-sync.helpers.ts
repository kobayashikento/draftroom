import type { Workspace } from '../../lib/types.ts';
import type { SocialPlatform } from './media.helpers.ts';
import { isIntendedPublication } from './publication-link.helpers.ts';

export function postedSyncPlatforms(
  previous: Workspace | null,
  current: Workspace
): SocialPlatform[] {
  if (!previous) return [];
  const platforms = new Set<SocialPlatform>();
  const previousItems = new Map(previous.items.map(item => [item.id, item]));
  const previousPosted = new Set(
    previous.stages.filter(stage => stage.kind === 'posted').map(stage => stage.id)
  );
  const currentPosted = new Set(
    current.stages.filter(stage => stage.kind === 'posted').map(stage => stage.id)
  );
  for (const item of current.items) {
    const before = previousItems.get(item.id);
    if (!before) continue;
    const previousPublications = new Map(before.publications.map(pub => [pub.id, pub]));
    const justMatched = item.publications.some(
      pub =>
        pub.linkedPost &&
        pub.linkedPost.mediaId !== previousPublications.get(pub.id)?.linkedPost?.mediaId
    );
    const enteredPosted =
      item.stageId !== before.stageId &&
      currentPosted.has(item.stageId) &&
      !previousPosted.has(before.stageId) &&
      !justMatched;
    const intended = item.publications.filter(isIntendedPublication);
    const stageTargets = intended.length ? intended : item.publications;
    for (const pub of item.publications) {
      const previousPublication = previousPublications.get(pub.id);
      const manuallyPosted =
        previousPublication?.platform === pub.platform &&
        previousPublication.state !== 'manually_posted' &&
        pub.state === 'manually_posted' &&
        !pub.linkedPost;
      if (manuallyPosted || (enteredPosted && stageTargets.includes(pub)))
        platforms.add(pub.platform);
    }
  }
  return [...platforms];
}
