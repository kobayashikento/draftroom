'use client';
import type { View } from '../../lib/types.ts';
type WorkspaceTopbarProps = { view: View; compactNav: boolean; onToggleNavigation: () => void };

import {
  CloudCheck,
  CloudUpload,
  HardDrive,
  TriangleAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  LogOut,
} from 'lucide-react';
import { AppIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';
import { Button } from '../ui';
import { downloadWorkspace } from '../../lib/workspace-data.ts';

export default function WorkspaceTopbar({ view, compactNav, onToggleNavigation }: WorkspaceTopbarProps) {
  const { state, storageTone, storageStatus, cloud, signOut } = useWorkspace();
  const exportData = () => downloadWorkspace(state);
  const SaveIcon = ['error', 'conflict'].includes(storageTone)
    ? TriangleAlert
    : ['pending', 'saving'].includes(storageTone)
      ? CloudUpload
      : cloud
        ? CloudCheck
        : HardDrive;
  return (
    <div className="topbar">
      <div className="workspace-breadcrumb">
        <Button
          className="icon-button nav-collapse"
          aria-label={compactNav ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!compactNav}
          onClick={onToggleNavigation}
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
          <Button className="icon-button" aria-label="Sign out" title="Sign out" onClick={signOut}>
            <AppIcon icon={LogOut} />
          </Button>
        )}
      </span>
    </div>
  );
}
