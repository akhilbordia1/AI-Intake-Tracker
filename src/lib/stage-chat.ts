// Pure helpers for the stage chat panel. Kept framework-free so the
// field-extraction logic can be checked without React.
// ai-upgrade: keyword + option matching (mocked AI). Swap extractStageFields for
// a real LLM extraction call to parse actual values from free text.

// Generic English filler only — domain words (model, data, risk, scope, date…)
// are kept so those labels stay matchable.
const STOPWORDS = new Set(["the", "and", "for", "with", "from", "into", "this", "that", "your", "have", "will", "are", "our"]);

const MULTI_KINDS = new Set(["chips", "cards"]);

export type ExtractField = {
  label: string;
  kind: string;
  options?: string[];
  suggestion: string | string[];
};

export type FieldFill = { label: string; value: string | string[]; stated: boolean };

export function isFieldEmpty(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim() === "";
}

// Significant words of a field label — used to spot a mention in free text.
// Keeps acronyms and 3-letter tokens (e.g. "PII").
function labelKeywords(label: string): string[] {
  return label
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

// Given a free-text description, return the fields it fills, with a value:
//  - choice fields → the stated option(s) found in the text (a REAL value).
//  - otherwise, a field mentioned by label keyword → its AI-draft suggestion.
// Fields with no signal are omitted (they become follow-up "gap" questions).
export function extractStageFields(text: string, fields: ExtractField[], handled: string[]): FieldFill[] {
  const lower = text.toLowerCase();
  const done = new Set(handled);
  const fills: FieldFill[] = [];

  for (const field of fields) {
    if (done.has(field.label)) continue;
    const options = field.options ?? [];

    if (options.length) {
      const matched = options.filter((option) => lower.includes(option.toLowerCase()));
      if (matched.length) {
        const multi = MULTI_KINDS.has(field.kind);
        fills.push({ label: field.label, value: multi ? matched : matched[0], stated: true });
        continue;
      }
    }

    const keywords = labelKeywords(field.label);
    if (keywords.length && keywords.some((word) => lower.includes(word))) {
      fills.push({ label: field.label, value: field.suggestion, stated: false });
    }
  }

  return fills;
}

// Self-check: RUN_DEMO=1 node src/lib/stage-chat.ts
function demo() {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error("stage-chat demo failed: " + msg);
  };
  const fields: ExtractField[] = [
    { label: "Business problem", kind: "long", suggestion: "Backlog of invoices." },
    { label: "PII", kind: "radio", options: ["Present", "No", "Not sure"], suggestion: "Present" },
    { label: "Grounding controls", kind: "cards", options: ["Citations required", "Retrieval-only answers"], suggestion: ["Citations required"] },
    { label: "Sponsor", kind: "text", suggestion: "R. Shah" },
  ];

  const out = extractStageFields("The business problem is backlog. PII is Present. Add citations required and retrieval-only answers.", fields, []);
  const byLabel = Object.fromEntries(out.map((f) => [f.label, f]));

  // Choice field → stated option value (real).
  assert(byLabel["PII"]?.value === "Present" && byLabel["PII"].stated, "PII → stated Present");
  // Multi choice → all stated options as array.
  assert(
    Array.isArray(byLabel["Grounding controls"]?.value) && (byLabel["Grounding controls"].value as string[]).length === 2,
    "multi → both options",
  );
  // Keyword-mentioned free text → suggestion draft (not stated).
  assert(byLabel["Business problem"]?.stated === false, "Business problem → draft");
  // Unmentioned field omitted → becomes a gap question.
  assert(!byLabel["Sponsor"], "unmentioned field omitted");

  // Handled fields skipped.
  assert(extractStageFields("PII present", fields, ["PII"]).length === 0, "handled skipped");
  // Acronym (3 chars) is matchable.
  assert(extractStageFields("pii present", [fields[1]], []).length === 1, "PII acronym matches");

  assert(isFieldEmpty("") && isFieldEmpty([]) && isFieldEmpty(undefined), "empties");
  assert(!isFieldEmpty("x") && !isFieldEmpty(["a"]), "non-empties");

  console.log("stage-chat demo passed");
}

if (process.env.RUN_DEMO) demo();
