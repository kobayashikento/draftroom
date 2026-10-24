'use client';
import type { View } from '../../lib/types.ts';
type SidebarProps = { view: View; platform: string; onNavigate: (view: View) => void; onPlatformChange: (platform: string) => void };

import { Sparkles, Sun, Shapes } from 'lucide-react';
import { AppIcon, BrandMark, PlatformIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { pages } from './pages';

export default function Sidebar({ view, platform, onNavigate, onPlatformChange }: SidebarProps) {
  const { state, authUser } = useWorkspace();
  return (
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
            onClick={() => onNavigate(name as View)}
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
              onPlatformChange(value);
              onNavigate('Calendar');
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
  );
}
