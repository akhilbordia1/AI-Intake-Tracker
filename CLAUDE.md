# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server (Next.js 16 + Turbopack) at http://localhost:3000
- `npm run build` — production build (also runs `tsc` typecheck + static prerender; use this to verify)
- `npm run lint` — ESLint (`eslint-config-next` core-web-vitals + typescript)
- `npm run start` — serve the production build

No test framework is set up. Verify changes with `npx tsc --noEmit`, `npm run lint`, and `npm run build` (all three should be clean).

## What this is

A **prototype/demo** UI (no backend, no persistence) for an enterprise AI use-case governance lifecycle. All data is hardcoded; "AI suggest", "save", and submit are mocked client-side. Three routes:

- `/` (`src/app/page.tsx`) — intake tracker: kanban board + table views of use-case cards, grouped by stage/owner/priority/due, with scope + search filters.
- `/intake` (`src/app/intake/page.tsx`) — new use-case submission form (AI-draft mode + manual mode).
- `/detail` (`src/components/document-record/detail-record.tsx`) — the workflow record: a 14-stage lifecycle (Intake → Improve) with a chevron stage path, per-stage forms, and a Details/Comments/Activity side panel.

## Architecture

**Two parallel data models for the workflow — know which one you're editing:**

1. `src/data/document-workflow-form-schema.ts` (`WORKFLOW_STAGES`) — a rich, typed field schema (sections, field types, options, hints, defaults). Drives the intake schema. **NOT** what the `/detail` page renders its stage forms from.
2. `src/components/document-record/detail-record.tsx` (`STAGES`) — the array the `/detail` page actually renders: 14 stages, each `rows: [label, value][]`. This mirrors the original reference prototype (`AI Governance Platform.html`, a bundled demo kept outside the repo). When editing `/detail` stage content, edit `STAGES`.

**`/detail` form rendering is heuristic, driven off `STAGES` `[label, value]` rows:**
- `buildFieldSpec(label, value)` inspects the label/value and picks a `FieldKind`: `currency` (value starts GBP/USD/EUR/£/$/€) → `CurrencyField`; `scale` (`n/m`) → `RatingStepper`; `level` (ordinal sets in `ORDINAL_SETS`, e.g. Low/Medium/High) → `LevelSlider`; `select` (>5 options) → dropdown; short enums → `Segmented`, longer → `RadioGroup`; multi-select → `CardMultiSelect` if label in `CARD_FIELDS` else `ChipMultiSelect`; long text → `SmartTextarea`; else `SmartText`.
- Option lists come from `choiceOptions(label, value)`; multi-select items from `listItems(value)` (splits on `; , ->`). Editing which control a field gets means editing these helpers, not the components.
- Completed stages render read-only via `StageReadOnlyRows` / `ReadValue` (status badges, avatars, chips). Active editable stages render via `EditableStage`. The **Plan** stage is bespoke (`PlanStageForm`: squad picker, milestone timeline, lockable metrics) registered in `BESPOKE_STAGE_FORMS`.

**Reusable field kit — `src/components/forms/fields.tsx`.** All form controls live here (`SmartText`, `SmartTextarea`, `SearchableSelect`, `Segmented`, `RadioGroup`, `RatingStepper`, `LevelSlider`, `ChipMultiSelect`, `CardMultiSelect`, `CurrencyField`, `DateField`, `CompletionMeter`, `SaveStatus`). Every field takes `FieldChrome` props (`label`, `required`, `hint`, `error`, `hideHeader`). Pass `hideHeader` when the label is rendered externally (the `/detail` label-left row layout does this). `DateField` is a custom calendar in a `createPortal` popover (escapes overflow-clipping) — there are no native date inputs.

**Profiles — `src/components/profile.tsx`.** `PEOPLE`, `PersonAvatar`, `ProfileSwitcher`, `initials`. Names in `PEOPLE` match stage owners so "owned by you" (bold name) lights up on switch. Used by both the home header and the record.

## Styling conventions

- Tailwind v4 (`@import "tailwindcss"` in `src/app/globals.css`); no `tailwind.config`. Design tokens are CSS variables in `:root` (`--accent` teal, `--canvas`/`--surface*` warm cream, `--text-*`, `--border-*`, `--status-*`). **Use the token vars** (e.g. `text-[var(--text-label)]`, `bg-[var(--surface-muted)]`) rather than raw hexes where a token exists.
- Typography: `.font-display` = **Fraunces** (editorial serif) for headings + hero values; `.font-serif-body` = lighter Fraunces for prose; default body = **Inter**. Pattern: **serif for headings/prose, sans for controls/labels/data.**
- `cn()` (`src/lib/cn.ts`, clsx + tailwind-merge) for conditional classes. Imports use the `@/*` alias (→ `src/`).
- `.no-scrollbar` hides scrollbars on scroll containers (used by the stage path and panels).
