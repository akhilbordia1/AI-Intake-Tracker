"use client";

import {
  Activity,
  ArrowUpDown,
  Check,
  Calculator,
  Filter,
  Gavel,
  Hammer,
  Inbox,
  Layers,
  Lightbulb,
  PenTool,
  Rocket,
  ShieldCheck,
  Split,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

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

// Every tone shares the same press and focus behaviour: the lift becomes an
// inset on :active, and the focus ring lives outside the edge rather than
// recolouring it. Only the face changes between tones — and a face is one flat
// colour, no inner highlight.
export function buttonClass(tone: ButtonTone = "secondary", size: ButtonSize = "sm") {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center gap-1.5 rounded-[8px] font-medium outline-none",
    "transition-[background-color,border-color,box-shadow,color,transform] duration-150",
    "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
    "active:translate-y-px active:shadow-[var(--shadow-btn-pressed)]",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0",
    // Sized against the fields they sit beside: a 32px button next to a 40px input
    // read as a control that hadn't finished loading.
    size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-[14px]",
    tone === "primary" &&
      "bg-[var(--accent)] text-white shadow-[var(--shadow-btn-primary)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-btn-primary-hover)]",
    tone === "secondary" &&
      "border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-body)] shadow-[var(--shadow-btn-raised)] hover:border-[var(--border-input)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
    tone === "quiet" && "text-[var(--text-label)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
    tone === "danger" &&
      "border border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)] shadow-[var(--shadow-btn-raised)] hover:border-[var(--tone-danger-fg)] hover:bg-[var(--tone-danger-border)]",
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
        active && tone === "secondary" && "border-[var(--border-input)] bg-[var(--surface-strong)] text-[var(--text-primary)]",
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
        "grid shrink-0 place-items-center rounded-[8px] outline-none transition duration-150",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
        "active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        active
          ? "bg-[var(--surface-strong)] text-[var(--text-primary)]"
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

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "waived";

// Every small tag — priority, gate, lifecycle, stage, the +n overflow — uses this
// geometry. Mixed radii and paddings made a row of chips look ragged.
export const CHIP = "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[6px] px-2 text-[11px] font-medium leading-none";

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
  "border-[var(--tone-waived-border)] bg-[var(--tone-waived-bg)] text-[var(--tone-waived-fg)]",
] as const;

// ── Surfaces ──

// The one card shape: a hairline box on white, optionally accent-tinted when it
// is the thing you're looking at, optionally interactive.
export function cardClass({ selected = false, interactive = false }: { selected?: boolean; interactive?: boolean } = {}) {
  return cn(
    "rounded-[10px] border",
    selected ? "border-[var(--border-default)] bg-[var(--surface-hover)]" : "border-[var(--border-default)] bg-[var(--surface)]",
    interactive && !selected && "transition hover:border-[var(--border-input)] hover:bg-[var(--surface-hover)]",
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

// ── Menus ──
// One shape for every popover list in the product: a rounded surface with a
// hairline and a soft shadow, an optional muted section label, rows with an icon
// on the left and meta on the right, and hairline dividers between groups.

export function MenuSurface({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div
      {...rest}
      className={cn("rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-menu)]", className)}
    >
      {children}
    </div>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-[var(--text-muted)]">{children}</div>;
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-[var(--border-hairline)]" />;
}

export function MenuItem({
  icon,
  meta,
  selected = false,
  className,
  children,
  ...rest
}: {
  // Leading glyph, muted unless the row is selected.
  icon?: ReactNode;
  // Trailing count, shortcut or chevron.
  meta?: ReactNode;
  selected?: boolean;
} & ComponentProps<"button">) {
  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2 text-left text-[13px] transition",
        selected
          ? "bg-[var(--surface-strong)] font-semibold text-[var(--text-primary)]"
          : "font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      {icon ? <span className={cn("shrink-0", selected ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta ? <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{meta}</span> : null}
    </button>
  );
}

// ── Phases ──
// The four lifecycle phases, with the glyph and the tone each one reads in. Shared
// by the registry table and the record's overview so the grouping matches.
export const PHASE_ICONS: Record<string, LucideIcon> = {
  "Intake & Prioritization": Inbox,
  "Governance & Risk": ShieldCheck,
  Delivery: Hammer,
  "Operate & Adopt": Rocket,
};

export const PHASE_TONES: Record<string, Tone> = {
  "Intake & Prioritization": "neutral",
  "Governance & Risk": "warning",
  Delivery: "info",
  "Operate & Adopt": "success",
};

export function PhaseIcon({ phase, size = 14, className, style }: { phase: string; size?: number; className?: string; style?: CSSProperties }) {
  const Glyph = PHASE_ICONS[phase] ?? Layers;
  return <Glyph aria-hidden size={size} className={className} style={style} />;
}

// ── Stage icons ──
// One glyph per lifecycle stage, so a stage is recognisable before its name is
// read — in the stage header, the path menu, the overview table and the board.
export const STAGE_ICONS: Record<string, LucideIcon> = {
  Ideation: Lightbulb,
  Qualification: Filter,
  Prioritisation: ArrowUpDown,
  Triage: Split,
  Assessment: ShieldCheck,
  "Business Case": Calculator,
  GTAC: Gavel,
  "Plan & KPI": Target,
  "Solution blue print": PenTool,
  "Solutionise and Production": Hammer,
  "Monitoring and tracking": Activity,
  Adoption: Users,
};

export function StageIcon({ stage, size = 14, className }: { stage: string; size?: number; className?: string }) {
  const Glyph = STAGE_ICONS[stage] ?? Layers;
  return <Glyph size={size} className={className} aria-hidden />;
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
  // Three distinct shapes, not three colours of the same circle: done is filled
  // and ticked, current is a ring around a dot (something is inside it), ahead is
  // a dashed outline holding its number.
  if (state === "complete") {
    return (
      <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-[var(--status-success)] text-white">
        <Check size={size * 0.55} strokeWidth={3.25} aria-hidden />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span
        style={{ width: size, height: size, borderWidth: Math.max(2, size * 0.11) }}
        className="grid shrink-0 place-items-center rounded-full border-[var(--accent)] bg-[var(--surface)]"
      >
        <span style={{ width: size * 0.3, height: size * 0.3 }} className="rounded-full bg-[var(--accent)]" />
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="font-mono grid shrink-0 place-items-center rounded-full border border-dashed border-[var(--border-input)] bg-[var(--surface)] text-[10px] font-medium text-[var(--text-muted)]"
    >
      {index}
    </span>
  );
}

// ── Overflow ──
// A run of chips that would wrap gets cut to `max` and followed by a `+n` chip
// whose tooltip lists the rest — one line, nothing lost.
export function ChipOverflow({
  items,
  max = 2,
  className,
}: {
  items: { key: string; node: ReactNode; label: string }[];
  max?: number;
  className?: string;
}) {
  const shown = items.slice(0, max);
  const hidden = items.slice(max);
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {shown.map((item) => (
        <span key={item.key} className="shrink-0">
          {item.node}
        </span>
      ))}
      {hidden.length ? (
        <span
          data-tip={hidden.map((item) => item.label).join("\n")}
          className={cn(CHIP, "font-mono bg-[var(--surface-strong)] px-1.5 text-[var(--text-label)]")}
        >
          +{hidden.length}
        </span>
      ) : null}
    </span>
  );
}
