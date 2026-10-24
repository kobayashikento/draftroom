# draftroom

A functional creator workspace built with **Next.js 16.4.2, React 19.3.1, Chakra UI 3.37.0, and the App Router**. It uses one connected content model across Overview, Calendar, Ideas, Series, Production, and Analytics.

## Run

Requires Node.js 22 or newer and pnpm. From this folder:

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. For a production build:

```sh
pnpm build
pnpm start
```

`next build` produces the static export in `out/`. The small `scripts/serve.mjs` server serves that export. Without Supabase configuration, the app continues in browser-only mode and clearly labels it. `pnpm test` runs the model, persistence, and PostgreSQL access-policy tests.

Check that Node.js and pnpm are available in your shell with `node --version` and `pnpm --version`. The project's package manager version is recorded in `package.json`. Dependencies and build output are generated locally and excluded from Git.

## Formatting

[Prettier](https://prettier.io/docs/) formats JavaScript, JSX, CSS, JSON, Markdown, SQL and TOML using the shared `.prettierrc.json` configuration. Run `pnpm format` to format the project, or `pnpm format:check` to check formatting without writing files. Generated output, dependencies, lockfiles, binary assets and environment files are excluded by `.prettierignore`.

Use two-space indentation, single quotes in JavaScript, trailing commas and a 100-character print width. Editor integrations can use the installed project formatter and the same configuration.

## Architecture

- `app/layout.jsx`, `app/page.jsx`: Next.js App Router entry points and metadata.
- `app/globals.css`: responsive workspace layouts and component geometry.
- `lib/design-tokens.js`: the working Pistachio & Oat palette, semantic color roles, typography and motion tokens.
- `postcss.config.mjs`: Tailwind CSS v4 through the official PostCSS plugin.
- `components/ui-provider.jsx`: Chakra provider consuming the shared design tokens.
- `components/ui.jsx`: Chakra buttons, accessible fields, inputs, textareas, native selects, checkboxes and badges.
- `components/icons.jsx`: shared Lucide icons for controls, navigation, status, content formats, platforms, series and branding.
- Editors use Chakra Dialog and Tabs for focus handling and keyboard navigation.
- `components/DraftroomApp.jsx`: workspace shell and view navigation.
- `components/workspace.jsx`: reusable controls/cards and original SVG cover illustrations.
- `components/workspace-provider.jsx`: private login boundary, shared React context, immutable updates, persistence and account lifecycle.
- `components/account.jsx`: Chakra login, connection notices, conflict recovery and sign-out confirmation.
- `components/views.jsx`: connected overview, ideas, series and analytics views.
- `components/calendar.jsx`, `lib/calendar.js`: calendar-first week/month/list planning, channel/content filters, unscheduled channel plans and independent publication rescheduling.
- `components/production.jsx`: collapsible To do/Completed checklists, task/project priority flags and an advancing Up next card.
- `components/editors.jsx`: content detail, storyboard, tasks, publication records, quick capture, series templates and workflow-stage editors.
- `lib/model.js`: stable IDs, seed data, series instantiation and calendar/production selectors.
- `lib/workspace-data.js`: workspace validation, scoped browser caches and JSON export.
- `lib/workspace-repository.js`, `lib/workspace-sync.js`: Supabase reads, serial saves and revision-based conflict handling.
- `supabase/migrations/`: database schema, ownership policies and server-controlled revisions.

One versioned state object contains `stages`, `series`, and `items`. Each item owns stable-ID storyboard entries, tasks, and publication records. Series and stages are referenced by ID. There are no separate dashboard, calendar, production, or analytics post copies.

Workflow stage, task completion, and publication status are intentionally independent. Each platform has its own date, caption, URL, external ID, and manual-posted flag. Dates are local calendar dates, not UTC timestamps. Seed dates cover October 26–November 1, 2026. The app opens to Calendar in the current week; Today returns to the current week or month.

Stage behaviors (needs prep / ready / posted) remain independent of customizable stage names. Removing a stage migrates affected items to the first remaining stage. Templates are copied when creating episodes; editing a template does not rewrite existing posts.

Production keeps checked tasks visible within unfinished checklists. Completing the entire checklist moves it into Completed, where cards start collapsed; finished Ready/Posted ideas are also available there. Unchecking a task returns an idea still in a working stage to To do. Each checklist can be collapsed manually. Classification uses the full checklist even when filtering task due dates by Today or This week.

Flag individual tasks or entire projects to prioritize them. Up next and the production queue sort unfinished priority tasks first, then priority projects, then due dates; ties preserve the existing record order. Complete & next checks the suggested task and immediately presents the next task or reel. Optional task priority is saved with the existing workspace JSON, so older drafts remain compatible without a database migration. The interface uses named imports from `lucide-react` for icons.

## Supabase setup

1. Create a **Free** Supabase project for draftroom. Project costs follow the organization's plan, so choose a Free organization. No hosted project is bundled with this repository.
2. In the project's SQL editor, run `supabase/migrations/202610230001_private_workspace.sql` once. It creates `draftroom_workspaces` and enables row-level security.
3. In **Authentication → Users → Add user → Create user**, create `morningswithemi@gmail.com` with a password chosen by the owner and confirm the account. The app uses email/password, so login does not depend on an SMTP provider.
4. In **Authentication → Sign In / Providers**, disable **Allow new users to sign up**. Leave email/password sign-in enabled.
5. Run `supabase/provision-owner.sql`. It creates the owner's empty workspace without replacing existing data. Other authenticated accounts cannot create workspaces or access this owner's data.
6. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the project's Connect dialog. Use an `sb_publishable_…` key. Never use a secret or service-role key in public configuration.
7. Restart `pnpm dev`, or rebuild with `pnpm build` and run `pnpm start`. Public environment values are included at build time. Sign in on the same browser and origin that contains the original drafts to migrate them.

An administrator already signed into the Supabase CLI can run `node scripts/provision-owner.mjs` after applying the schema and configuring `.env.local`, as an alternative to the manual account/owner-row steps. It creates the requested owner only if missing, saves a strong starter password under `DRAFTROOM_OWNER_INITIAL_PASSWORD` in ignored `.env.local`, and provisions the owner's row. It never changes an existing account's password. Administrator API keys are used only in the setup process's memory. The starter password is private and is not included in the browser build.

`supabase/config.toml` declares the private authentication settings: global signup is disabled and email/password login remains enabled. Preview with `supabase config diff --project-ref <project-ref>`, then apply with `supabase config push --project-ref <project-ref>`. Only declared settings change.

See the official [API key guide](https://supabase.com/docs/guides/getting-started/api-keys), [sign-in configuration](https://supabase.com/docs/guides/auth/general-configuration), and [row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Persistence and recovery

For this single-user version, the connected workspace is stored as a versioned JSON document in one private Postgres row. Its stages, series and content records keep their existing stable IDs. This keeps a complete save atomic. Each row belongs to a Supabase Auth user; the database checks ownership, controls revisions and denies browser inserts/deletes. Only the owner provisioned by the administrator has access.

On first sign-in to an empty cloud workspace, the app migrates valid drafts from the original `studio-space-v1` browser key. If there are no drafts, it uses the sample records. Existing cloud records always take priority over the legacy browser copy, which is preserved. A failed load or invalid saved document never silently replaces drafts with samples.

Edits are immediately copied to a browser cache scoped to the Supabase project and user, then saved serially to the cloud after a short delay. The interface distinguishes pending, saving, saved and failed states. Failed saves retain pending edits for retry after reconnecting or signing in again on that browser. Opening a cloud workspace requires an initial connection. Switching back to the tab or reconnecting refreshes its cloud state; this version does not continuously stream changes between devices.

A conditional revision check prevents stale devices from silently overwriting one another. If versions conflict, choose the cloud or device copy. The replaced version is preserved in a timestamped `draftroom:v1:…:recovery:…` browser key; recovery requires extracting that JSON manually for now. Export downloads a regular JSON backup. A backup-import UI is not included yet. Clearing browser data removes local pending/recovery copies, but not successfully saved cloud records.

Supabase Free can pause inactive projects and does not include automatic database backups. Keep JSON exports outside the browser. File uploads, API tokens and platform metrics are not stored by this integration. When shared editing or analytics needs grow, the nested records can be moved into separate tables behind the repository interface.

## Acceptance walkthrough

1. Add a Carousel idea and assign a series; open Ideas and find it in the initial stage.
2. Edit storyboard titles, notes and overlay text. Add, remove and reorder entries.
3. Change its stage; check that the board, calendar and production queue reflect it.
4. In Publish, set different Instagram and TikTok dates. Check both calendar slots open the same editor and the stage stays unchanged.
5. Check a task in Production. It stays checked and crossed out within an unfinished checklist. Complete the entire checklist and verify it moves to Completed, collapsed by default. Expand it and uncheck a task to return it to To do while the idea is in a working stage. Flag a task or project and verify Up next changes; use Complete & next and verify the following task or reel appears. Check Today/This week filters, manual collapsing, and priority/completion persistence after reload.
6. Move an item with unfinished tasks to Ready. It leaves the normal prep queue and gets an inconsistency notice; task history remains.
7. Edit a series template and create the next episode. Exactly one draft appears with copied entries/tasks and no schedule.
8. Rename, reorder, add and remove stages. Linked ideas remain accessible.
9. Save a manual post URL and mark that publication posted. Analytics stays Not connected / unavailable.
10. Check week/month navigation across October and November. Monday October 26 and Sunday November 1 align correctly.
11. Use Board/List, search, filters, keyboard controls, and compact navigation at narrow widths.
12. Configure Supabase and sign in. Confirm the original IDs and edits migrate into the empty owner row, then sign in on a second browser and verify those records load.
13. Disconnect the network while editing. Verify the app does not claim a cloud save; reconnect and retry, then confirm the change persisted remotely.
14. Edit from two browsers with the same starting revision. Confirm the stale browser displays a conflict rather than overwriting the newer cloud data.
15. Sign out and confirm the workspace is hidden. Attempt database access without a session or as an unprovisioned user; both must be denied.

`pnpm test` exercises migration, save ordering, recovery after failed requests, cache isolation, corrupted data preservation, and conflicts. The SQL tests run the actual migration in an in-memory PostgreSQL instance with simulated Supabase identity claims, checking anonymous access, another account, owner writes, forbidden ownership/revision changes and stale writes. A live Supabase sign-in/sync walkthrough still requires project provisioning and the owner's credentials.

## Scope

Implemented: all six connected views, quick capture, board/list, customizable stages, search and filters, ordered editable storyboards/tasks, notes/tags/priority/cadence, platform-specific dates/captions/links, editable series templates, manual publication tracking, Supabase email/password login and cloud persistence when configured, automatic migration of browser drafts, conflict handling, local recovery copies and JSON export.

Deferred: real photo uploads/storage (reference URLs can be saved), board/storyboard drag-and-drop (use explicit reorder/stage controls), automated batch grouping, backup import, shared workspaces, real API analytics and automatic publishing. Analytics shows unavailable data honestly. Original cover illustrations are placeholders for future uploaded images.

## Calendar planning

Draftroom uses an original, Buffer-inspired planning layout with compact, collapsible navigation and the existing Pistachio & Oat tokens. Calendar is the landing view. Week and month grids share the same publication records as the weekly list; Monday is the first day, month navigation handles short months and year boundaries, and Today uses the local date.

Filter by channel, format, series, publication status, or title/tags/caption. The Unscheduled tray contains individual undated channel plans, including the second channel of a partly scheduled idea. Counts follow the current filters. On desktop the tray opens beside the calendar, with its own scroll area; narrow screens stack it above the grid. Add buttons on a day prefill that date and the selected channel when capturing a new idea.

Drag an unposted card onto a day to reschedule only that platform. Every full card also has a keyboard-accessible Choose a date control; the same dialog can move a plan back to Unscheduled. Opening a card goes directly to its Publish tab. Manually posted records stay visible and cannot be dragged or moved through the quick scheduling dialog. Checklist completion, workflow stage and other channel dates stay independent. Scheduling remains a planning tool; it does not publish to social platforms.

## UI component library

Chakra UI v3 and Emotion provide shared controls. The provider uses Draftroom's working **Pistachio & Oat** palette. This is the default design direction, not a permanent brand commitment:

| Token     | Colour    |
| --------- | --------- |
| Ivory     | `#FAF9F5` |
| Oat       | `#E9E4D9` |
| Pistachio | `#D5DEBC` |
| Moss      | `#79866A` |
| Ink       | `#2C3029` |

Change the five primitive values in `lib/design-tokens.js` to explore a new palette. Semantic roles derive surfaces, borders, accents, readable text, illustrations and overlays from those values. Chakra's `draftroom.*` tokens and `pistachio` color palette use the same CSS custom properties as the layout stylesheet. Component files do not define their own hex colours.

The direction is editorial, playful, sleek and soft: DM Serif Display section headings, compact DM Sans product headings and body text, a clean Manrope wordmark, generous spacing, warm surfaces, pistachio accents and small hover details. Ink is used on Pistachio primary buttons; small secondary text uses darker derived shades for readability. Motion respects `prefers-reduced-motion`.

Native date inputs preserve platform-specific scheduling and both input/change event handling. Theme changes leave stored content and the persistence model unchanged.

## Typography and spacing

Tailwind CSS v4 supplies the shared utilities and component styles. Chakra continues to provide accessible interactive components; its type and spacing tokens reference the same values in `lib/design-tokens.js`. Public CSS variables are published by the root layout, so the palette and sizing remain centralized.

| Role                                                 | Utility     | Size |
| ---------------------------------------------------- | ----------- | ---- |
| Metadata and helper text                             | `text-xs`   | 12px |
| Interface copy, navigation, buttons and fields       | `text-sm`   | 14px |
| Card titles                                          | `text-base` | 16px |
| Product page, section, checklist and dialog headings | `text-2xl`  | 24px |
| Account headings                                     | `text-3xl`  | 30px |
| Metric values                                        | `text-4xl`  | 36px |

Use the 4px spacing unit: `gap-2` for 8px, `gap-3` for 12px, `gap-4` for 16px and `gap-6` for 24px. Panels use `p-6`, compact panels use `p-4`, and standard controls have a 40px minimum height. Add contextual utilities in JSX instead of inline font sizes, margins or padding.

The stylesheet declares Chakra's layers followed by shared components and Tailwind utilities. It imports Tailwind's theme and utilities without Preflight, preserving one reset and keeping dialog, tab and checkbox behavior consistent.

Interface icons use `AppIcon` from `components/icons.jsx`. Sizes are 16px for controls and metadata, 20px for navigation and status, 24px for featured badges, and 32px for the brand mark. Every size keeps a 1.75px visual stroke. Icon-only controls use the shared 32px `icon-button` geometry and an accessible label. Existing saved series symbols map to Lucide icons when displayed; no data migration is needed. Platform icons use a camera for Instagram and a music note for TikTok, accompanied by their platform names. Original cover illustrations remain separate from the interface icon set.

Chakra setup reference: https://chakra-ui.com/docs/get-started/frameworks/next-app
