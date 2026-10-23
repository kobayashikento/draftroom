// Pistachio & Oat is Draftroom's working palette. Change these five values to
// explore another direction; both Chakra and the layout CSS consume this file.
export const palette = {
  ivory: '#FAF9F5',
  oat: '#E9E4D9',
  pistachio: '#D5DEBC',
  moss: '#79866A',
  ink: '#2C3029',
};

const color = name => `var(--dr-${name})`;
const mix = (first, second, amount) => `color-mix(in srgb, ${first} ${amount}%, ${second})`;

// Roles describe a color's job, so components never need to choose a hex value.
export const colorRoles = {
  canvas: color('ivory'),
  surface: mix(color('ivory'), 'white', 40),
  raised: mix(color('ivory'), 'white', 15),
  sidebar: mix(color('ivory'), color('oat'), 55),
  border: color('oat'),
  controlBorder: color('moss'),
  muted: mix(color('ink'), color('ivory'), 70),
  mossStrong: mix(color('ink'), color('moss'), 30),
  accent: color('pistachio'),
  accentSoft: mix(color('pistachio'), color('ivory'), 34),
  accentHover: mix(color('pistachio'), color('moss'), 82),
  hover: mix(color('pistachio'), color('ivory'), 22),
  highlight: mix(color('pistachio'), color('ivory'), 55),
  ink: color('ink'),
  onAccent: color('ink'),
  onStrong: color('ivory'),
  overlay: mix(color('ink'), 'transparent', 38),
  shadow: mix(color('ink'), 'transparent', 8),
  shadowStrong: mix(color('ink'), 'transparent', 17),
  warning: mix(color('oat'), color('ivory'), 72),
  artOat: mix(color('oat'), color('ivory'), 72),
  artPistachio: mix(color('pistachio'), color('ivory'), 72),
  artPaper: color('ivory'),
  artShadow: mix(color('oat'), color('moss'), 80),
  artMid: mix(color('moss'), color('oat'), 55),
  artAccent: color('moss'),
  artDark: mix(color('ink'), color('moss'), 50),
  artCream: mix(color('oat'), color('ivory'), 60),
  artGlint: mix(color('ivory'), 'transparent', 65),
};

export const fonts = {
  body: "'DM Sans', system-ui, sans-serif",
  heading: "'DM Serif Display', Georgia, serif",
  brand: "'Manrope', system-ui, sans-serif",
};

// Tailwind and Chakra share these sizes. Use text-sm for interface copy,
// text-xs for metadata, text-base for card titles and text-2xl for sections.
export const typeScale = {
  xs: {size: '0.75rem', leading: '1rem'},
  sm: {size: '0.875rem', leading: '1.25rem'},
  base: {size: '1rem', leading: '1.5rem'},
  lg: {size: '1.125rem', leading: '1.75rem'},
  xl: {size: '1.25rem', leading: '1.75rem'},
  '2xl': {size: '1.5rem', leading: '2rem'},
  '3xl': {size: '1.875rem', leading: '2.25rem'},
  '4xl': {size: '2.25rem', leading: '2.75rem'},
};
export const spacingUnit = '0.25rem';

export const motion = {duration: '180ms', easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)'};
export const kebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

export const cssCustomProperties = Object.fromEntries([
  ...Object.entries(palette).map(([name, value]) => [`--dr-${name}`, value]),
  // The ink role shares its primitive's name; leave the primitive intact.
  ...Object.entries(colorRoles).filter(([name]) => name !== 'ink').map(([name, value]) => [`--dr-${kebab(name)}`, value]),
  ...Object.entries(fonts).map(([name, value]) => [`--dr-font-${name}`, value]),
  ...Object.entries(typeScale).flatMap(([name, {size, leading}]) => [[`--dr-text-${name}`, size], [`--dr-leading-${name}`, leading]]),
  ['--dr-space', spacingUnit],
  ...Object.entries(motion).map(([name, value]) => [`--dr-motion-${name}`, value]),
]);
