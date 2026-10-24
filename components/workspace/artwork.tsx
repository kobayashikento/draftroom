'use client';

import type { ArtworkProps } from './workspace.helpers.ts';
import { coverSubject } from './artwork.helpers.ts';
import { FormatIcon } from '../icons';
import CoverIllustration from './cover-illustration';

export default function Artwork({ item }: ArtworkProps) {
  return (
    <div className="art">
      <CoverIllustration subject={coverSubject(item.seriesId, item.title)} />
      <span className="format-tag">
        <FormatIcon format={item.format} />
        {item.format}
      </span>
    </div>
  );
}
