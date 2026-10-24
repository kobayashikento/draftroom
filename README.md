# draftroom

A functional creator workspace built with **Next.js 16.4.2, React 19.3.1, TypeScript 7, Chakra UI 3.37.0, and the App Router**. It uses one connected content model across Overview, Calendar, Ideas, Series, Production, and Analytics.

## Run

Requires Node.js 22.18 or newer and pnpm. From this folder:

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. For a production build:

```sh
pnpm build
pnpm start
```

`next build` produces the static export in `out/`. The small `scripts/serve.ts` server serves that export. Without Supabase configuration, the app continues in browser-only mode and clearly labels it. `pnpm test` runs the model, persistence, and PostgreSQL access-policy tests.

Check that Node.js and pnpm are available in your shell with `node --version` and `pnpm --version`. The project's package manager version is recorded in `package.json`. Dependencies and build output are generated locally and excluded from Git.

## TypeScript

React components use `.tsx`; domain logic, tests, scripts and Supabase functions use `.ts`. Strict checking, unused-code checks and runtime validation cover workspace records, component props, database access and assistant messages. Untrusted JSON enters through `unknown` and is validated before use.

Run `pnpm typecheck` to regenerate Next.js declarations and check both the browser/Node code and the Supabase Edge Function. `tsconfig.json` configures Next.js and Node; `tsconfig.edge.json` checks the Deno entry point using the official Deno and Supabase types. The separate configurations keep runtime globals apart. `pnpm build` runs both checks before producing the static export.

`pnpm tsc` is a shortcut for the same complete check. `yarn tsc` fails before TypeScript starts because `package.json` selects pnpm and the installed Yarn Classic refuses that package-manager setting. Use pnpm with the existing `pnpm-lock.yaml`; no global Yarn or Corepack change is required. For just the Next.js/Node configuration, use `pnpm exec tsc --noEmit`.

`lib/types.ts` defines shared workspace records; `lib/database.types.ts` describes the database table. The assistant's request, response and planning types live in `supabase/functions/_shared/types.ts` so the client and Edge Function share their contract. Use explicit named shapes for smaller data structures rather than TypeScript `Pick`.

Node.js 22.18 or newer runs the `.ts` tests and utility scripts directly. Next.js compiles React `.tsx` components. CSS, JSON, SQL and TOML retain their native formats. Next.js regenerates the ignored `next-env.d.ts` file.

## Formatting

[Prettier](https://prettier.io/docs/) formats TypeScript, TSX, CSS, JSON, Markdown, SQL and TOML using the shared `.prettierrc.json` configuration. Run `pnpm format` to format the project, or `pnpm format:check` to check formatting without writing files. Generated output, dependencies, lockfiles, binary assets and environment files are excluded by `.prettierignore`.

Use two-space indentation, single quotes in TypeScript, semicolons, no trailing commas, LF line endings and no parentheses around a single arrow-function parameter. The print width is 100 characters. Editor integrations can use the installed project formatter and the same configuration.

## Architecture

- `app/layout.tsx`, `app/page.tsx`: Next.js App Router entry points and metadata.
- `app/globals.css`: responsive workspace layouts and component geometry.
- `lib/design-tokens.ts`: the working Pistachio & Oat palette, semantic color roles, typography and motion tokens.
- `postcss.config.json`: Tailwind CSS v4 through the official PostCSS plugin.
- `components/ui-provider.tsx`: Chakra provider consuming the shared design tokens.
- `components/ui.tsx`: Chakra buttons, accessible fields, inputs, textareas, native selects, checkboxes and badges.
- `components/icons.tsx`: shared Lucide icons for controls, navigation, status, content formats, platforms, series and branding.
- Editors use Chakra Dialog and Tabs for focus handling and keyboard navigation.
- `components/DraftroomApp.tsx`: app composition and view navigation; `components/layout/` contains the sidebar, top bar, page heading and sync notice adapter.
- `components/workspace/`: shared content cards, task rows, stage badges and original cover illustrations, plus the single workspace context and separate local, cloud and authentication boundaries.
- `components/workspace-provider.tsx`: selects the local or authenticated workspace implementation.
- `components/account/`: login, account layout, connection notices, conflict recovery and sign-out confirmation.
- `components/views/`: individual Overview, Ideas, Series and Analytics screens; `components/week-bar.tsx` supplies the shared period navigation.
- `components/calendar.tsx`: calendar composition; `components/calendar/` contains the toolbar, filters, week/month grid, agenda, publication cards, unscheduled panel and focused filter/drag hooks. Date ranges, publication selectors, view helpers and component/controller types live in `calendar.helpers.ts`.
- `components/production.tsx`, `components/production/checklist.tsx`: To do/Completed queues, collapsible checklists, task/project priority flags and an advancing Up next card.
- `components/editors.tsx`: selects the active dialog. `components/editors/` contains the shared modal, idea capture, content fields, notes, storyboard, tasks, publications, rescheduling, series templates, stages and delete confirmation.
- `components/assistant.tsx`, `components/assistant/`: the persistent bottom-center Gemini chat, small conversation/composer components and request controller. Chat history is part of the owner’s workspace and uses its existing cloud sync.
- `lib/assistant-actions.ts`: validated, atomic workspace changes and action receipts with stable IDs to prevent duplicate creations on replay.
- `supabase/functions/draftroom-assistant/`, `supabase/functions/_shared/`: authenticated Gemini proxy, bounded planning context, response schema and request validation. No Gemini credentials are included in the static website.
- `lib/display.ts`, `lib/reorder.ts`: local date display helpers and shared ordered-list movement.
- `lib/model.ts`: stable IDs, seed data, series instantiation and calendar/production selectors.
- `lib/workspace-data.ts`: workspace validation, scoped browser caches and JSON export.
- `lib/workspace-repository.ts`, `lib/workspace-sync.ts`: Supabase reads, serial saves and revision-based conflict handling.
- `supabase/migrations/`: database schema, ownership policies and server-controlled revisions.

One versioned state object contains `stages`, `series`, and `items`. Each item owns stable-ID storyboard entries, tasks, and publication records. Series and stages are referenced by ID. There are no separate dashboard, calendar, production, or analytics post copies.

Feature entry components compose smaller pieces with one clear responsibility. Import shared controls from `components/ui.tsx`, workspace state from `components/workspace/workspace-context.tsx`, and feature components directly from their files. This keeps component dependencies acyclic and avoids importing every screen through a shared hub. Components and hooks continue to use the same workspace state and persistence layer.

Each major feature has a `*.helpers.ts` module next to its components: account, assistant, calendar, editors, layout, production, workspace, overview, ideas, series and analytics. These modules export component props, named inputs/results, selectors, validation and update functions. Editors have additional helpers for publications, storyboards, stages and series templates to keep each module focused. Shared controls and icons follow the same pattern in `components/ui.helpers.ts` and `components/icons.helpers.ts`.

Keep JSX and event wiring in `.tsx` components, and React state/effects in `use-*.ts` hooks. Put reusable behavior in feature helpers and import their contracts with `import type`. Helpers must not import their consuming components or hooks. Core workspace records remain in `lib/types.ts`, persistence stays in `lib/`, and the assistant protocol remains shared with the Edge Function. Field setters expose only the editable fields for that feature and keep each field's value type connected to its key.

Workflow stage, task completion, and publication status are intentionally independent. Each platform has its own date, caption, URL, external ID, and manual-posted flag. Dates are local calendar dates, not UTC timestamps. Seed dates cover October 26–November 1, 2026. The app opens to Calendar in the current week; Today returns to the current week or month.

Overview summary cards are clickable filters. Posts planned shows unique ideas with an unposted publication in the selected week; ready posts, unfinished production tasks and ideas needing a new date cover the whole workspace. Each selected count and its result list use the same selector. Ready/overdue cards open the Publish editor, and overdue results show the platform dates that need attention. The task results link to their project checklists, with an Open production shortcut for the full queue and completed history. Empty categories remain clickable and explain why there are no results.

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

An administrator already signed into the Supabase CLI can run `node scripts/provision-owner.ts` after applying the schema and configuring `.env.local`, as an alternative to the manual account/owner-row steps. It creates the requested owner only if missing, saves a strong starter password under `DRAFTROOM_OWNER_INITIAL_PASSWORD` in ignored `.env.local`, and provisions the owner's row. It never changes an existing account's password. Administrator API keys are used only in the setup process's memory. The starter password is private and is not included in the browser build.

`supabase/config.toml` declares the private authentication settings: global signup is disabled and email/password login remains enabled. Preview with `supabase config diff --project-ref <project-ref>`, then apply with `supabase config push --project-ref <project-ref>`. Only declared settings change.

See the official [API key guide](https://supabase.com/docs/guides/getting-started/api-keys), [sign-in configuration](https://supabase.com/docs/guides/auth/general-configuration), and [row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Persistence and recovery

For this single-user version, the connected workspace is stored as a versioned JSON document in one private Postgres row. Its stages, series and content records keep their existing stable IDs. This keeps a complete save atomic. Each row belongs to a Supabase Auth user; the database checks ownership, controls revisions and denies browser inserts/deletes. Only the owner provisioned by the administrator has access.

On first sign-in to an empty cloud workspace, the app migrates valid drafts from the original `studio-space-v1` browser key. If there are no drafts, it uses the sample records. Existing cloud records always take priority over the legacy browser copy, which is preserved. A failed load or invalid saved document never silently replaces drafts with samples.

Edits are immediately copied to a browser cache scoped to the Supabase project and user, then saved serially to the cloud after a short delay. The interface distinguishes pending, saving, saved and failed states. Failed saves retain pending edits for retry after reconnecting or signing in again on that browser. Opening a cloud workspace requires an initial connection. Switching back to the tab or reconnecting refreshes its cloud state; this version does not continuously stream changes between devices.

A conditional revision check prevents stale devices from silently overwriting one another. If versions conflict, choose the cloud or device copy. The replaced version is preserved in a timestamped `draftroom:v1:…:recovery:…` browser key; recovery requires extracting that JSON manually for now. Export downloads a regular JSON backup. A backup-import UI is not included yet. Clearing browser data removes local pending/recovery copies, but not successfully saved cloud records.

Supabase Free can pause inactive projects and does not include automatic database backups. Keep JSON exports outside the browser. File uploads, API tokens and platform metrics are not stored by this integration. When shared editing or analytics needs grow, the nested records can be moved into separate tables behind the repository interface.

## Gemini assistant

The bottom-center **Ask Draftroom** button opens a planning chat that stays available across all six views. It can discuss plans, create ideas with checklists, add tasks to existing ideas, prioritize tasks and check tasks off. Action receipts open the affected checklist. Publication scheduling and social posting remain in the existing UI. The latest 60 messages save with the workspace; **Start a new chat** clears the conversation and keeps created ideas/tasks.

The assistant requires a signed-in, provisioned Supabase workspace. Browser-only mode shows the interface and a connection message without simulated AI responses. Existing users need no database migration: chat is an optional field in the workspace JSON.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey), using a project without paid billing if you want to stay on the free tier.
2. In your Supabase project, open **Edge Functions → Secrets** and add `GEMINI_API_KEY`. Never use a `NEXT_PUBLIC_` prefix, put this key in browser code, or commit it to Git. Vercel does not need this secret because Supabase runs the proxy.
3. Deploy the function with the Supabase CLI:

   ```sh
   supabase functions deploy draftroom-assistant --project-ref YOUR_PROJECT_REF --use-api
   ```

4. Deploy the normal `pnpm build` output to your existing host. Keep the existing Supabase URL and publishable-key configuration.

The default model is `gemini-3.5-flash-lite`, a fast model with a free tier. An optional Supabase secret `GEMINI_MODEL` changes it; check that the chosen model is available on your account’s free tier. There is no automatic paid-model fallback. Free-tier quotas depend on the Google project/model; quota exhaustion appears as an error instead of a fabricated answer. A best-effort, per-instance cooldown limits each owner to six requests per minute; Google’s project quotas remain the overall usage limit.

The backend verifies the caller’s Supabase session and checks workspace ownership through RLS. `verify_jwt` stays enabled. It sends only recent messages and a bounded summary of idea titles, stages, series, tasks and publication dates to Google. Notes, hooks, captions, account email and credentials are excluded from that automatic summary; anything typed in chat is sent. The summary includes at most 150 ideas and 40 tasks per idea and tells the model when context is partial. Google says free-tier content may be used to improve its products; see [Gemini pricing and data use](https://ai.google.dev/gemini-api/docs/pricing).

Model output is treated as untrusted data. Only the four supported action types are accepted, dates/priorities are validated, and targets are rechecked against the latest workspace before applying a whole response. Missing targets cancel its changes. Stable record IDs prevent duplicate creations if a response is replayed. Conversation and action changes use the same revision-aware cloud save as manual edits, with pending/failure status visible in the chat footer.

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
16. Open Ask Draftroom, switch views, and minimize/reopen the panel. Ask for a new idea or a task on an existing idea, open its action receipt and check the checklist. Reload after “Saved to cloud” and confirm the conversation and task remain. Ask a planning question and confirm it suggests work without creating unsolicited tasks. Check that quota/network errors offer a retry without claiming changes were saved.

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

Change the five primitive values in `lib/design-tokens.ts` to explore a new palette. Semantic roles derive surfaces, borders, accents, readable text, illustrations and overlays from those values. Chakra's `draftroom.*` tokens and `pistachio` color palette use the same CSS custom properties as the layout stylesheet. Component files do not define their own hex colours.

The direction is editorial, playful, sleek and soft: DM Serif Display section headings, compact DM Sans product headings and body text, a clean Manrope wordmark, generous spacing, warm surfaces, pistachio accents and small hover details. Ink is used on Pistachio primary buttons; small secondary text uses darker derived shades for readability. Motion respects `prefers-reduced-motion`.

Native date inputs preserve platform-specific scheduling and both input/change event handling. Theme changes leave stored content and the persistence model unchanged.

## Typography and spacing

Tailwind CSS v4 supplies the shared utilities and component styles. Chakra continues to provide accessible interactive components; its type and spacing tokens reference the same values in `lib/design-tokens.ts`. Public CSS variables are published by the root layout, so the palette and sizing remain centralized.

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

Interface icons use `AppIcon` from `components/icons.tsx`. Sizes are 16px for controls and metadata, 20px for navigation and status, 24px for featured badges, and 32px for the brand mark. Every size keeps a 1.75px visual stroke. Icon-only controls use the shared 32px `icon-button` geometry and an accessible label. Existing saved series symbols map to Lucide icons when displayed; no data migration is needed. Platform icons use a camera for Instagram and a music note for TikTok, accompanied by their platform names. Original cover illustrations remain separate from the interface icon set.

Chakra setup reference: https://chakra-ui.com/docs/get-started/frameworks/next-app
