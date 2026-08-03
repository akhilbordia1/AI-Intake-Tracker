<!--
  The copy for the record header's "AI Risk Insight" modal.

  Edit this file and reload the page — it is served straight out of `public/`, so there
  is no build step and nothing to re-run. `src/components/document-record/risk-modal.tsx`
  fetches it the first time the modal opens.

  {{placeholders}} are filled from the record's own values in `src/data/lifecycle.ts`, so
  the prose can change without the numbers drifting from the rest of the app. Every one
  of them must exist — an unknown placeholder throws rather than rendering as `{{typo}}`
  in front of a reader. The full list:

    {{overall}}         Overall risk level          e.g. Medium
    {{tier}}            Risk governance tier        e.g. full          (lower-cased)
    {{modelRisk}}       Model risk level            e.g. medium        (lower-cased)
    {{ethicalRisk}}     Ethical risk level          e.g. low           (lower-cased)
    {{hostingRisk}}     Data hosting risk level     e.g. low           (lower-cased)
    {{pii}}             Personal data in scope      "none" or "in scope"
    {{gateId}}          Open gate's id              e.g. R3
    {{gateName}}        Open gate's name            e.g. build review  (lower-cased)
    {{gateStatus}}      Open gate's status          e.g. in review     (lower-cased)
    {{gateApprover}}    Open gate's approver        e.g. Noah R.
    {{accuracyTarget}}  Accuracy target from the KPI plan   e.g. 95%

  Markdown the renderer understands: `#`/`##`/`###`, `---`, `>` blockquote, `-` and `1.`
  lists, `| tables |`, and inline **bold**, *italic*, `code` and [links](https://…).
  A `##` renders as a tracked-caps section label with a hairline above it; a closing
  *italic* paragraph renders as a footnote. HTML comments like this one are stripped.

  Structure to keep, because the modal's shape depends on it:
    1. a bold verdict sentence
    2. a `>` blockquote — the one judgement, pulled out
    3. `## What drives it` — the ratings table
    4. `## What holds it there` — the controls, as a list
    5. `## What would raise it` — a numbered list of triggers
    6. `---` then an *italic* footnote naming the open gate

  One authoring note: don't end a sentence on {{gateApprover}}. Approvers are recorded as
  "Noah R.", so a full stop after one gives you "Noah R..". The footnote below is written
  without sentence punctuation for that reason.
-->

**{{overall}} risk**, on the {{tier}} assessment path.

> The exposure is accuracy, not autonomy: the assistant summarises, a writer signs every summary, and nothing reaches a regulator unreviewed.

## What drives it

| Dimension | Level | Why |
| --- | --- | --- |
| Model | {{modelRisk}} | 200+ page protocols; a missed endpoint or dosing detail isn't always obvious on review |
| Ethical | {{ethicalRisk}} | No decisions about people, no profiling, nothing published unreviewed |
| Data hosting | {{hostingRisk}} | Enterprise tenancy behind existing SSO; nothing leaves the estate |
| Personal data | {{pii}} | Document-level protocol content only |

## What holds it there

- Writer review and **sign-off** before a summary is used — the control the rating leans on most
- Every summary and edit logged for `21 CFR Part 11`
- Access through the existing identity provider; no separate credential store
- Quarterly performance review, retraining only on detected drift

## What would raise it

1. Patient-identifiable data entering scope
2. Removing the writer sign-off
3. Output reaching a submitted document without CSV re-validation
4. Accuracy falling below the `{{accuracyTarget}}` target for two consecutive months

---

*Open gate `{{gateId}}` · {{gateName}} · {{gateStatus}} with {{gateApprover}}*
