'use client';

import type { DraftroomAppProps } from './layout/layout.helpers.ts';
import { BrandMark } from './layout/brand-logo';
import { WorkspaceProvider } from './workspace-provider';
import { useWorkspaceContext } from './workspace/workspace-context';
import Modals from './editors';
import Sidebar from './layout/sidebar';
import WorkspaceTopbar from './layout/workspace-topbar';
import WorkspaceSyncNotice from './layout/workspace-sync-notice';
import PageHeading from './layout/page-heading';
import Assistant from './assistant';
import MediaProvider from './media/media-context';
import useWorkspaceNavigation from './layout/use-workspace-navigation.ts';

function Draftroom({ children }: DraftroomAppProps) {
  const { state, message, platform, setPlatform } = useWorkspaceContext();
  const { view, compactNav, toggleNavigation, navigate, openLibrary } = useWorkspaceNavigation();
  if (!state)
    return (
      <div className="loading">
        <BrandMark />
        <h1>Opening draftroom…</h1>
      </div>
    );

  return (
    <MediaProvider onOpenLibrary={openLibrary}>
      <div className={`shell studio-shell ${compactNav ? 'is-nav-compact' : ''}`}>
        <Sidebar
          view={view}
          platform={platform}
          onNavigate={navigate}
          onPlatformChange={setPlatform}
        />

        <main className="main">
          <WorkspaceTopbar
            view={view}
            compactNav={compactNav}
            onToggleNavigation={toggleNavigation}
          />
          <WorkspaceSyncNotice />
          <PageHeading view={view} />
          {children}
        </main>
      </div>
      <Assistant />
      <Modals />
      {message && (
        <div id="toast" role="status">
          {message}
        </div>
      )}
    </MediaProvider>
  );
}
export default function DraftroomApp({ children }: DraftroomAppProps) {
  return (
    <WorkspaceProvider>
      <Draftroom>{children}</Draftroom>
    </WorkspaceProvider>
  );
}
