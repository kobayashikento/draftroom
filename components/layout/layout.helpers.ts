import type { View, CalendarMode, StorageStatus } from '../../lib/types.ts';
import type { Dispatch, SetStateAction } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Layers,
  ListChecks,
  ChartNoAxesCombined,
  TriangleAlert,
  CloudUpload,
  CloudCheck,
  HardDrive
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fmt } from '../../lib/display.ts';
import { addDays, parseDate } from '../../lib/model.ts';

export type PlanningChannel = { value: string; label: string };
export const planningChannels: PlanningChannel[] = [
  { value: '', label: 'All channels' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' }
];

export function workspaceSaveIcon(tone: StorageStatus | 'local', cloud?: boolean): LucideIcon {
  if (tone === 'error' || tone === 'conflict') return TriangleAlert;
  if (tone === 'pending' || tone === 'saving') return CloudUpload;
  return cloud ? CloudCheck : HardDrive;
}

export function weekBarLabel(week: string, mode: CalendarMode): string {
  return mode === 'Month'
    ? fmt(week, { month: 'long', year: 'numeric' })
    : `${fmt(week)} – ${fmt(addDays(week, 6))}, ${parseDate(week).getFullYear()}`;
}

export type PageHeadingProps = { view: View };

export type SidebarProps = {
  view: View;
  platform: string;
  onNavigate: (view: View) => void;
  onPlatformChange: (platform: string) => void;
};

export type WorkspaceTopbarProps = {
  view: View;
  compactNav: boolean;
  onToggleNavigation: () => void;
};

export type WeekBarProps = {
  week: string;
  setWeek: Dispatch<SetStateAction<string>>;
  mode?: CalendarMode;
};

export const pages: Record<View, [LucideIcon, string, string]> = {
  Overview: [LayoutDashboard, 'Overview', 'A little perspective on everything you’re making.'],
  Calendar: [CalendarDays, 'Calendar', 'Your ideas. A little rhythm. Room for what’s next.'],
  Ideas: [Lightbulb, 'Ideas', 'Collect the sparks. Make something you love.'],
  Production: [ListChecks, 'Production', 'The next small steps, gathered in one place.'],
  Series: [Layers, 'Series', 'Familiar formats, fresh little stories.'],
  Analytics: [
    ChartNoAxesCombined,
    'Analytics',
    'Keep your publications connected to the ideas behind them.'
  ]
};
