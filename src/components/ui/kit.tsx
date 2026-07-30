"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

// ── The UI kit ──
// The shapes every screen is built from. If a screen needs a button, a status
// chip, a card or a section heading, it composes one of these instead of writing
// its own class string — that's what keeps the board, the record and the overview
// looking like one product. Colour comes from tokens in globals.css, never hexes.
// The type scale is 11 / 12 / 13 / 14 / 15 / 18 / 20 / 40; see DESIGN.md.

// ── Buttons ──
// Two sizes, four intents. `primary` is the one action a view is *for*; `quiet`
// is chrome (icon-ish controls in headers); `ghost` is a text action.

type ButtonTone = "primary" | "secondary" | "quiet" | "danger";
type ButtonSize = "sm" | "md";

export function buttonClass(tone: ButtonTone = "secondary", size: ButtonSize = "sm") {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-[14px]",
    tone === "primary" && "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
    tone === "secondary" &&
      "border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-body)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--accent-strong)]",
    tone === "quiet" && "text-[var(--text-label)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
    tone === "danger" && "border border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)] hover:brightness-95",
  );
}

export function Button({
  tone = "secondary",
  size = "sm",
  active = false,
  className,
  ...rest
}: { tone?: ButtonTone; size?: ButtonSize; active?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        buttonClass(tone, size),
        active && tone === "secondary" && "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
        className,
      )}
    />
  );
}

export function ButtonLink({
  tone = "secondary",
  size = "sm",
  className,
  ...rest
}: { tone?: ButtonTone; size?: ButtonSize } & ComponentProps<typeof Link>) {
  return <Link {...rest} className={cn(buttonClass(tone, size), className)} />;
}

// A square control that is only an icon: header chrome, steppers, close buttons.
export function IconButton({
  label,
  active = false,
  size = 32,
  className,
  children,
  ref,
  ...rest
}: { label: string; active?: boolean; size?: number } & ComponentProps<"button">) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-tip={label}
      aria-pressed={active}
      style={{ width: size, height: size }}
      {...rest}
      className={cn(
        "grid shrink-0 place-items-center rounded-[8px] transition disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "text-[var(--text-label)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ── Tags ──
// One chip for every piece of status in the product: gates, risk tiers, stage
// state, board lifecycle. Tone names map to the token triplets, so a green here
// is the same green everywhere.

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

// Tags read in Title Case ("In Review", "Blocked by Gate") — short prepositions
// stay lowercase. Prose elsewhere stays sentence case.
const TAG_LOWER = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "via", "with"]);

export function titleCaseTag(text: string) {
  return text
    .split(" ")
    .map((word, index) => {
      if (index > 0 && TAG_LOWER.has(word.toLowerCase())) return word.toLowerCase();
      if (!/[a-z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function Tag({ tone = "neutral", icon, className, children, ...rest }: { tone?: Tone; icon?: ReactNode } & ComponentProps<"span">) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        `border-[var(--tone-${tone}-border)] bg-[var(--tone-${tone}-bg)] text-[var(--tone-${tone}-fg)]`,
        className,
      )}
    >
      {icon}
      {typeof children === "string" ? titleCaseTag(children) : children}
    </span>
  );
}

// Tailwind needs the tone classes to exist literally somewhere to emit them.
// ponytail: one unused element beats a safelist file.
export const TONE_CLASS_MANIFEST = [
  "border-[var(--tone-neutral-border)] bg-[var(--tone-neutral-bg)] text-[var(--tone-neutral-fg)]",
  "border-[var(--tone-info-border)] bg-[var(--tone-info-bg)] text-[var(--tone-info-fg)]",
  "border-[var(--tone-success-border)] bg-[var(--tone-success-bg)] text-[var(--tone-success-fg)]",
  "border-[var(--tone-warning-border)] bg-[var(--tone-warning-bg)] text-[var(--tone-warning-fg)]",
  "border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)]",
] as const;

// ── Surfaces ──

// The one card shape: a hairline box on white, optionally accent-tinted when it
// is the thing you're looking at, optionally interactive.
export function cardClass({ selected = false, interactive = false }: { selected?: boolean; interactive?: boolean } = {}) {
  return cn(
    "rounded-[10px] border",
    selected ? "border-[var(--accent-border)] bg-[var(--accent-soft)]" : "border-[var(--border-default)] bg-[var(--surface)]",
    interactive && !selected && "transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]",
  );
}

// ── Text ──

// Section heading inside a panel, with an optional right-aligned hint.
export function SectionHeading({ title, hint, children }: { title: string; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="font-display text-[18px] leading-tight text-[var(--text-primary)]">{title}</h3>
      {hint ? <span className="shrink-0 text-[12px] text-[var(--text-muted)]">{hint}</span> : null}
      {children}
    </div>
  );
}

// `label · value` pair — the product's way of showing metadata inline instead of
// a grid of uppercase captions.
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px]">
      <span className="shrink-0 text-[var(--text-label)]">{label}</span>
      <span className="shrink-0 text-[var(--text-muted)]">·</span>
      <span className="min-w-0 truncate text-[var(--text-primary)]">{children}</span>
    </span>
  );
}

// ── Progress ──

// A ring for "n of m" — used wherever progress is a glance rather than a bar.
export function ProgressRing({
  ratio,
  size = 22,
  stroke = 2.5,
  complete = false,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  complete?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, ratio));
  const colour = complete || clamped >= 1 ? "var(--status-success)" : "var(--accent)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-strong)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </svg>
  );
}

// A thin track — phase progress, completion meters.
export function ProgressBar({ ratio, complete = false, className }: { ratio: number; complete?: boolean; className?: string }) {
  return (
    <span className={cn("block h-[3px] overflow-hidden rounded-full bg-[var(--surface-strong)]", className)}>
      <span
        className="block h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`,
          background: complete || ratio >= 1 ? "var(--status-success)" : "var(--accent)",
        }}
      />
    </span>
  );
}

// ── Lifecycle nodes ──
// The node used by every stage rail in the product (the overview's lifecycle,
// the record's stage-path menu): a tick when done, filled when current, hollow
// with its number when it's still ahead.

export function StageNode({
  state,
  index,
  size = 20,
}: {
  state: "complete" | "active" | "upcoming";
  // 1-based position, shown while the stage is still ahead.
  index?: number;
  size?: number;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums ring-2 ring-[var(--surface)]",
        state === "complete"
          ? "bg-[var(--status-success)] text-white"
          : state === "active"
            ? "bg-[var(--accent)] text-white"
            : "border border-[var(--border-input)] bg-[var(--surface)] text-[var(--text-muted)]",
      )}
    >
      {state === "complete" ? (
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : state === "active" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      ) : (
        index
      )}
    </span>
  );
}
