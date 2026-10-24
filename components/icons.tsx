'use client';
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { Format, Series } from '../lib/types.ts';
import {
  Asterisk,
  Camera,
  Music2,
  Clapperboard,
  Images,
  Heart,
  Sparkles,
  Coffee,
  Sun,
  Layers,
} from 'lucide-react';
import { iconStyle } from '../lib/design-tokens.ts';

type IconSize = keyof typeof iconStyle.sizes;
type IconProps = Omit<LucideProps, 'size'> & { size?: IconSize };
type AppIconProps = IconProps & { icon: LucideIcon };
export function AppIcon({ icon: Glyph, size = 'sm', className = '', ...props }: AppIconProps) {
  return (
    <Glyph
      size={iconStyle.sizes[size]}
      strokeWidth={iconStyle.strokeWidth}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable="false"
      className={`app-icon ${className}`}
      {...props}
    />
  );
}

export function BrandMark() {
  return <AppIcon icon={Asterisk} size="brand" className="brandmark" />;
}

export function FormatIcon({ format, ...props }: IconProps & { format: Format }) {
  return <AppIcon icon={format === 'Reel' ? Clapperboard : Images} {...props} />;
}

export function PlatformIcon({
  platform,
  labelled = false,
  ...props
}: IconProps & { platform: string; labelled?: boolean }) {
  return (
    <span className="platform-icon" title={platform}>
      <AppIcon icon={platform === 'Instagram' ? Camera : Music2} {...props} />
      {labelled && <span className="sr-only">{platform}</span>}
    </span>
  );
}

// Map old saved symbols at render time, preserving existing series data.
const seriesIcons: Record<string, LucideIcon> = {
  heart: Heart,
  sparkles: Sparkles,
  coffee: Coffee,
  sun: Sun,
  '♡': Heart,
  '✧': Sparkles,
  '♧': Coffee,
  '☼': Sun,
};
export function SeriesIcon({ series, ...props }: IconProps & { series: Series }) {
  return <AppIcon icon={seriesIcons[series.icon || ''] || Layers} size="lg" {...props} />;
}
