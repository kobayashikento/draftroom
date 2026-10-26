'use client';

import { ArrowUpRight, Check, Link2, RefreshCw, Settings2, Unplug } from 'lucide-react';
import { AppIcon, PlatformIcon } from '../icons';
import { Button } from '../ui';
import Modal from '../editors/modal';
import useSocialConnections from './use-social-connections.ts';
import ConnectionSetup from './connection-setup';
import type { AccountConnectionsProps, SocialPlatform } from './media.helpers.ts';
import SyncTimestamp from './sync-timestamp';

export default function AccountConnections({ compact = false }: AccountConnectionsProps) {
  const { library, setup, setSetup, managing, setManaging, busy, connect, disconnect } =
    useSocialConnections();
  return (
    <>
      <div
        className={`connection-grid ${compact ? 'is-compact' : ''}`}
        aria-label="Connected social accounts"
      >
        {(['Instagram', 'TikTok'] as SocialPlatform[]).map(platform => {
          const account = library.accounts.find(account => account.platform === platform);
          const connected = account?.status === 'connected';
          const reconnect = account?.status === 'reconnect_required';
          return (
            <section
              className={`connection-card ${connected ? 'is-connected' : ''}`}
              key={platform}
            >
              <div className="connection-card-head">
                <span className="channel-avatar">
                  <PlatformIcon platform={platform} size="md" />
                </span>
                <div className="grow">
                  <h3>{platform}</h3>
                  <p className="text-xs text-muted">
                    {connected
                      ? account.username
                        ? `@${account.username}`
                        : account.display_name || 'Your connected account'
                      : reconnect
                        ? 'Reconnect to resume syncing'
                        : 'Your work, connected'}
                  </p>
                </div>
                <span className={`connection-state ${connected ? 'connected' : ''}`}>
                  {connected ? (
                    <>
                      <AppIcon icon={Check} />
                      Connected
                    </>
                  ) : reconnect ? (
                    'Needs attention'
                  ) : (
                    'Not connected'
                  )}
                </span>
              </div>
              {!compact && (
                <p className="text-sm text-muted">
                  {platform === 'Instagram'
                    ? 'Reels, posts and the insights behind them.'
                    : 'Your public videos and how they’re doing.'}
                </p>
              )}
              <div className="connection-card-foot">
                {connected || account?.last_synced_at ? (
                  <SyncTimestamp
                    value={account?.last_synced_at || null}
                    syncing={library.busy === `Syncing ${platform}`}
                  />
                ) : (
                  <span className="text-xs text-muted">Read access · you stay in control</span>
                )}
                <div className="row gap-2">
                  {connected ? (
                    <>
                      <Button
                        className="small"
                        disabled={busy}
                        onClick={() => {
                          void library.sync(platform).catch(() => {});
                        }}
                      >
                        <AppIcon icon={RefreshCw} />
                        {library.busy === `Syncing ${platform}` ? 'Syncing…' : 'Sync posts'}
                      </Button>
                      <Button
                        className="icon-button"
                        aria-label={`Manage ${platform} connection`}
                        onClick={() => setManaging(platform)}
                      >
                        <AppIcon icon={Settings2} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="small"
                      disabled={busy || library.loading}
                      onClick={() => connect(platform)}
                    >
                      <AppIcon icon={Link2} />
                      {reconnect ? 'Reconnect' : 'Connect'}
                      <AppIcon icon={ArrowUpRight} />
                    </Button>
                  )}
                </div>
              </div>
              {account?.last_error && (
                <p className="connection-error" role="status">
                  {account.last_error}
                </p>
              )}
            </section>
          );
        })}
      </div>
      {setup && <ConnectionSetup setup={setup} close={() => setSetup(null)} />}
      {managing && (
        <Modal
          compact
          title={`Your ${managing} connection.`}
          onClose={() => setManaging(null)}
          footer={<Button onClick={() => setManaging(null)}>Done</Button>}
        >
          <div className="fields">
            <p>
              Disconnecting stops future imports and removes Draftroom’s saved access token. Your
              imported posts and their last measured results stay in the library.
            </p>
            <p className="text-xs text-muted">
              You can also remove Draftroom’s permission in your {managing} account settings.
            </p>
            <Button disabled={busy} onClick={disconnect}>
              <AppIcon icon={Unplug} />
              Disconnect {managing}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
