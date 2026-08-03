"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// ── Markdown, as much of it as the product needs ──
// Written summaries in this app are authored as Markdown so their copy can come
// from a model, or an .md file, without anyone touching layout. That only works if
// the renderer supports enough syntax to be worth writing in: headings, rules,
// blockquotes, bullet and numbered lists, tables, and inline bold / italic / code /
// links. Each construct maps onto the product's existing type and hairline rules —
// this is a styling layer, not a general-purpose parser (no nesting, no images, no
// reference links, no HTML).

// ── Inline ──
// One pass over the four inline forms. Split-and-map rather than a tokeniser: the
// captures are unambiguous because none of them nest.
const INLINE = /(\*\*[^*]+\*\*|(?<!\*)\*[^*]+\*(?!\*)|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`")) {
      return (
        <code key={index} className="font-mono rounded-[4px] bg-[var(--surface-strong)] px-1 py-[1px] text-[0.92em] text-[var(--text-primary)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[")) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part) ?? [];
      return href ? (
        <a key={index} href={href} className="font-medium text-[var(--accent)] underline decoration-[var(--accent-border)] underline-offset-2">
          {label}
        </a>
      ) : (
        part
      );
    }
    if (part.startsWith("*")) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

// ── Blocks ──
type Block =
  | { kind: "h1" | "h2" | "h3" | "p" | "quote"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "hr" };

const cells = (row: string) =>
  row
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    if (line === "---" || line === "***") {
      blocks.push({ kind: "hr" });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: `h${heading[1].length}` as "h1" | "h2" | "h3", text: heading[2] });
      continue;
    }
    if (line.startsWith("> ")) {
      // Consecutive quote lines are one blockquote.
      const parts = [line.slice(2)];
      while (lines[index + 1]?.trim().startsWith("> ")) parts.push(lines[(index += 1)].trim().slice(2));
      blocks.push({ kind: "quote", text: parts.join(" ") });
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      let current: string | undefined = line;
      while (current?.startsWith("|")) {
        // The `| --- | --- |` separator carries no content.
        if (!/^\|[\s:-]+\|/.test(current)) rows.push(cells(current));
        current = lines[index + 1]?.trim();
        if (current?.startsWith("|")) index += 1;
      }
      const [head, ...body] = rows;
      if (head) blocks.push({ kind: "table", head, rows: body });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      const items = [(bullet ?? numbered)![1]];
      for (;;) {
        const next = lines[index + 1]?.trim();
        const nextItem = next && (bullet ? /^[-*]\s+(.*)$/ : /^\d+[.)]\s+(.*)$/).exec(next);
        if (!nextItem) break;
        items.push(nextItem[1]);
        index += 1;
      }
      blocks.push({ kind, items });
      continue;
    }
    // A paragraph runs until a blank line, the way Markdown wraps prose.
    const parts = [line];
    while (lines[index + 1]?.trim() && !/^(#{1,3}\s|[-*]\s|\d+[.)]\s|>\s|\||---$)/.test(lines[index + 1].trim())) {
      parts.push(lines[(index += 1)].trim());
    }
    blocks.push({ kind: "p", text: parts.join(" ") });
  }

  return blocks;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parse(source);
  const lastIndex = blocks.length - 1;

  return (
    <div className={cn("text-[14px] leading-[1.65] text-[var(--text-body)]", className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          // A document title, in the display serif.
          case "h1":
            return (
              <h2 key={index} className="font-display mt-6 text-[20px] leading-tight text-[var(--text-primary)] first:mt-0">
                {inline(block.text)}
              </h2>
            );
          // Sections open on a hairline, so the heading itself can stay quiet.
          case "h2":
            return (
              <h3
                key={index}
                className="mt-5 border-t border-[var(--border-hairline)] pt-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)] first:mt-0 first:border-t-0 first:pt-0"
              >
                {inline(block.text)}
              </h3>
            );
          case "h3":
            return (
              <h4 key={index} className="mt-4 text-[13px] font-semibold text-[var(--text-primary)]">
                {inline(block.text)}
              </h4>
            );
          case "hr":
            return <hr key={index} className="mt-5 border-t border-[var(--border-hairline)]" />;
          // Pulled out with an accent edge — the one thing in a summary that is a
          // judgement rather than a fact.
          case "quote":
            return (
              <blockquote
                key={index}
                className="font-serif-body mt-4 border-l-2 border-[var(--accent-border)] pl-3.5 text-[15px] leading-[1.7] text-[var(--text-primary)] first:mt-0"
              >
                {inline(block.text)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={index} className="mt-2.5 flex flex-col gap-1.5">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span className="min-w-0">{inline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="mt-2.5 flex flex-col gap-1.5">
                {block.items.map((item, position) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="font-mono mt-[1px] shrink-0 text-[12px] text-[var(--text-muted)]">
                      {position + 1}.
                    </span>
                    <span className="min-w-0">{inline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          // Hairline rows, no vertical lines and no fill: the same table shape the
          // rest of the product uses.
          case "table":
            return (
              <div key={index} className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      {block.head.map((cell) => (
                        <th
                          key={cell}
                          className="border-b border-[var(--border-default)] pb-1.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)] last:pr-0"
                        >
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.join("|")}>
                        {row.map((cell, column) => (
                          <td
                            key={column}
                            className={cn(
                              "border-b border-[var(--border-hairline)] py-2 pr-4 align-top text-[13px] leading-[1.5] last:pr-0",
                              column === 0 && "whitespace-nowrap font-medium text-[var(--text-primary)]",
                              column > 0 && "text-[var(--text-body)]",
                            )}
                          >
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p
                key={index}
                className={cn(
                  "mt-2.5 first:mt-0",
                  // A closing italic line reads as a footnote, whatever it says.
                  index === lastIndex && block.text.startsWith("*") && "text-[12px] text-[var(--text-muted)]",
                )}
              >
                {inline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
