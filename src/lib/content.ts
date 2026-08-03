// ── Authored copy, filled with the record's own values ──
// Documents the assistant "writes" live in `public/content/*.md` so the copy can be
// edited and reloaded without a build step. The numbers inside them are not authored:
// they're `{{placeholders}}` filled from the data layer, so prose and figures can't
// drift apart. See `public/content/risk-summary.md` for the shape.

const COMMENT = /<!--[\s\S]*?-->/g;
const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Strips HTML comments (the authoring notes at the top of each file), then substitutes
 * every `{{key}}`. Throws on a placeholder with no value — a typo in the Markdown has to
 * fail loudly, because the alternative is a leader reading `{{overall}} risk` in a
 * document that is supposed to be the assessment.
 */
export function fillTemplate(source: string, values: Record<string, string | number | undefined>): string {
  const missing: string[] = [];
  const filled = source.replace(COMMENT, "").replace(PLACEHOLDER, (whole, key: string) => {
    const value = values[key];
    if (value === undefined || value === "") {
      missing.push(key);
      return whole;
    }
    return String(value);
  });
  if (missing.length) throw new Error(`unfilled placeholders: ${[...new Set(missing)].join(", ")}`);
  // Leading blank lines are what the stripped comment leaves behind.
  return filled.replace(/^\s+/, "");
}

// ── Self-check ──
// `RUN_DEMO=1 node src/lib/content.ts`

function demo() {
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  assert(fillTemplate("**{{a}}** and {{b}}", { a: "one", b: 2 }) === "**one** and 2", "fill: substitutes and stringifies");
  assert(fillTemplate("<!-- notes -->\n\n# Title", {}) === "# Title", "fill: strips the comment and the gap it leaves");
  assert(fillTemplate("{{ spaced }}", { spaced: "ok" }) === "ok", "fill: tolerates padding inside the braces");
  // A placeholder that only appears inside the comment block (the authoring notes list
  // every key) must not count as unfilled.
  assert(fillTemplate("<!-- {{documented}} -->\nplain", {}) === "plain", "fill: comment contents are not placeholders");

  let threw = "";
  try {
    fillTemplate("{{here}} and {{gone}}", { here: "x" });
  } catch (error) {
    threw = (error as Error).message;
  }
  assert(threw.includes("gone") && !threw.includes("here"), `fill: names only the missing key (${threw})`);

  let blank = "";
  try {
    fillTemplate("{{empty}}", { empty: "" });
  } catch (error) {
    blank = (error as Error).message;
  }
  assert(blank.includes("empty"), "fill: an empty string is missing, not a value");

  console.log("content demo passed");
}

if (process.env.RUN_DEMO) demo();
