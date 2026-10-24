'use client';
import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Layers,
  ListChecks,
  ChartNoAxesCombined,
  Sparkles,
  Sun,
  Plus,
  Download,
  LogOut,
  CloudCheck,
  CloudUpload,
  HardDrive,
  TriangleAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Shapes,
} from 'lucide-react';
import { AppIcon, BrandMark, PlatformIcon } from './icons';
import { WorkspaceProvider, useWorkspace, Button, today } from './workspace';
import { monday } from '../lib/model';
import { Overview, Ideas, Calendar, Series, Production, Analytics } from './views';
import Modals from './editors';
import { SyncNotice } from './account';
import { downloadWorkspace } from '../lib/workspace-data.js';

const pages = {
  Calendar: [CalendarDays, 'Calendar', 'Your ideas. A little rhythm. Room for what’s next.'],
  Ideas: [Lightbulb, 'Ideas', 'Collect the sparks. Make something you love.'],
  Production: [ListChecks, 'Production', 'The next small steps, gathered in one place.'],
  Series: [Layers, 'Series', 'Familiar formats, fresh little stories.'],
  Overview: [LayoutDashboard, 'Overview', 'A little perspective on everything you’re making.'],
  Analytics: [
    ChartNoAxesCombined,
    'Analytics',
    'Keep your publications connected to the ideas behind them.',
  ],
};

function Draftroom() {
  const {
    state,
    storageStatus,
    storageTone,
    setModal,
    message,
    cloud,
    authUser,
    signOut,
    syncError,
    cacheError,
    conflict,
    retrySync,
    resolveConflict,
  } = useWorkspace();
  const [view, setView] = useState('Calendar');
  const [week, setWeek] = useState(() => monday(today()));
  const [platform, setPlatform] = useState('');
  const [compactNav, setCompactNav] = useState(false);
  const navigate = (name) => {
    setView(name);
    if (name === 'Overview') setWeek((w) => monday(w));
  };
  const exportData = () => downloadWorkspace(state);
  if (!state)
    return (
      <div className="loading">
        <BrandMark />
        <h1>Opening draftroom…</h1>
      </div>
    );
  const SaveIcon = ['error', 'conflict'].includes(storageTone)
    ? TriangleAlert
    : ['pending', 'saving'].includes(storageTone)
      ? CloudUpload
      : cloud
        ? CloudCheck
        : HardDrive;

  return (
    <>
      <div className={`shell studio-shell ${compactNav ? 'is-nav-compact' : ''}`}>
        <aside className="sidebar">
          <div className="brand">
            <BrandMark />
            <span className="brand-name">draftroom</span>
          </div>
          <div className="tagline">a little space to create</div>
          <p className="workspace">YOUR WORKSPACE</p>
          <nav className="nav" aria-label="Workspace">
            {Object.entries(pages).map(([name, [Icon]]) => (
              <Button
                key={name}
                className={view === name ? 'active' : ''}
                aria-label={name}
                title={name}
                aria-current={view === name ? 'page' : undefined}
                onClick={() => navigate(name)}
              >
                <span className="ico">
                  <AppIcon icon={Icon} size="md" />
                </span>
                <span className="nav-label">{name}</span>
                {name === 'Ideas' && <span className="nav-count">{state.items.length}</span>}
              </Button>
            ))}
          </nav>
          <div className="sidebar-channels">
            <p className="workspace">PLANNING CHANNELS</p>
            {[
              ['', 'All channels'],
              ['Instagram', 'Instagram'],
              ['TikTok', 'TikTok'],
            ].map(([value, label]) => (
              <Button
                key={label}
                className={`channel-button ${view === 'Calendar' && platform === value ? 'active' : ''}`}
                aria-label={`Show ${label.toLowerCase()} calendar`}
                title={label}
                aria-pressed={view === 'Calendar' && platform === value}
                onClick={() => {
                  setPlatform(value);
                  navigate('Calendar');
                }}
              >
                <span className="channel-avatar">
                  {value ? <PlatformIcon platform={value} /> : <AppIcon icon={Shapes} />}
                </span>
                <span className="channel-label">{label}</span>
              </Button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="studio-note">
              <AppIcon icon={Sparkles} />
              <span>Little steps. Lovely things.</span>
            </div>
            <div className="profile">
              <div className="avatar">
                <AppIcon icon={Sun} size="md" />
              </div>
              <div>
                <b>@morningswithemi</b>
                <div className="tiny muted">{authUser?.email || 'Personal workspace'}</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="workspace-breadcrumb">
              <Button
                className="icon-button nav-collapse"
                aria-label={compactNav ? 'Expand navigation' : 'Collapse navigation'}
                aria-expanded={!compactNav}
                onClick={() => setCompactNav(!compactNav)}
              >
                <AppIcon icon={compactNav ? PanelLeftOpen : PanelLeftClose} />
              </Button>
              <span>
                My workspace <span className="mx-2">/</span> <strong>{view}</strong>
              </span>
            </div>
            <span className={`saved ${storageTone}`}>
              <span className="save-status" role="status">
                <AppIcon icon={SaveIcon} />
                {storageStatus}
              </span>
              <Button
                className="icon-button"
                aria-label="Export workspace"
                title="Export workspace"
                onClick={exportData}
              >
                <AppIcon icon={Download} />
              </Button>
              {cloud && (
                <Button
                  className="icon-button"
                  aria-label="Sign out"
                  title="Sign out"
                  onClick={signOut}
                >
                  <AppIcon icon={LogOut} />
                </Button>
              )}
            </span>
          </div>
          <SyncNotice
            cloud={cloud}
            error={syncError}
            cacheError={cacheError}
            conflict={conflict}
            retry={retrySync}
            resolve={resolveConflict}
            exportData={exportData}
          />
          <div className="heading">
            <div>
              <h1>{pages[view][1]}</h1>
              <p className="subtitle">{pages[view][2]}</p>
            </div>
            <Button className="primary" onClick={() => setModal({ type: 'add' })}>
              <AppIcon icon={Plus} />
              New idea
            </Button>
          </div>
          {view === 'Overview' && <Overview week={week} setWeek={setWeek} navigate={navigate} />}
          {view === 'Calendar' && (
            <Calendar week={week} setWeek={setWeek} platform={platform} setPlatform={setPlatform} />
          )}
          {view === 'Ideas' && <Ideas />}
          {view === 'Series' && <Series />}
          {view === 'Production' && <Production />}
          {view === 'Analytics' && <Analytics />}
        </main>
      </div>
      <Modals />
      {message && (
        <div id="toast" role="status">
          {message}
        </div>
      )}
    </>
  );
}
export default function DraftroomApp() {
  return (
    <WorkspaceProvider>
      <Draftroom />
    </WorkspaceProvider>
  );
}
