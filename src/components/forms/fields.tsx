"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Minus, Plus, Search, Sparkles } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/use-click-outside";

// Shared interactive form kit. Teal accent, warm palette. Every field supports
// inline validation (error ring + message), an optional "why this matters"
// tooltip, and an optional AI "Suggest" button that fills a context draft.

const FOCUS_RING = "focus:border-[var(--border-input)] focus:ring-2 focus:ring-[var(--accent-soft)]";
const BASE_INPUT = cn(
  "h-9 w-full rounded-[8px] border bg-white px-3 text-[15px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
  FOCUS_RING,
);

function borderClass(error?: string) {
  return error ? "border-[var(--tone-danger-border)]" : "border-[var(--border-default)]";
}

// ── Field chrome ──────────────────────────────────────────────────────────

export function FieldHeader({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="text-[12px] font-medium text-[var(--text-primary)]">
        {label}
        {required ? <span className="ml-0.5 text-[var(--risk-high-fg)]">*</span> : null}
      </span>
      {hint ? (
        <span
          data-tip={hint}
          aria-label={hint}
          className="inline-flex cursor-help items-center text-[var(--text-muted)] transition hover:text-[var(--text-label)]"
        >
          <HelpCircle size={13} />
        </span>
      ) : null}
    </div>
  );
}

// AI-suggest affordance that lives inside a text field, pinned to the right.
function SuggestButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tip="Suggest a draft"
      aria-label="Suggest a draft"
      className={cn(
        "absolute inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]",
        className,
      )}
    >
      <Sparkles size={13} />
    </button>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-[11px] leading-4 text-[var(--risk-high-fg)]">{error}</p>;
}

type FieldChrome = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  onSuggest?: () => void;
  // When true the field renders bare (no top label) — the caller supplies the
  // label externally, e.g. in a left/right row layout.
  hideHeader?: boolean;
};

// ── Text ────────────────────────────────────────────────────────────────

export function SmartText({
  value,
  onChange,
  placeholder,
  label,
  required,
  hint,
  error,
  hideHeader,
  onSuggest,
}: FieldChrome & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={cn(BASE_INPUT, borderClass(error), onSuggest && "pr-9")}
        />
        {onSuggest ? <SuggestButton onClick={onSuggest} className="right-1.5 top-1/2 -translate-y-1/2" /> : null}
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  label,
  required,
  hint,
  error,
  hideHeader,
  onSuggest,
  rows = 3,
  maxLength,
}: FieldChrome & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="relative">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full resize-none rounded-[8px] border bg-white py-2.5 pl-3 text-[15px] leading-[1.6] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
            FOCUS_RING,
            borderClass(error),
            onSuggest ? "pr-10" : "pr-3",
          )}
        />
        {onSuggest ? <SuggestButton onClick={onSuggest} className="right-2 top-2" /> : null}
      </div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <FieldError error={error} />
        <span className="ml-auto shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
          {value.length}
          {maxLength ? ` / ${maxLength}` : ""}
        </span>
      </div>
    </div>
  );
}

// ── Searchable select (combobox) ──────────────────────────────────────────

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  const filtered = useMemo(() => options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);

  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setQuery("");
          }}
          className={cn(BASE_INPUT, borderClass(error), "flex items-center justify-between gap-3 text-left", value ? "" : "text-[var(--text-muted)]")}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown size={14} className={cn("shrink-0 text-[var(--text-muted)] transition", open && "rotate-180")} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-10 z-30 rounded-[8px] border border-[var(--border-default)] bg-white p-1 shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
            <div className="relative mb-1">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search…"
                className={cn(
                  "h-8 w-full rounded-[6px] border border-[var(--border-default)] bg-white pl-8 pr-2 text-[12px] text-[var(--text-primary)] outline-none",
                  FOCUS_RING,
                )}
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-2.5 py-2 text-[12px] text-[var(--text-muted)]">No matches</div>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-8 w-full items-center justify-between gap-2 rounded-[6px] px-2.5 text-left text-[12px] font-medium transition",
                      value === option
                        ? "bg-[var(--surface-hover)] text-[var(--accent-strong)]"
                        : "text-[var(--text-body)] hover:bg-[var(--shell-canvas)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <span className="truncate">{option}</span>
                    {value === option ? <Check size={14} className="shrink-0" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Segmented pill choices ────────────────────────────────────────────────

export function Segmented({
  value,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={cn(
                "h-9 rounded-[8px] border px-3 text-[15px] font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]",
                selected
                  ? "border-[var(--accent)] bg-white text-[var(--accent-strong)] shadow-[inset_0_0_0_1px_var(--accent)]"
                  : "border-[var(--border-default)] bg-white text-[var(--text-primary)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Segmented toggle (connected iOS-style single-select) ────────────────────

export function SegmentedToggle({
  value,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div
        className="inline-flex flex-wrap gap-1 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-muted)] p-1"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]",
                selected
                  ? "bg-white text-[var(--text-primary)] shadow-[0_1px_2px_rgba(12,10,9,0.12)]"
                  : "text-[var(--text-label)] hover:text-[var(--text-primary)]",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Chip multi-select ─────────────────────────────────────────────────────

export function ChipMultiSelect({
  values,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  }

  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {selected ? <Check size={13} /> : null}
              {option}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Tag select (single-select pills) ───────────────────────────────────────
// The same pill row as the multi-select, but only one can be on — for fields
// whose value reads as a tag in the record (a status, a tier, a verdict), so
// the control and the read view are the same shape.

export function ChipSelect({
  value,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {selected ? <Check size={13} /> : null}
              {option}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Currency ──────────────────────────────────────────────────────────────

// Adjust the numeric part of an amount string (keeping a k/m unit + any
// trailing text like "/yr - locked") by delta currency units.
function stepAmount(amount: string, delta: number): string {
  const match = /^(\s*)(-?[\d,]*\.?\d+)\s*(k|m)?(.*)$/i.exec(amount.trim());
  if (!match) return String(Math.max(0, delta));
  const [, , numStr, unit, rest] = match;
  const lower = unit?.toLowerCase();
  const mult = lower === "m" ? 1_000_000 : lower === "k" ? 1_000 : 1;
  const next = Math.max(0, parseFloat(numStr.replace(/,/g, "")) * mult + delta);
  const scaled = next / mult;
  const out = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, "");
  return `${out}${unit ?? ""}${rest}`;
}

// The currency sits inside the field, and picking it uses the product's own menu —
// a native <select> renders the operating system's picker, which looks like it
// belongs to another application.
function CurrencyPicker({ currency, currencies, onCurrency }: { currency: string; currencies: string[]; onCurrency: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // The menu is portalled, so it isn't inside the wrapper — dismissal has to know
  // about both, or picking an option would close the menu before the click landed.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Portalled and positioned from the trigger's box: the form scrolls inside a
  // panel that clips its overflow, so an absolute menu loses its lower half.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 104;
    const height = currencies.length * 32 + 8;
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    const below = rect.bottom + 4;
    setCoords({ top: below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : below, left: Math.max(8, left) });
  }, [open, currencies.length]);

  return (
    <div ref={wrapRef} className="relative shrink-0 rounded-l-[7px] border-r border-[var(--border-default)] bg-[var(--shell-canvas)]">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Currency"
        className="flex h-full items-center gap-1.5 rounded-l-[7px] pl-3 pr-2.5 text-[12px] font-medium text-[var(--text-label)] outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
      >
        {currency}
        <ChevronDown size={13} className={cn("text-[var(--text-muted)] transition", open && "rotate-180")} />
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              role="listbox"
              aria-label="Currency"
              style={{ position: "fixed", top: coords.top, left: coords.left }}
              className="z-[60] w-[104px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] p-1 shadow-[var(--shadow-menu)]"
            >
              {currencies.map((code) => {
                const selected = code === currency;
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onCurrency(code);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-8 w-full items-center justify-between gap-2 rounded-[6px] px-2.5 text-left text-[13px] font-medium transition",
                      selected ? "bg-[var(--surface-strong)] text-[var(--text-primary)]" : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
                    )}
                  >
                    {code}
                    {selected ? <Check size={13} className="text-[var(--accent)]" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function CurrencyField({
  amount,
  onAmount,
  currency,
  currencies,
  onCurrency,
  suffix,
  stepBy,
  label,
  required,
  hint,
  error,
  hideHeader,
  placeholder,
}: FieldChrome & {
  amount: string;
  onAmount: (value: string) => void;
  currency: string;
  currencies: string[];
  onCurrency: (value: string) => void;
  suffix?: string;
  stepBy?: number;
  placeholder?: string;
}) {
  const stepLabel = stepBy && stepBy >= 1_000_000 ? `${stepBy / 1_000_000}M` : stepBy && stepBy >= 1_000 ? `${stepBy / 1_000}K` : String(stepBy);

  return (
    <div className="group min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div
        className={cn(
          "flex h-9 max-w-[360px] items-stretch rounded-[8px] border bg-white transition focus-within:border-[var(--border-input)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]",
          borderClass(error),
        )}
      >
        <CurrencyPicker currency={currency} currencies={currencies} onCurrency={onCurrency} />
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {suffix ? <span className="flex h-full shrink-0 items-center pr-3 text-[12px] text-[var(--text-muted)]">{suffix}</span> : null}
        {stepBy ? (
          <div className="hidden shrink-0 items-stretch group-focus-within:flex">
            <button
              type="button"
              aria-label={`Decrease by ${stepBy.toLocaleString()}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAmount(stepAmount(amount, -stepBy))}
              className="flex items-center gap-0.5 border-l border-[var(--border-default)] px-2 font-mono text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
              <Minus size={11} />
              {stepLabel}
            </button>
            <button
              type="button"
              aria-label={`Increase by ${stepBy.toLocaleString()}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAmount(stepAmount(amount, stepBy))}
              className="flex items-center gap-0.5 border-l border-[var(--border-default)] px-2 font-mono text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
              <Plus size={11} />
              {stepLabel}
            </button>
          </div>
        ) : null}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Date ──────────────────────────────────────────────────────────────────

// ── Custom date picker (themed calendar popover, no native control) ─────────

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISODate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

function formatDisplayDate(iso: string) {
  const parsed = parseISODate(iso);
  return parsed ? `${parsed.day} ${MONTH_SHORT[parsed.month]} ${parsed.year}` : "";
}

export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const parsed = parseISODate(value);
  const now = new Date();
  const todayISO = toISODate(now.getFullYear(), now.getMonth(), now.getDate());
  const [view, setView] = useState(() => (parsed ? { year: parsed.year, month: parsed.month } : { year: now.getFullYear(), month: now.getMonth() }));

  // Position the popover with fixed coords so it escapes any scroll/overflow
  // clipping, and flips up / shifts left when it would run off-screen.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 268;
    const height = 350;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    setCoords({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  function shiftMonth(delta: number) {
    setView((current) => {
      const total = current.year * 12 + current.month + delta;
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
    });
  }

  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="w-full max-w-[220px]">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(BASE_INPUT, borderClass(error), "flex items-center justify-between gap-2 text-left", value ? "" : "text-[var(--text-muted)]")}
        >
          <span>{formatDisplayDate(value) || placeholder}</span>
          <CalendarDays size={15} className="shrink-0 text-[var(--text-muted)]" />
        </button>
      </div>
      <FieldError error={error} />

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              style={{ position: "fixed", top: coords.top, left: coords.left }}
              className="z-[60] w-[268px] rounded-[10px] border border-[var(--border-default)] bg-white p-3 shadow-[var(--shadow-menu)]"
              role="dialog"
              aria-label="Choose date"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {MONTH_FULL[view.month]} {view.year}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                    className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                    className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAY_LABELS.map((weekday, index) => (
                  <div key={index} className="grid h-7 place-items-center text-[11px] font-medium text-[var(--text-muted)]">
                    {weekday}
                  </div>
                ))}
                {cells.map((day, index) => {
                  if (day === null) return <div key={index} />;
                  const iso = toISODate(view.year, view.month, day);
                  const selected = iso === value;
                  const isToday = iso === todayISO;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={cn(
                        "grid h-8 place-items-center rounded-[6px] font-mono text-[13px] transition",
                        selected
                          ? "bg-[var(--accent)] font-semibold text-white"
                          : isToday
                            ? "font-semibold text-[var(--accent-strong)] ring-1 ring-inset ring-[var(--accent-border)]"
                            : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[var(--border-hairline)] pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-[12px] font-medium text-[var(--text-label)] transition hover:text-[var(--text-primary)]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayISO);
                    setView({ year: now.getFullYear(), month: now.getMonth() });
                    setOpen(false);
                  }}
                  className="text-[12px] font-medium text-[var(--accent-strong)] transition hover:underline"
                >
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ── Radio group (single-select, radio-button style) ─────────────────────────

export function RadioGroup({
  value,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="flex flex-wrap gap-x-6 gap-y-2.5" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className="group inline-flex items-center gap-2 text-[15px] text-[var(--text-primary)]"
            >
              <span
                className={cn(
                  "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition",
                  selected ? "border-[var(--accent)]" : "border-[var(--border-input)] group-hover:border-[var(--accent-border)]",
                )}
              >
                {selected ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /> : null}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Rating stepper (N/M scales) ─────────────────────────────────────────────

export function RatingStepper({
  value,
  max = 5,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  max?: number;
  onChange: (value: string) => void;
}) {
  const current = parseInt(value, 10) || 0;

  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          {Array.from({ length: max }, (_, index) => {
            const step = index + 1;
            const filled = step <= current;
            return (
              <Fragment key={step}>
                {index > 0 ? (
                  <span className={cn("h-[2px] w-6 sm:w-9", step <= current ? "bg-[var(--accent)]" : "bg-[var(--border-default)]")} />
                ) : null}
                <button
                  type="button"
                  aria-label={`${step} of ${max}`}
                  aria-pressed={step === current}
                  onClick={() => onChange(`${step}/${max}`)}
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[11px] font-medium transition",
                    filled
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-input)] bg-white text-[var(--text-muted)] hover:border-[var(--accent-border)] hover:text-[var(--text-body)]",
                  )}
                >
                  {step}
                </button>
              </Fragment>
            );
          })}
        </div>
        <span className="font-mono text-[14px] font-medium text-[var(--text-primary)]">{current ? `${current}/${max}` : ""}</span>
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Level slider (ordinal option scales, e.g. Low / Medium / High) ──────────

export function LevelSlider({
  value,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const selected = options.indexOf(value);
  const count = options.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function pickFromX(clientX: number) {
    const track = trackRef.current;
    if (!track || count < 2) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (count - 1));
    if (options[index] !== value) onChange(options[index]);
  }

  const pos = selected >= 0 ? selected / (count - 1) : 0;

  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      {/* Pulled left by the track's own inset, so the track and the first option
          label start where the field's label does; only the handle overhangs. */}
      <div className="-ml-2.5 max-w-full select-none" style={{ width: count * 92 }}>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={selected >= 0 ? selected : 0}
          aria-valuetext={value || undefined}
          aria-label={label}
          onKeyDown={(event) => {
            if (selected < 0) return;
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              if (selected < count - 1) onChange(options[selected + 1]);
            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              if (selected > 0) onChange(options[selected - 1]);
            }
          }}
          className="relative flex h-6 cursor-pointer touch-none items-center px-2.5"
          onPointerDown={(event) => {
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            pickFromX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (dragging) pickFromX(event.clientX);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <span className="absolute inset-x-2.5 h-[4px] rounded-full bg-[var(--border-default)]" />
          {selected > 0 ? (
            <span className="absolute left-2.5 h-[4px] rounded-full bg-[var(--accent)]" style={{ width: `calc((100% - 20px) * ${pos})` }} />
          ) : null}
          {options.map((_, index) => (
            <span
              key={index}
              className={cn(
                "absolute h-2 w-2 -translate-x-1/2 rounded-full",
                selected >= 0 && index <= selected ? "bg-[var(--accent)]" : "bg-[var(--border-input)]",
              )}
              style={{ left: `calc(10px + (100% - 20px) * ${index / (count - 1)})` }}
            />
          ))}
          {selected >= 0 ? (
            <span
              className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-[var(--accent)] bg-white shadow-[0_1px_3px_rgba(12,10,9,0.18)]"
              style={{ left: `calc(10px + (100% - 20px) * ${pos})` }}
            />
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between px-2.5">
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "text-[12px] transition",
                index === 0 ? "text-left" : index === count - 1 ? "text-right" : "text-center",
                index === selected ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-body)]",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Card multi-select (selectable tiles) ────────────────────────────────────

export function CardMultiSelect({
  values,
  options,
  onChange,
  label,
  required,
  hint,
  error,
  hideHeader,
}: FieldChrome & {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  }

  return (
    <div className="min-w-0">
      {hideHeader ? null : <FieldHeader label={label} required={required} hint={hint} />}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const on = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(option)}
              className={cn(
                "relative rounded-[10px] border p-3 pr-9 text-left text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                on
                  ? "border-[var(--border-default)] bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {option}
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {on ? (
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--accent)] text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="block h-[18px] w-[18px] rounded-[6px] border-[1.5px] border-[var(--border-input)]" />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Completion meter ──────────────────────────────────────────────────────

export function CompletionMeter({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total && total > 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-[var(--surface-strong)]">
        <div
          className={cn("h-full rounded-full transition-all duration-300", complete ? "bg-[var(--tone-success-fg)]" : "bg-[var(--accent)]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-[11px] font-medium text-[var(--text-label)]">
        {done}/{total} complete
      </span>
    </div>
  );
}

// ── Autosave status ───────────────────────────────────────────────────────

export type SaveState = "idle" | "saving" | "saved";

export function useSaveStatus(watched: string): SaveState {
  const [state, setState] = useState<SaveState>("idle");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const timer = setTimeout(() => setState("saved"), 650);
    return () => clearTimeout(timer);
  }, [watched]);

  return state;
}

export function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
      {state === "saving" ? (
        <>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
          Saving…
        </>
      ) : (
        <>
          <Check size={12} className="text-[var(--tone-success-fg)]" />
          Saved
        </>
      )}
    </span>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
