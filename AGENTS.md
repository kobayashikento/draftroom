<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Code formatting

- Use `.tsx` for React components and `.ts` for other application code. Keep strict TypeScript checks passing with `pnpm typecheck`, including the separate Deno configuration for the Edge Function. Define explicit named data shapes instead of TypeScript `Pick<T, K>`.

- Keep source files readable with the project's Prettier configuration. Run `pnpm format` after edits and `pnpm format:check` before finishing. SQL and TOML are included; generated output, dependencies, lockfiles, binary assets and environment files are excluded.
- Keep feature entry components focused on composition. Put related editors, calendar pieces, account screens and layout components in their feature folders, and import them directly. Use the single workspace context in `components/workspace/workspace-context.tsx`; avoid circular dependencies between feature components.
- Each major feature keeps its exported props, input/result types, selectors, validation and update functions in a neighboring `*.helpers.ts` module. Split focused editor helpers when needed. Keep JSX and event wiring in components and React state/effects in `use-*.ts` hooks; helpers must not import their consuming components or hooks. Keep shared domain records in `lib/types.ts` and retain runtime validation at external boundaries.
- Use the configured Prettier preferences: no trailing commas, semicolons, single quotes, LF endings and no parentheses around a single arrow-function parameter. `pnpm tsc` aliases the complete `pnpm typecheck` check. This repository uses pnpm; do not introduce a second lockfile.

## Draftroom design direction

- Use Chakra UI for shared interactive components.
- Use Lucide through `AppIcon` in `components/icons.tsx` for interface icons. Shared sizes and stroke weight live in `lib/design-tokens.ts`: 16px for controls/metadata, 20px for navigation/status, 24px for featured badges, and 32px for the brand. Use `icon-button` for icon-only controls and provide an accessible label. Do not use text characters as icons.
- Use Tailwind utilities for typography and spacing. The shared scale lives in `lib/design-tokens.ts` and is consumed by both Tailwind and Chakra; avoid one-off font sizes and inline margins/padding. Use 14px (`text-sm`) for interface copy and controls, 12px (`text-xs`) for metadata, 16px (`text-base`) for card titles, and 24px (`text-2xl`) for section headings. Use the 4px spacing unit, 24px panel padding and 24px gaps between panels; compact layouts use 16px panel padding.
- Keep component styles in the `components` CSS layer and Tailwind utilities after Chakra's recipes so overrides remain predictable. Do not enable a second CSS reset.
- Pistachio & Oat is the working default palette, and can change later. Its five primitive colours live in `lib/design-tokens.ts`; use semantic tokens instead of hardcoded component colours.
- Keep the experience editorial, playful, sleek and soft: expressive typography, spacious layouts, friendly copy, minimal clutter and gentle contrast.
- Keep text readable and interactive states clear. Subtle motion must respect reduced-motion preferences.
