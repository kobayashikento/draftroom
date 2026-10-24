import { iconStyle } from '../lib/design-tokens.ts';
import {
  Heart,
  Sparkles,
  Coffee,
  Sun,
  Clapperboard,
  Images,
  Camera,
  Music2,
  Layers
} from 'lucide-react';
import type { LucideProps, LucideIcon } from 'lucide-react';
import type { Format, Series } from '../lib/types.ts';

export type IconSize = keyof typeof iconStyle.sizes;

export type IconProps = Omit<LucideProps, 'size'> & { size?: IconSize };

export type AppIconProps = IconProps & { icon: LucideIcon };
export type FormatIconProps = IconProps & { format: Format };
export type PlatformIconProps = IconProps & { platform: string; labelled?: boolean };
export type SeriesIconProps = IconProps & { series: Series };

export function formatIcon(format: Format): LucideIcon {
  return format === 'Reel' ? Clapperboard : Images;
}

export function platformIcon(platform: string): LucideIcon {
  return platform === 'Instagram' ? Camera : Music2;
}

export function seriesIcon(series: Series): LucideIcon {
  return seriesIcons[series.icon || ''] || Layers;
}

export const seriesIcons: Record<string, LucideIcon> = {
  heart: Heart,
  sparkles: Sparkles,
  coffee: Coffee,
  sun: Sun,
  '♡': Heart,
  '✧': Sparkles,
  '♧': Coffee,
  '☼': Sun
};
