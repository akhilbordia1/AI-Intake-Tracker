---
name: verify
description: Run this repo's full check set — tsc, ESLint, the production build, prettier at --print-width 150, and the three node self-checks — then report exactly what failed. Use before claiming a change is done, before committing, and after any edit to src/data/ or src/lib/.
---

# Verify

There is no test framework here. These six commands are the test suite. Run them **in this order** —
each one is cheaper than the next, and a `tsc` error makes the build's output noise rather than signal.

```bash
npx tsc --noEmit
npm run lint
npx prettier --check --print-width 150 "src/**/*.{ts,tsx}"
npm run build
RUN_DEMO=1 node src/lib/stage-chat.ts
RUN_DEMO=1 node src/lib/portfolio.ts
RUN_DEMO=1 node src/lib/content.ts
```

## What each one is actually for

- **`tsc --noEmit`** — the only check that reads every file. `npm run build` type-checks too, but it
  stops at the first failing route.
- **`npm run lint`** — `eslint-config-next` core-web-vitals + typescript. Unused imports come out here,
  and they are the usual residue of deleting a component.
- **`prettier --check --print-width 150`** — 150 is not the default and there is no config file, so the
  flag is not optional. Prettier is not a dependency; `npx` resolves it. Four files were already
  unformatted before this skill existed (`risk-modal.tsx`, `ui/chart.tsx`, `data/lifecycle.ts`,
  `data/registry.ts`) — if they are the only warnings, that is the pre-existing state, not your change.
  Only `--write` the files you touched.
- **`npm run build`** — the static prerender. This is where a client-only component in a server file,
  or a Recharts label that only exists after hydration, actually shows up.
- **The three self-checks** — assert-based, no framework, run under plain node. `stage-chat` covers
  field extraction from free text; `content` covers `{{placeholder}}` filling for the authored Markdown
  in `public/content/`; `portfolio` covers every derivation **plus three checks over the real data** —
  `reconcile()` (a card's dates and money against the month-end snapshots in `registry.ts`),
  `reconcileRecordKpis()` (the deep record's planned targets against what Monitoring reports), and a
  check that every stage field has a `FIELD_GISTS` entry.

`node` can only load those three because the data layer stays import-free: `src/data/*.ts` import each
other **relatively and with the `.ts` extension**, and `registry.ts` has no value imports at all. If a
self-check dies on an import rather than an assertion, that constraint is what broke — not the logic.

## Reporting

Report faithfully. If something fails, say so and paste the output — the reconcile message names the
month and both numbers, which is the whole diagnostic. If a step was skipped, say which and why. Do not
report "verified" on a partial run.

One extra step when a lucide import was added or removed: `npm run icons`, which re-exports every icon
the app imports to `icons/*.svg` with a README table of where each is used. Don't hand-edit the SVGs.
