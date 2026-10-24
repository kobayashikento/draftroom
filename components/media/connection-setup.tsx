'use client';

import { ArrowUpRight, Check, Copy, Link2 } from 'lucide-react';
import { AppIcon, PlatformIcon } from '../icons';
import { Button } from '../ui';
import Modal from '../editors/modal';
import type { ConnectionSetupProps } from './media.helpers.ts';
import { useCallbackCopy } from './use-media-display.ts';

export default function ConnectionSetup({ setup, close }: ConnectionSetupProps) {
  const { copied, copyError, copy } = useCallbackCopy(setup.callbackUrl);
  const instagram = setup.platform === 'Instagram';
  return (
    <Modal
      compact
      title={`Make room for ${setup.platform}.`}
      eyebrow="CONNECT YOUR CHANNEL"
      onClose={close}
      footer={
        <Button className="primary" onClick={close}>
          Got it
        </Button>
      }
    >
      <div className="connection-setup">
        <span className="connection-emblem">
          <PlatformIcon platform={setup.platform} size="lg" />
        </span>
        <p className="text-sm">
          {instagram
            ? 'Your professional Instagram account can bring its Reels, posts and available insights into Draftroom.'
            : 'Connect TikTok to bring your public videos, views, likes, comments and shares into Draftroom.'}
        </p>
        <ol>
          <li>
            <b>Create the developer app.</b>
            <p>
              {instagram
                ? 'In Meta for Developers, create an app with Instagram API and Instagram Login. Add your professional account as a tester while setting it up.'
                : 'In TikTok for Developers, create an app with Login Kit and Display API. Add your account as a sandbox target user while testing.'}
            </p>
          </li>
          <li>
            <b>Register Draftroom’s callback.</b>
            <p>Add this exact address to the app’s allowed OAuth redirect URLs.</p>
            <div className="callback-copy">
              <code>{setup.callbackUrl || 'Available in your connected Draftroom workspace'}</code>
              {setup.callbackUrl && (
                <Button className="icon-button" aria-label="Copy OAuth callback URL" onClick={copy}>
                  <AppIcon icon={copied ? Check : Copy} />
                </Button>
              )}
            </div>
            {copyError && <p role="status">{copyError}</p>}
          </li>
          <li>
            <b>Finish the private app setup.</b>
            <p>
              Have Kento save the app credentials in Supabase, then return here to connect and
              approve read access. Draftroom never needs your Instagram or TikTok password.
            </p>
          </li>
        </ol>
        <a
          href={
            instagram ? 'https://developers.facebook.com/apps/' : 'https://developers.tiktok.com/'
          }
          target="_blank"
          rel="noreferrer"
          className="connection-doc-link"
        >
          Open {instagram ? 'Meta for Developers' : 'TikTok for Developers'}
          <AppIcon icon={ArrowUpRight} />
        </a>
        <details>
          <summary>
            <AppIcon icon={Link2} />
            Developer handoff
          </summary>
          <p className="text-xs">
            {instagram
              ? 'Request instagram_business_basic and instagram_business_manage_insights. Use an app-role account in development; other accounts require the applicable Meta review.'
              : 'Request user.info.basic and video.list. Production access requires TikTok review; sandbox target users can test during development.'}
          </p>
          <p className="text-xs mt-3">Missing Supabase secrets:</p>
          <ul>
            {setup.missing.map(name => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
          <p className="text-xs mt-3">
            Set DRAFTROOM_APP_URL to the public HTTPS Draftroom origin. The 32-byte token encryption
            key stays private. See the Video library section in the project README for the full
            setup.
          </p>
        </details>
        <p className="text-xs text-muted">
          You can paste links to posts published from your phone while the developer apps are being
          prepared.
        </p>
      </div>
    </Modal>
  );
}
