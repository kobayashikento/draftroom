import type { LucideIcon } from 'lucide-react';
import type { View } from '../../lib/types.ts';
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Layers,
  ListChecks,
  ChartNoAxesCombined,
} from 'lucide-react';
export const pages: Record<View, [LucideIcon, string, string]> = {
  Overview: [LayoutDashboard, 'Overview', 'A little perspective on everything you’re making.'],
  Calendar: [CalendarDays, 'Calendar', 'Your ideas. A little rhythm. Room for what’s next.'],
  Ideas: [Lightbulb, 'Ideas', 'Collect the sparks. Make something you love.'],
  Production: [ListChecks, 'Production', 'The next small steps, gathered in one place.'],
  Series: [Layers, 'Series', 'Familiar formats, fresh little stories.'],
  Analytics: [
    ChartNoAxesCombined,
    'Analytics',
    'Keep your publications connected to the ideas behind them.',
  ],
};
