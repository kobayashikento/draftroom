'use client';
import {ChakraProvider, createSystem, defaultConfig, defineConfig} from '@chakra-ui/react';
import {palette, colorRoles, fonts, kebab} from '../lib/design-tokens.js';

const token = value => ({value});
const config = defineConfig({
  preflight: false,
  theme: {
    tokens: {
      colors: {
        brand: Object.fromEntries(Object.entries(palette).map(([name, value]) => [name, token(value)])),
        pistachio: {
          50: token('var(--dr-canvas)'),
          100: token('var(--dr-accent-soft)'),
          200: token('var(--dr-pistachio)'),
          300: token('color-mix(in srgb, var(--dr-pistachio) 75%, var(--dr-moss))'),
          400: token('color-mix(in srgb, var(--dr-pistachio) 40%, var(--dr-moss))'),
          500: token('var(--dr-moss)'),
          600: token('var(--dr-moss-strong)'),
          700: token('color-mix(in srgb, var(--dr-moss) 40%, var(--dr-ink))'),
          800: token('color-mix(in srgb, var(--dr-moss) 20%, var(--dr-ink))'),
          900: token('var(--dr-ink)'),
          950: token('var(--dr-ink)'),
        },
      },
      fonts: Object.fromEntries(Object.entries(fonts).map(([name, value]) => [name, token(value)])),
    },
    semanticTokens: {
      colors: {
        draftroom: Object.fromEntries(Object.keys(colorRoles).map(name => [name, token(`var(--dr-${kebab(name)})`)])),
        pistachio: {
          solid: token('var(--dr-accent)'),
          contrast: token('var(--dr-on-accent)'),
          fg: token('var(--dr-moss-strong)'),
          muted: token('var(--dr-highlight)'),
          subtle: token('var(--dr-accent-soft)'),
          emphasized: token('var(--dr-accent-hover)'),
          focusRing: token('var(--dr-moss-strong)'),
        },
      },
    },
  },
});

export const draftroomSystem = createSystem(defaultConfig, config);
export default function UIProvider({children}) {
  return <ChakraProvider value={draftroomSystem}>{children}</ChakraProvider>;
}
