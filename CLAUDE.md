# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server (Next.js 16 + Turbopack) at http://localhost:3000
- `npm run build` — production build (also runs `tsc` typecheck + static prerender; use this to verify)
- `npm run lint` — ESLint (`eslint-config-next` core-web-vitals + typescript)
- `npm run start` — serve the production build
- `npm run icons` — re-export every icon the app imports to `icons/*.svg` (+ a README table of where each is used), read straight out of `lucide-react`. Run it after adding or removing a lucide import; don't hand-edit the SVGs.

No test framework is set up. Verify changes with `npx tsc --noEmit`, `npm run lint`, and `npm run build` (all three should be clean).

## What this is

A **prototype/demo** UI (no backend, no persistence) for an enterprise AI use-case governance lifecycle. All data is hardcoded; "AI suggest", "save", and submit are mocked client-side. Three routes:

- `/` (`src/app/page.tsx`) — intake tracker: kanban board + table views of use-case cards, grouped by stage/owner/priority/due, with scope + search filters.
- `/intake` (`src/app/intake/page.tsx`) — "New use case": a full-screen chat, not a form. Describing the idea *is* the intake; sending hands it to `/detail?idea=…`, whose guided flow asks the follow-ups and fills Ideation. The only route that doesn't use the app shell.
- `/overview` (`src/app/overview/page.tsx`) — a record's landing page: a compact state block, a role-aware "what you need to do" list (ordered yours-first, tagged with whose turn it is), and a lifecycle track — the four phases with per-phase progress, expanding one phase at a time into its stages (each linking to `/detail?stage=n`). Cards on `/` link here.
- `/detail` (`src/components/document-record/detail-record.tsx`) — the workflow record: the 12-stage lifecycle with a stage-path dropdown, per-stage forms, a guided chat, and a Details/Gates/Comments/Activity side sheet. `?stage=n` deep-links a stage (and treats everything before it as complete).

**Shell — `src/components/app-shell.tsx`.** Three rows of chrome every route composes: `AppTopBar` (product mark, title, centred search, profile), `RailHeader` + `PanelTabs` (chat rail header with jump-to-top / expand, and the panel's view tabs), and `ContentPanel` (rounded floating panel with icon + title + `PanelBreadcrumb` + controls, and an optional footer/status bar). `AppShell` lays out the rail (fixed 300px), the panel, and an optional third column. The chat rail sits directly on `--shell-canvas`; whitespace, not borders, divides it from the panel.

## Architecture

**Two parallel data models for the workflow — know which one you're editing:**

1. `src/data/document-workflow-form-schema.ts` (`WORKFLOW_STAGES`) — a rich, typed field schema (sections, field types, options, hints, defaults). Drives the intake schema. **NOT** what the `/detail` page renders its stage forms from.
2. `src/data/lifecycle.ts` (`STAGES`) — the array `/detail` and `/overview` both render: 12 stages, each `rows: [label, value][]`, plus `GATES`, `STAGE_INTROS`, `STAGE_GROUPS` (the 4 phases), `RECORD_DETAILS`, and where the record currently sits (`ACTIVE_STAGE_INDEX` / `COMPLETED_STAGE_INDEXES`). This mirrors the original reference prototype (`AI Governance Platform.html`, a bundled demo kept outside the repo). When editing stage content, edit `STAGES` here — nothing should keep a second copy.

**`/detail` form rendering is heuristic, driven off `STAGES` `[label, value]` rows:**
- `buildFieldSpec(label, value)` inspects the label/value and picks a `FieldKind`: `currency` (value starts GBP/USD/EUR/£/$/€) → `CurrencyField`; `scale` (`n/m`) → `RatingStepper`; `level` (ordinal sets in `ORDINAL_SETS`, e.g. Low/Medium/High) → `LevelSlider`; `select` (>5 options) → dropdown; short enums → `Segmented`, longer → `RadioGroup`; multi-select → `CardMultiSelect` if label in `CARD_FIELDS` else `ChipMultiSelect`; long text → `SmartTextarea`; else `SmartText`.
- Option lists come from `choiceOptions(label, value)`; multi-select items from `listItems(value)` (splits on `; , ->`). Editing which control a field gets means editing these helpers, not the components.
- Every stage — open or completed — renders through `StageFieldsGrid`, which renders the *same* control in both modes (read mode makes it inert and strips its chrome via `.read-field` / `.read-choice`). The **Plan** stage is bespoke (`PlanStageForm`: squad picker, milestone timeline, lockable metrics) registered in `BESPOKE_STAGE_FORMS`; it shares the stage header (`StageFormHeader`) with the grid.
- Two AI reads sit on top of the recorded data, both written from `lifecycle.ts` values (`ai-upgrade:` marks where a model call would go): `GtacRecommendation` (detail-record) puts a compact for/against above the GTAC fields, and `RiskSummaryModal` (`risk-modal.tsx`, a native `<dialog>`) opens off the record header's risk chip. Its content is a single Markdown string (`summary()`), rendered by a four-tag renderer (`## `, `- `, paragraphs, `**bold**`) — so the copy can come from an `.md` file or a model without touching layout.
- `/intake` *is* the shell in its expanded-rail state: `AppShell railExpanded` + `RailHeader` + the shared `ChatStartScreen`, so its spacing is the same code as the registry's full-width chat. Both header controls return to `/`.

**Reusable field kit — `src/components/forms/fields.tsx`.** All form controls live here (`SmartText`, `SmartTextarea`, `SearchableSelect`, `Segmented`, `RadioGroup`, `RatingStepper`, `LevelSlider`, `ChipMultiSelect`, `CardMultiSelect`, `CurrencyField`, `DateField`, `CompletionMeter`, `SaveStatus`). Every field takes `FieldChrome` props (`label`, `required`, `hint`, `error`, `hideHeader`). Pass `hideHeader` when the label is rendered externally (the `/detail` label-left row layout does this). `DateField` is a custom calendar in a `createPortal` popover (escapes overflow-clipping) — there are no native date inputs.

**Profiles — `src/components/profile.tsx`.** `PEOPLE`, `PersonAvatar`, `ProfileSwitcher`, `initials`. Names in `PEOPLE` match stage owners so "owned by you" (bold name) lights up on switch. Used by both the home header and the record.

## Styling conventions

**Read `DESIGN.md` first** — it defines the tokens, the 11/12/13/14/15/18/20/40 type scale, the radius + tone system, and the component kit (`src/components/ui/kit.tsx`). Compose from the kit; no raw hex in components.

- Tailwind v4 (`@import "tailwindcss"` in `src/app/globals.css`); no `tailwind.config`. Design tokens are CSS variables in `:root` (`--accent` teal, `--canvas`/`--surface*` warm cream, `--text-*`, `--border-*`, `--status-*`). **Use the token vars** (e.g. `text-[var(--text-label)]`, `bg-[var(--surface-muted)]`) rather than raw hexes where a token exists.
- Typography: `.font-display` = **Fraunces** (editorial serif) for headings + hero values; `.font-serif-body` = lighter Fraunces for prose; default body = **Inter**; `.font-mono` = **Geist Mono** for ids, dates and counts. Pattern: **serif for headings/prose, sans for controls/labels/data.**
- `cn()` (`src/lib/cn.ts`, clsx + tailwind-merge) for conditional classes. Imports use the `@/*` alias (→ `src/`).
- `.no-scrollbar` hides scrollbars on scroll containers (used by the stage path and panels).
