'use client';

import { Check, Link2, RefreshCw, Unlink } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Input } from '../ui';
import MediaArtwork from './media-artwork';
import { mediaDate } from './media.helpers.ts';
import type { PublicationPostLinkProps } from './publication-link.helpers.ts';
import usePublicationPostLinker from './use-publication-post-linker.ts';

export default function PublicationPostLinker(props: PublicationPostLinkProps) {
  const { publication } = props;
  const match = usePublicationPostLinker(props);
  return (
    <div className="publication-post-linker">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="small"
          disabled={match.busy || match.library.loading}
          aria-expanded={match.expanded}
          onClick={() => match.setExpanded(!match.expanded)}
        >
          <AppIcon icon={Link2} />
          {publication.linkedPost
            ? 'Change matched post'
            : `Link published ${publication.platform} post`}
        </Button>
        {publication.linkedPost && (
          <Button className="link" disabled={match.busy} onClick={() => void match.unlink()}>
            <AppIcon icon={Unlink} /> Remove match
          </Button>
        )}
      </div>
      {match.expanded && (
        <div className="publication-post-picker">
          <p className="text-sm">
            Choose the post you published for this idea. This marks {publication.platform} live. The
            idea moves to Posted once every planned channel is posted. Your checklist, planned dates
            and captions stay as you wrote them.
          </p>
          <Input
            type="search"
            aria-label={`Search synced ${publication.platform} posts`}
            placeholder="Search captions and titles…"
            value={match.query}
            onChange={event => match.setQuery(event.target.value)}
          />
          <div
            className="publication-post-options"
            role="group"
            aria-label={`Synced ${publication.platform} posts`}
          >
            {match.candidates.map(({ record, unavailableReason }) => (
              <Button
                key={record.id}
                className="publication-post-option"
                disabled={match.busy || Boolean(unavailableReason)}
                aria-label={`Select ${publication.platform} post: ${record.title}`}
                aria-pressed={match.selectedId === record.id}
                onClick={() => match.setSelected(record.id)}
              >
                <MediaArtwork record={record} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="line-clamp-2 text-sm font-medium">{record.title}</span>
                  <span className="block text-xs text-muted">
                    Published {mediaDate(record.published_at)}
                  </span>
                  {unavailableReason && <span className="block text-xs">{unavailableReason}</span>}
                </span>
                {match.selectedId === record.id && <AppIcon icon={Check} />}
              </Button>
            ))}
            {!match.candidates.length && (
              <p className="text-sm text-muted">
                No synced posts match yet. Sync your account or import older posts in Library.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="primary small"
              disabled={
                match.busy ||
                !match.selectedId ||
                !match.candidates.some(
                  candidate =>
                    candidate.record.id === match.selectedId && !candidate.unavailableReason
                )
              }
              onClick={() => void match.link()}
            >
              <AppIcon icon={Check} /> Link & mark live
            </Button>
            {match.account?.status === 'connected' && (
              <Button className="small" disabled={match.busy} onClick={() => void match.sync()}>
                <AppIcon icon={RefreshCw} /> Sync posts
              </Button>
            )}
            <Button className="link" disabled={match.busy} onClick={match.openLibrary}>
              Open Library / import older posts
            </Button>
          </div>
        </div>
      )}
      {match.error && (
        <p className="warning" role="alert">
          {match.error}
        </p>
      )}
    </div>
  );
}
