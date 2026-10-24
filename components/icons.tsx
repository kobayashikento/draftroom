'use client';

import { formatIcon, platformIcon, seriesIcon } from './icons.helpers.ts';
import type {
  FormatIconProps,
  PlatformIconProps,
  SeriesIconProps,
  AppIconProps
} from './icons.helpers.ts';
import { Asterisk } from 'lucide-react';
import { iconStyle } from '../lib/design-tokens.ts';

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

export function FormatIcon({ format, ...props }: FormatIconProps) {
  return <AppIcon icon={formatIcon(format)} {...props} />;
}

export function PlatformIcon({ platform, labelled = false, ...props }: PlatformIconProps) {
  return (
    <span className="platform-icon" title={platform}>
      <AppIcon icon={platformIcon(platform)} {...props} />
      {labelled && <span className="sr-only">{platform}</span>}
    </span>
  );
}

// Map old saved symbols at render time, preserving existing series data.

export function SeriesIcon({ series, ...props }: SeriesIconProps) {
  return <AppIcon icon={seriesIcon(series)} size="lg" {...props} />;
}
