'use client';

import { AlertCircle, ArrowUpRight, Link2, RefreshCw, Sparkles } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import AccountConnections from '../media/account-connections';
import AddPostLinkDialog from '../media/add-post-link-dialog';
import LibraryToolbar from '../media/library-toolbar';
import LibraryEmpty from '../media/library-empty';
import MediaCard from '../media/media-card';
import MediaDetail from '../media/media-detail';
import { defaultMediaFilters } from '../media/media.helpers.ts';
import useLibraryView from '../media/use-library-view.ts';

export default function Library() {
  const {
    library,
    filters,
    setFilters,
    addingLink,
    setAddingLink,
    setSelected,
    records,
    active,
    measured,
    selectedRecord,
    allArchived,
    changeFilter,
    added
  } = useLibraryView();

  return (
    <section className="media-library" aria-label="Your media library">
      <div className="media-library-intro">
        <div>
          <p className="meta">FROM YOUR PHONE TO YOUR WORKSPACE</p>
          <p className="text-sm text-muted mt-2">
            Publish in Instagram or TikTok, then sync your posts here to watch, learn and plan
            what’s next.
          </p>
        </div>
        <div className="row gap-2">
          <Button
            className="icon-button"
            aria-label="Refresh media library"
            title="Refresh media library"
            disabled={library.loading || Boolean(library.busy)}
            onClick={() => {
              void library.refresh();
            }}
          >
            <AppIcon icon={RefreshCw} />
          </Button>
          <Button
            className="primary"
            disabled={Boolean(library.busy)}
            onClick={() => setAddingLink(true)}
          >
            <AppIcon icon={Link2} />
            Add post link
          </Button>
        </div>
      </div>
      <AccountConnections />
      <div className="media-library-note">
        <div className="row gap-3">
          <span className="media-note-icon">
            <AppIcon icon={Sparkles} size="md" />
          </span>
          <div>
            <p className="font-medium">A little more context for your next idea.</p>
            <p className="text-xs text-muted">
              {measured.length
                ? `${measured.length} synced ${measured.length === 1 ? 'post helps' : 'posts help'} your assistant plan from real results. It uses captions and metrics, never guesses what’s in the footage.`
                : 'Connect a channel and use Sync posts after publishing from your phone. Your assistant can then plan from real results.'}
            </p>
          </div>
        </div>
        <span className="media-library-total">
          {active.length} {active.length === 1 ? 'moment' : 'moments'} collected
        </span>
      </div>
      {library.error && (
        <div className="media-library-error" role="alert">
          <AppIcon icon={AlertCircle} />
          <p>{library.error}</p>
          <Button
            className="small"
            disabled={Boolean(library.busy)}
            onClick={() => {
              void library.refresh();
            }}
          >
            <AppIcon icon={RefreshCw} />
            Try again
          </Button>
        </div>
      )}
      {library.busy && (
        <p className="text-xs text-muted" role="status">
          {library.busy}…
        </p>
      )}
      <LibraryToolbar filters={filters} count={records.length} onChange={changeFilter} />
      {library.loading ? (
        <div className="media-loading" role="status">
          Making room for your work…
          <div className="media-skeletons" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : records.length ? (
        <div className="media-grid">
          {records.map(record => (
            <MediaCard key={record.id} record={record} onOpen={() => setSelected(record.id)} />
          ))}
        </div>
      ) : !library.media.length &&
        !filters.query &&
        filters.scope === 'all' &&
        !filters.archived ? (
        <LibraryEmpty />
      ) : (
        <div className="panel empty">
          <h3>
            {filters.archived
              ? 'A quiet little archive.'
              : allArchived
                ? 'Everything is tucked away.'
                : 'No moments match just yet.'}
          </h3>
          <p className="text-sm text-muted mt-2">
            {filters.archived
              ? 'Archived posts stay available here. Restore them whenever you’re ready.'
              : allArchived
                ? 'Your posts are safe in Archived. Bring one back whenever you’re ready.'
                : 'Try another channel or a different search.'}
          </p>
          {!filters.archived && (
            <Button
              className="link mt-4"
              onClick={() => setFilters({ ...defaultMediaFilters, archived: allArchived })}
            >
              {allArchived ? 'Open archive' : 'Clear filters'}
              <AppIcon icon={ArrowUpRight} />
            </Button>
          )}
        </div>
      )}
      {library.partial && (
        <p className="footnote">
          Showing the 1,000 most recently imported records. The assistant also uses a bounded sample
          and labels it as partial.
        </p>
      )}
      <div className="media-older-actions">
        {library.accounts
          .filter(account => account.has_more && account.status === 'connected')
          .map(account => (
            <Button
              key={account.id}
              className="small"
              disabled={Boolean(library.busy)}
              onClick={() => {
                void library.sync(account.platform, true).catch(() => {});
              }}
            >
              Import older {account.platform} posts
              <AppIcon icon={ArrowUpRight} />
            </Button>
          ))}
      </div>
      {addingLink && <AddPostLinkDialog close={() => setAddingLink(false)} onAdded={added} />}
      {selectedRecord && <MediaDetail record={selectedRecord} close={() => setSelected('')} />}
    </section>
  );
}
