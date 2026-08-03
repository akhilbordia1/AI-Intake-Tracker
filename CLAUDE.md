# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server (Next.js 16 + Turbopack) at http://localhost:3000
- `npm run build` — production build (also runs `tsc` typecheck + static prerender; use this to verify)
- `npm run lint` — ESLint (`eslint-config-next` core-web-vitals + typescript)
- `npm run start` — serve the production build
- `npm run icons` — re-export every icon the app imports to `icons/*.svg` (+ a README table of where each is used), read straight out of `lucide-react`. Run it after adding or removing a lucide import; don't hand-edit the SVGs.

No test framework is set up. Verify changes with `npx tsc --noEmit`, `npm run lint`, and `npm run build` (all three should be clean).

Two pure-logic files carry their own `assert`-based self-check, run with plain node (no framework, no bundler):

- `RUN_DEMO=1 node src/lib/stage-chat.ts` — field extraction from free text.
- `RUN_DEMO=1 node src/lib/portfolio.ts` — every portfolio derivation, **plus `reconcile()` over the real seed**: it fails loudly if a card's dates/money and the month-end snapshots in `registry.ts` stop agreeing. Run it after editing either.

That only works while the data layer stays loadable by node: `src/data/*.ts` import each other **relatively and with the `.ts` extension** (hence `allowImportingTsExtensions` in tsconfig), and `registry.ts` has no value imports at all.

## What this is

A **prototype/demo** UI (no backend, no persistence) for an enterprise AI use-case governance lifecycle. All data is hardcoded; "AI suggest", "save", and submit are mocked client-side. Five routes:

- `/` (`src/app/page.tsx`) — intake tracker: kanban board + table views of use-case cards, grouped by stage/owner/priority/due, with scope + search filters.
- `/intake` (`src/app/intake/page.tsx`) — "New use case": a full-screen chat, not a form. Describing the idea *is* the intake; sending hands it to `/detail?idea=…`, whose guided flow asks the follow-ups and fills Ideation. The only route that doesn't use the app shell.
- `/overview` (`src/app/overview/page.tsx`) — a record's landing page: a compact state block, a role-aware "what you need to do" list (ordered yours-first, tagged with whose turn it is), and a lifecycle track — the four phases with per-phase progress, expanding one phase at a time into its stages (each linking to `/detail?stage=n`). Cards on `/` link here.
- `/portfolio` (`src/app/portfolio/page.tsx`) — the leadership view: two reads of the whole registry, each **one sentence (`ReadLine`) + four stats + at most four blocks**. *Health*: where the work is sitting (phase + typical days), what needs unblocking, are decisions getting faster. *Value*: is benefit catching up with spend, where the money sits, is production hitting targets, what shipped or was stopped. Each view opens with a `SummaryPanel` — the half of the digest that belongs to it (`healthSummary` / `valueSummary`), authored as Markdown. There is no digest modal: a leader shouldn't open a dialog to be told what the page in front of them says; the rail joins both halves for "brief me on the portfolio". Anything else — gate outcomes, risk mix, owner load, throughput, value by function — is a question for the rail, and an `AskLine` says so; the responder has a branch for each. **Not linked from the tracker yet** — it's still being built, so the tab was pulled from `/`'s tab row; reach it by URL.
- `/detail` (`src/components/document-record/detail-record.tsx`) — the workflow record: the 12-stage lifecycle with a stage-path dropdown, per-stage forms, a guided chat, and a Details/Gates/Comments/Activity side sheet. `?stage=n` deep-links a stage (and treats everything before it as complete).

**Shell — `src/components/app-shell.tsx`.** Three rows of chrome every route composes: `AppTopBar` (product mark, title, centred search, profile), `RailHeader` + `PanelTabs` (chat rail header with jump-to-top / expand, and the panel's view tabs), and `ContentPanel` (rounded floating panel with icon + title + `PanelBreadcrumb` + controls, and an optional footer/status bar). `AppShell` lays out the rail (fixed 300px), the panel, and an optional third column. The chat rail sits directly on `--shell-canvas`; whitespace, not borders, divides it from the panel.

## Architecture

**Three homes for record data — know which one you're editing:**

0. `src/data/registry.ts` (`USE_CASES`, `PORTFOLIO_ARCHIVE`, `ALL_RECORDS`) — the whole registry, one shallow card each, plus a seeded history layer (dates, investment, benefit, risk tier/level, function, KPIs, gate history) and `PORTFOLIO_SNAPSHOTS`, six authored month-ends. `AS_OF` is the prototype's "today" — every derivation takes it as an argument, nothing calls `new Date()`. The tracker and the portfolio both read this; `src/lib/portfolio.ts` turns it into KPIs.

**Two parallel data models for the *workflow* — know which one you're editing:**

1. `src/data/document-workflow-form-schema.ts` (`WORKFLOW_STAGES`) — a rich, typed field schema (sections, field types, options, hints, defaults). Drives the intake schema. **NOT** what the `/detail` page renders its stage forms from.
2. `src/data/lifecycle.ts` (`STAGES`) — the array `/detail` and `/overview` both render: 12 stages, each `rows: [label, value][]`, plus `GATES`, `STAGE_INTROS`, `STAGE_GROUPS` (the 4 phases), `RECORD_DETAILS`, and where the record currently sits (`ACTIVE_STAGE_INDEX` / `COMPLETED_STAGE_INDEXES`). This mirrors the original reference prototype (`AI Governance Platform.html`, a bundled demo kept outside the repo). When editing stage content, edit `STAGES` here — nothing should keep a second copy.

**`/detail` form rendering is heuristic, driven off `STAGES` `[label, value]` rows:**
- `buildFieldSpec(label, value)` inspects the label/value and picks a `FieldKind`: `currency` (value starts GBP/USD/EUR/£/$/€) → `CurrencyField`; `scale` (`n/m`) → `RatingStepper`; `level` (ordinal sets in `ORDINAL_SETS`, e.g. Low/Medium/High) → `LevelSlider`; `select` (>5 options) → dropdown; short enums → `Segmented`, longer → `RadioGroup`; multi-select → `CardMultiSelect` if label in `CARD_FIELDS` else `ChipMultiSelect`; long text → `SmartTextarea`; else `SmartText`.
- Option lists come from `choiceOptions(label, value)`; multi-select items from `listItems(value)` (splits on `; , ->`). Editing which control a field gets means editing these helpers, not the components.
- Every stage — open or completed — renders through `StageFieldsGrid`, which renders the *same* control in both modes (read mode makes it inert and strips its chrome via `.read-field` / `.read-choice`). The **Plan** stage is bespoke (`PlanStageForm`: squad picker, milestone timeline, lockable metrics) registered in `BESPOKE_STAGE_FORMS`; it shares the stage header (`StageFormHeader`) with the grid.
- Two AI reads sit on top of the recorded data, both written from `lifecycle.ts` values (`ai-upgrade:` marks where a model call would go): `GtacRecommendation` (detail-record) puts the call and one line of reasoning above the GTAC fields, and `RiskSummaryModal` (`risk-modal.tsx`) opens off the record header's risk chip.

**Written documents.** Anything the agent *writes* is one Markdown string rendered by `src/components/document-record/markdown.tsx` (headings, rules, blockquote, bullet/numbered lists, tables, inline bold/italic/code/links — a styling layer, not a parser) inside `markdown-modal.tsx` (a native `<dialog>`). Two callers today: `risk-modal.tsx` (in `markdown-modal.tsx`, a `<dialog>`) and the portfolio's `SummaryPanel` (inline, no dialog). Swap either for a model call and keep the Markdown shape; layout doesn't move.

**Portfolio derivations — `src/lib/portfolio.ts`.** Every leadership number as a pure function taking its data (`wipByPhase`, `funnel`, `throughput`, `medianCycleDaysByPhase`, `blockers`, `aging`, `gateOutcomes`, `riskMix`, `capacityByOwner`, `moneyByState`, `kpiAttainment`, `headline`, `portfolioDigest`, `reconcile`). Phase membership is passed in as a `PhaseMap` built from `lifecycle.ts`, so this file keeps no second copy of the lifecycle. Two definitions worth knowing: cycle time counts only records that have **left** a phase (the rest are `open`, and `aging()` names them), and `blockers()` means parked-or-blocked, not rejected — a rejection is a decision, and it shows up in the money buckets and the outcomes ledger instead. The tiles and the chat both read these, so a tile and an answer can't disagree.
- `/intake` *is* the shell in its expanded-rail state: `AppShell railExpanded` + `RailHeader` + the shared `ChatStartScreen`, so its spacing is the same code as the registry's full-width chat. Both header controls return to `/`.

**Reusable field kit — `src/components/forms/fields.tsx`.** All form controls live here (`SmartText`, `SmartTextarea`, `SearchableSelect`, `Segmented`, `RadioGroup`, `RatingStepper`, `LevelSlider`, `ChipMultiSelect`, `CardMultiSelect`, `CurrencyField`, `DateField`, `CompletionMeter`, `SaveStatus`). Every field takes `FieldChrome` props (`label`, `required`, `hint`, `error`, `hideHeader`). Pass `hideHeader` when the label is rendered externally (the `/detail` label-left row layout does this). `DateField` is a custom calendar in a `createPortal` popover (escapes overflow-clipping) — there are no native date inputs.

**Profiles — `src/components/profile.tsx`.** `PEOPLE`, `PersonAvatar`, `ProfileSwitcher`, `initials`. Names in `PEOPLE` match stage owners so "owned by you" (bold name) lights up on switch. Used by both the home header and the record.

## Styling conventions

**Read `DESIGN.md` first** — it defines the tokens, the 11/12/13/14/15/18/20/40 type scale, the radius + tone system, and the component kit (`src/components/ui/kit.tsx`). Compose from the kit; no raw hex in components.

- Tailwind v4 (`@import "tailwindcss"` in `src/app/globals.css`); no `tailwind.config`. Design tokens are CSS variables in `:root` (`--accent` teal, `--canvas`/`--surface*` warm cream, `--text-*`, `--border-*`, `--status-*`). **Use the token vars** (e.g. `text-[var(--text-label)]`, `bg-[var(--surface-muted)]`) rather than raw hexes where a token exists.
- Typography: `.font-display` = **Fraunces** (editorial serif) for headings + hero values; `.font-serif-body` = lighter Fraunces for prose; default body = **Inter**; `.font-mono` = **Geist Mono** for ids, dates and counts. Pattern: **serif for headings/prose, sans for controls/labels/data.**
- `cn()` (`src/lib/cn.ts`, clsx + tailwind-merge) for conditional classes. Imports use the `@/*` alias (→ `src/`).
- `.no-scrollbar` hides scrollbars on scroll containers (used by the stage path and panels).
