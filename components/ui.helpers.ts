import type { ReactNode, ComponentProps, CSSProperties, RefAttributes } from 'react';
import { defineConfig, createSystem, defaultConfig } from '@chakra-ui/react';
import type {
  ButtonProps as ChakraButtonProps,
  TextareaProps as ChakraTextareaProps
} from '@chakra-ui/react';
import { palette, fonts, typeScale, colorRoles, kebab } from '../lib/design-tokens.ts';

export type UIProviderProps = { children: ReactNode };
export type ButtonProps = ChakraButtonProps & RefAttributes<HTMLButtonElement>;
export type TextareaProps = ChakraTextareaProps & RefAttributes<HTMLTextAreaElement>;
export type PriorityButtonProps = { active: boolean; label: string; onClick: () => void };
export type FieldProps = { label: string; wide?: boolean; children: ReactNode };
export type SelectChoice = { value: string; label: string };

export function selectChoice(option: SelectOption): SelectChoice {
  const [value, label] = typeof option === 'string' ? [option, option] : option;
  return { value, label };
}

export function isPrimaryButton(className: string): boolean {
  return className.split(' ').includes('primary');
}

export type InputChange = { target: { checked: boolean; value: string } };

export type InputProps = Omit<ComponentProps<'input'>, 'onChange' | 'size'> & {
  onChange?: (event: InputChange) => void;
};

export type SelectOption = string | readonly string[];

export type SelectProps = Omit<ComponentProps<'select'>, 'onChange' | 'value'> & {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
};

export const token = (value: string) => ({ value });

export const config = defineConfig({
  preflight: false,
  theme: {
    tokens: {
      colors: {
        brand: Object.fromEntries(
          Object.entries(palette).map(([name, value]) => [name, token(value)])
        ),
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
          950: token('var(--dr-ink)')
        }
      },
      fonts: Object.fromEntries(Object.entries(fonts).map(([name, value]) => [name, token(value)])),
      fontSizes: Object.fromEntries(
        Object.keys(typeScale).map(name => [
          name === 'base' ? 'md' : name,
          token(`var(--dr-text-${name})`)
        ])
      ),
      spacing: Object.fromEntries(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24].map(value => [
          value,
          token(`calc(var(--dr-space) * ${value})`)
        ])
      )
    },
    semanticTokens: {
      colors: {
        draftroom: Object.fromEntries(
          Object.keys(colorRoles).map(name => [name, token(`var(--dr-${kebab(name)})`)])
        ),
        pistachio: {
          solid: token('var(--dr-accent)'),
          contrast: token('var(--dr-on-accent)'),
          fg: token('var(--dr-moss-strong)'),
          muted: token('var(--dr-highlight)'),
          subtle: token('var(--dr-accent-soft)'),
          emphasized: token('var(--dr-accent-hover)'),
          focusRing: token('var(--dr-moss-strong)')
        }
      }
    }
  }
});

export const draftroomSystem = createSystem(defaultConfig, config);
