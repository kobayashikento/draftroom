import type { IdeaSketchProps } from './artwork.helpers.ts';

export default function IdeaSketch({ variant = 0 }: IdeaSketchProps) {
  return (
    <svg
      className="idea-sketch"
      viewBox="0 0 160 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="80" cy="86" rx="43" ry="5" fill="var(--dr-art-shadow)" opacity=".3" />
      <g
        stroke="var(--dr-art-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {variant % 3 === 0 ? (
          <>
            <path
              d="M80 77V43m0 21Q49 64 52 40q28-2 28 24m0-9q0-29 28-30 3 25-28 30"
              fill="var(--dr-art-pistachio)"
            />
            <path d="M62 72h36l-6 15H68z" fill="var(--dr-art-paper)" />
            <path d="m116 53 8 0m-4-4v8M45 24h6" />
          </>
        ) : variant % 3 === 1 ? (
          <>
            <g transform="rotate(-10 80 52)">
              <rect x="52" y="18" width="55" height="66" rx="3" fill="var(--dr-art-paper)" />
              <path d="M59 26h41v41H59z" fill="var(--dr-art-pistachio)" stroke="none" />
              <circle cx="88" cy="38" r="6" fill="var(--dr-art-paper)" stroke="none" />
              <path d="m59 62 13-16 12 13 7-7 9 10" />
            </g>
            <path d="m120 34 8 0m-4-4v8M35 60l4 4 7-8" />
          </>
        ) : (
          <>
            <path d="M53 34h48v51H53z" fill="var(--dr-art-paper)" transform="rotate(-7 77 60)" />
            <path d="m78 65 26-43 8 5-26 43-11 9z" fill="var(--dr-art-pistachio)" />
            <path d="m78 65 8 5m-11 9 3-14m-15-19 14-2m-14 12 8-1M39 30h8m-4-4v8" />
          </>
        )}
      </g>
    </svg>
  );
}
