'use client';

import type { ArtworkProps } from './workspace.helpers.ts';
import { FormatIcon } from '../icons';

export default function Artwork({ item }: ArtworkProps) {
  const type = item.seriesId || 'joys';
  return (
    <div
      className="art"
      style={{ background: type === 'matcha' ? 'var(--dr-art-pistachio)' : 'var(--dr-art-oat)' }}
    >
      <svg viewBox="0 0 260 160" aria-hidden="true">
        {type === 'emi' ? (
          <>
            <ellipse cx="130" cy="126" rx="65" ry="43" fill="var(--dr-art-shadow)" />
            <path
              d="M87 75 87 27 112 50Q133 43 154 50L180 25 177 83Q166 120 132 119 94 116 87 75"
              fill="var(--dr-art-paper)"
            />
            <path d="m88 31 24 23-24 17m89-40-22 23 22 17" fill="var(--dr-art-mid)" />
            <ellipse cx="114" cy="77" rx="9" ry="7" fill="var(--dr-art-accent)" />
            <ellipse cx="154" cy="77" rx="9" ry="7" fill="var(--dr-art-accent)" />
            <path d="m128 91 10 0-5 6z" fill="var(--dr-art-dark)" />
            <path
              d="M55 146Q20 88 69 100"
              fill="none"
              stroke="var(--dr-art-shadow)"
              strokeWidth="17"
            />
          </>
        ) : type === 'matcha' ? (
          <>
            <ellipse cx="134" cy="130" rx="76" ry="15" fill="var(--dr-art-shadow)" />
            <path d="M83 65h97l-8 56q-38 34-80 0z" fill="var(--dr-art-paper)" />
            <ellipse cx="131" cy="65" rx="49" ry="18" fill="var(--dr-art-mid)" />
            <ellipse cx="131" cy="64" rx="41" ry="12" fill="var(--dr-art-accent)" />
            <path
              d="M180 77q49-9 25 33l-28 5"
              fill="none"
              stroke="var(--dr-art-paper)"
              strokeWidth="12"
            />
            <path
              d="m129 34 3-18m14 19 7-20"
              stroke="var(--dr-art-glint)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        ) : type === 'obsessed' ? (
          <>
            <g transform="rotate(-12 85 80)">
              <rect x="35" y="27" width="83" height="108" rx="3" fill="var(--dr-art-paper)" />
              <rect x="43" y="35" width="67" height="73" fill="var(--dr-art-pistachio)" />
              <circle cx="76" cy="72" r="22" fill="var(--dr-art-cream)" />
              <circle cx="76" cy="72" r="16" fill="var(--dr-art-accent)" />
            </g>
            <g transform="rotate(12 170 80)">
              <rect x="132" y="30" width="80" height="108" fill="var(--dr-art-paper)" />
              <rect x="140" y="38" width="64" height="72" fill="var(--dr-art-cream)" />
              <path d="M148 93q20-55 48 0" fill="var(--dr-art-mid)" />
            </g>
          </>
        ) : (
          <>
            <rect
              x="34"
              y="25"
              width="85"
              height="109"
              fill="var(--dr-art-paper)"
              transform="rotate(-8 70 80)"
            />
            <rect x="43" y="35" width="67" height="75" fill="var(--dr-art-cream)" />
            <path d="M49 98q25-55 52 0" fill="var(--dr-art-mid)" />
            <rect
              x="140"
              y="37"
              width="82"
              height="100"
              fill="var(--dr-art-paper)"
              transform="rotate(10 170 80)"
            />
            <path d="M154 107V59h50v48" fill="var(--dr-art-accent)" />
            <circle cx="178" cy="78" r="13" fill="var(--dr-art-cream)" />
          </>
        )}
      </svg>
      <span className="format-tag">
        <FormatIcon format={item.format} />
        {item.format}
      </span>
    </div>
  );
}
