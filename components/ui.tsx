'use client';

import { isPrimaryButton, selectChoice } from './ui.helpers.ts';
import type {
  ButtonProps,
  PriorityButtonProps,
  FieldProps,
  TextareaProps,
  InputProps,
  SelectProps
} from './ui.helpers.ts';
import {
  Button as ChakraButton,
  Field as ChakraField,
  Input as ChakraInput,
  Textarea as ChakraTextarea,
  NativeSelect,
  Checkbox,
  Badge
} from '@chakra-ui/react';
import { Flag, Check, ChevronDown } from 'lucide-react';
import { AppIcon } from './icons';

export function Button({ children, className = '', ...props }: ButtonProps) {
  const primary = isPrimaryButton(className);
  return (
    <ChakraButton
      type="button"
      colorPalette="pistachio"
      variant={primary ? 'solid' : 'outline'}
      size="sm"
      className={`dr-button ${className}`}
      {...props}
    >
      {children}
    </ChakraButton>
  );
}
export function PriorityButton({ active, label, onClick }: PriorityButtonProps) {
  return (
    <Button
      className="icon-button priority-button"
      aria-label={`Prioritize ${label}`}
      aria-pressed={active}
      title={active ? `Remove priority for ${label}` : `Prioritize ${label}`}
      onClick={onClick}
    >
      <AppIcon icon={Flag} fill={active ? 'currentColor' : 'none'} />
    </Button>
  );
}
export function Field({ label, wide = false, children }: FieldProps) {
  return (
    <ChakraField.Root className={`field ${wide ? 'wide' : ''}`}>
      <ChakraField.Label className="field-label" color="draftroom.muted">
        {label}
      </ChakraField.Label>
      {children}
    </ChakraField.Root>
  );
}

export function Input({ type, checked, onChange, className = '', ...props }: InputProps) {
  if (type === 'checkbox')
    return (
      <Checkbox.Root
        colorPalette="pistachio"
        size="sm"
        checked={checked}
        onCheckedChange={({ checked }) =>
          onChange?.({ target: { checked: checked === true, value: String(props.value ?? '') } })
        }
        flexShrink="0"
      >
        <Checkbox.HiddenInput className={className} {...props} />
        <Checkbox.Control>
          <Checkbox.Indicator boxSize="4" checked={<AppIcon icon={Check} />} />
        </Checkbox.Control>
      </Checkbox.Root>
    );
  return (
    <ChakraInput
      type={type}
      colorPalette="pistachio"
      size="sm"
      className={`dr-input ${className}`}
      {...props}
      onChange={onChange}
    />
  );
}
export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <ChakraTextarea
      colorPalette="pistachio"
      size="sm"
      className={`dr-textarea ${className}`}
      {...props}
    />
  );
}

export function Select({ options, value, onChange, style, className = '', ...props }: SelectProps) {
  return (
    <NativeSelect.Root
      className={`studio-select ${className}`}
      colorPalette="pistachio"
      size="sm"
      style={style}
    >
      <NativeSelect.Field
        className="dr-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        {...props}
      >
        {options.map(x => {
          const { value, label } = selectChoice(x);
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </NativeSelect.Field>
      <NativeSelect.Indicator>
        <AppIcon icon={ChevronDown} />
      </NativeSelect.Indicator>
    </NativeSelect.Root>
  );
}
export { Badge };
