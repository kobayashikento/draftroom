import type { CoverIllustrationProps } from './artwork.helpers.ts';

// Original editorial illustrations share the app's semantic palette.
export default function CoverIllustration({ subject }: CoverIllustrationProps) {
  return (
    <svg
      className="cover-illustration"
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        width="320"
        height="200"
        fill={subject === 'ritual' ? 'var(--dr-art-pistachio)' : 'var(--dr-art-oat)'}
      />
      <circle cx="267" cy="30" r="85" fill="var(--dr-art-cream)" />
      <path d="M0 160Q80 132 157 165T320 156V200H0Z" fill="var(--dr-art-shadow)" opacity=".35" />
      <g stroke="var(--dr-art-accent)" strokeWidth="1.5" strokeLinecap="round" opacity=".45">
        <path d="M28 35h10m-5-5v10M278 125h12m-6-6v12" />
        <circle cx="287" cy="67" r="3" />
        <path d="M35 127q-12-12 0-20m5 18q-8-9 0-15" />
      </g>
      {subject === 'diary' && (
        <>
          <path
            d="M60 155V44q0-8 8-8h114q8 0 8 8v111"
            fill="var(--dr-art-paper)"
            transform="rotate(-8 125 100)"
          />
          <path
            d="M81 67h89M81 81h66M81 95h77"
            stroke="var(--dr-art-shadow)"
            strokeWidth="3"
            strokeLinecap="round"
            transform="rotate(-8 125 100)"
          />
          <ellipse cx="187" cy="161" rx="66" ry="12" fill="var(--dr-art-shadow)" />
          <path
            d="M204 157q51 3 46-31-3-20-18-12"
            stroke="var(--dr-art-mid)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path d="M141 151q-5-47 24-58h37q30 16 21 59" fill="var(--dr-art-mid)" />
          <path
            d="m153 84-3-42 29 20q11-3 22 0l26-21-3 47q-3 34-36 34-32 0-35-38"
            fill="var(--dr-art-paper)"
          />
          <path d="m157 52 17 14-16 6m61-20-16 14 15 6" fill="var(--dr-art-mid)" />
          <path
            d="m169 84 8 1m22 0 8-1"
            stroke="var(--dr-art-dark)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="m183 95 10 0-5 6z" fill="var(--dr-art-accent)" />
          <path
            d="m163 97-18-3m20 9-20 3m67-9 18-3m-20 9 20 3"
            stroke="var(--dr-art-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M176 142v17m22-17v17"
            stroke="var(--dr-art-paper)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </>
      )}
      {subject === 'ritual' && (
        <>
          <path d="M66 140q-22-39-2-75 23 30 2 75" fill="var(--dr-art-accent)" opacity=".65" />
          <path
            d="M66 145q-1-36-27-40 0 27 27 40m0-18q5-28 27-30-4 24-27 30"
            fill="var(--dr-art-mid)"
          />
          <ellipse cx="170" cy="161" rx="78" ry="12" fill="var(--dr-art-shadow)" />
          <ellipse cx="167" cy="151" rx="67" ry="11" fill="var(--dr-art-paper)" />
          <path d="M212 91q46-4 29 29-8 12-29 10" stroke="var(--dr-art-paper)" strokeWidth="11" />
          <path d="M116 84h102l-10 58q-36 27-79 0z" fill="var(--dr-art-paper)" />
          <ellipse cx="167" cy="84" rx="51" ry="19" fill="var(--dr-art-mid)" />
          <ellipse cx="167" cy="83" rx="44" ry="13" fill="var(--dr-art-accent)" />
          <path
            d="M148 83q18-14 35 0-17 14-35 0m7-1q13-6 22 0"
            stroke="var(--dr-art-pistachio)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M155 57q-11-12 0-24m23 24q11-12 0-24"
            stroke="var(--dr-art-paper)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g transform="rotate(18 255 60)">
            <path
              d="M254 31v66"
              stroke="var(--dr-art-dark)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="m241 39 1 30q12 13 24 0l1-30m-19 0v34m12-34v34"
              stroke="var(--dr-art-accent)"
              strokeWidth="2"
            />
          </g>
        </>
      )}
      {subject === 'collection' && (
        <>
          <g transform="rotate(-12 113 105)">
            <rect x="60" y="32" width="104" height="137" rx="3" fill="var(--dr-art-paper)" />
            <rect x="68" y="40" width="88" height="101" rx="2" fill="var(--dr-art-pistachio)" />
            <path d="M96 83h33v41H96z" fill="var(--dr-art-accent)" />
            <path d="M99 83v-8q13-22 27 0v8" stroke="var(--dr-art-dark)" strokeWidth="3" />
            <path d="M103 111q9-9 18 0" stroke="var(--dr-art-pistachio)" strokeWidth="2" />
            <path
              d="M88 152h49"
              stroke="var(--dr-art-shadow)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          <g transform="rotate(10 214 113)">
            <rect x="161" y="59" width="103" height="116" rx="3" fill="var(--dr-art-paper)" />
            <rect x="169" y="67" width="87" height="81" fill="var(--dr-art-cream)" />
            <path d="M182 123h59l-8 13h-43z" fill="var(--dr-art-mid)" />
            <path d="M190 121q-3-24 21-24 20 0 20 24" fill="var(--dr-art-accent)" />
            <path d="M230 103q18-3 12 12l-10 4" stroke="var(--dr-art-accent)" strokeWidth="5" />
          </g>
          <path d="m132 25 40 9-3 15-40-9z" fill="var(--dr-art-mid)" opacity=".65" />
          <path
            d="m235 45-1 18m-9-9 18 1"
            stroke="var(--dr-art-accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {subject === 'moments' && (
        <>
          <g transform="rotate(-8 120 108)">
            <rect x="68" y="49" width="104" height="120" rx="3" fill="var(--dr-art-paper)" />
            <rect x="76" y="57" width="88" height="86" fill="var(--dr-art-pistachio)" />
            <circle cx="139" cy="79" r="11" fill="var(--dr-art-paper)" />
            <path d="M76 125q29-40 55-2 15-26 33-12v32H76z" fill="var(--dr-art-mid)" />
          </g>
          <path
            d="M222 156q-12-47 8-93m-8 67q-27-6-26-26 26-1 26 26m3-24q27-3 29-24-24-4-29 24"
            stroke="var(--dr-art-accent)"
            strokeWidth="2"
            fill="var(--dr-art-pistachio)"
          />
          <path d="M206 153h35l-5 20h-24z" fill="var(--dr-art-accent)" />
          <g fill="var(--dr-art-paper)">
            <ellipse cx="231" cy="50" rx="9" ry="17" />
            <ellipse cx="231" cy="50" rx="9" ry="17" transform="rotate(60 231 50)" />
            <ellipse cx="231" cy="50" rx="9" ry="17" transform="rotate(120 231 50)" />
          </g>
          <circle cx="231" cy="50" r="7" fill="var(--dr-art-accent)" />
          <path
            d="m150 31 16 7-16 7"
            stroke="var(--dr-art-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
