'use client';

import type { View } from '../lib/types.ts';
import { useEffect, useState } from 'react';
import { BrandMark } from './icons';
import { WorkspaceProvider } from './workspace-provider';
import { useWorkspaceContext } from './workspace/workspace-context';
import { today } from '../lib/display.ts';
import { monday } from '../lib/model.ts';
import Overview from './views/overview';
import Ideas from './views/ideas';
import Calendar from './calendar';
import Series from './views/series';
import Production from './production';
import Analytics from './views/analytics';
import Modals from './editors';
import Sidebar from './layout/sidebar';
import WorkspaceTopbar from './layout/workspace-topbar';
import WorkspaceSyncNotice from './layout/workspace-sync-notice';
import PageHeading from './layout/page-heading';
import Assistant from './assistant';
import Library from './views/library';
import MediaProvider from './media/media-context';

function Draftroom() {
  const { state, message, setModal } = useWorkspaceContext();
  const [view, setView] = useState<View>('Calendar');
  const [week, setWeek] = useState(() => monday(today()));
  const [platform, setPlatform] = useState('');
  const [compactNav, setCompactNav] = useState(false);
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('view') === 'Library') setView('Library');
  }, []);
  const navigate = (name: View) => {
    setView(name);
    if (name === 'Overview') setWeek(w => monday(w));
  };
  if (!state)
    return (
      <div className="loading">
        <BrandMark />
        <h1>Opening draftroom…</h1>
      </div>
    );

  return (
    <MediaProvider
      onOpenLibrary={() => {
        setModal(null);
        setView('Library');
      }}
    >
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
            onToggleNavigation={() => setCompactNav(!compactNav)}
          />
          <WorkspaceSyncNotice />
          <PageHeading view={view} />
          {view === 'Overview' && <Overview week={week} setWeek={setWeek} navigate={navigate} />}
          {view === 'Calendar' && (
            <Calendar week={week} setWeek={setWeek} platform={platform} setPlatform={setPlatform} />
          )}
          {view === 'Ideas' && <Ideas />}
          {view === 'Series' && <Series />}
          {view === 'Production' && <Production />}
          {view === 'Analytics' && <Analytics />}
          {view === 'Library' && <Library />}
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
export default function DraftroomApp() {
  return (
    <WorkspaceProvider>
      <Draftroom />
    </WorkspaceProvider>
  );
}
