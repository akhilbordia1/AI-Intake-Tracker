"use client";

import { Check, ChevronDown, HelpCircle, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/use-click-outside";

// Shared interactive form kit. Teal accent, warm palette. Every field supports
// inline validation (error ring + message), an optional "why this matters"
// tooltip, and an optional AI "Suggest" button that fills a context draft.

const FOCUS_RING = "focus:border-[#8fc0cf] focus:ring-2 focus:ring-[#e8f4f8]";
const BASE_INPUT = cn(
  "h-9 w-full rounded-[8px] border bg-white px-3 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
  FOCUS_RING,
);

function borderClass(error?: string) {
  return error ? "border-[#e0a892]" : "border-[#e7e5e4]";
}

// ── Field chrome ──────────────────────────────────────────────────────────

export function FieldHeader({
  label,
  required,
  hint,
  onSuggest,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  onSuggest?: () => void;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="text-[12px] font-medium text-[var(--text-primary)]">
        {label}
        {required ? <span className="ml-0.5 text-[#b4471d]">*</span> : null}
      </span>
      {hint ? (
        <span
          title={hint}
          aria-label={hint}
          className="inline-flex cursor-help items-center text-[var(--text-muted)] transition hover:text-[var(--text-label)]"
        >
          <HelpCircle size={13} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1" />
      {onSuggest ? (
        <button
          type="button"
          onClick={onSuggest}
          title="Suggest a draft"
          aria-label="Suggest a draft"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[#e8f4f8] hover:text-[#0c5f7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8f4f8]"
        >
          <Sparkles size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-[11px] leading-4 text-[#b4471d]">{error}</p>;
}

type FieldChrome = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  onSuggest?: () => void;
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
  onSuggest,
}: FieldChrome & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <FieldHeader label={label} required={required} hint={hint} onSuggest={onSuggest} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={cn(BASE_INPUT, borderClass(error))}
      />
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
      <FieldHeader label={label} required={required} hint={hint} onSuggest={onSuggest} />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full resize-none rounded-[8px] border bg-white px-3 py-2.5 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
          FOCUS_RING,
          borderClass(error),
        )}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        <FieldError error={error} />
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
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

  const filtered = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query],
  );

  return (
    <div className="min-w-0">
      <FieldHeader label={label} required={required} hint={hint} />
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
          <div className="absolute left-0 right-0 top-10 z-30 rounded-[8px] border border-[#e7e5e4] bg-white p-1 shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
            <div className="relative mb-1">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search…"
                className={cn("h-8 w-full rounded-[6px] border border-[#e7e5e4] bg-white pl-8 pr-2 text-[12px] text-[var(--text-primary)] outline-none", FOCUS_RING)}
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
                      value === option ? "bg-[#e8f4f8] text-[#0c5f7a]" : "text-[var(--text-body)] hover:bg-[#faf9f6] hover:text-[var(--text-primary)]",
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
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <FieldHeader label={label} required={required} hint={hint} />
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
                "h-9 rounded-[8px] border px-3 text-[13px] font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8f4f8]",
                selected
                  ? "border-[#0e7090] bg-white text-[#0c5f7a] shadow-[inset_0_0_0_1px_#0e7090]"
                  : "border-[#e7e5e4] bg-white text-[var(--text-primary)] hover:border-[#c5e2ea] hover:bg-[#f4fafb]",
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
      <FieldHeader label={label} required={required} hint={hint} />
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
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8f4f8]",
                selected
                  ? "border-[#0e7090] bg-[#0e7090] text-white"
                  : "border-[#e7e5e4] bg-white text-[var(--text-body)] hover:border-[#c5e2ea] hover:bg-[#f4fafb]",
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

export function CurrencyField({
  amount,
  onAmount,
  currency,
  currencies,
  onCurrency,
  suffix,
  label,
  required,
  hint,
  error,
  onSuggest,
  placeholder,
}: FieldChrome & {
  amount: string;
  onAmount: (value: string) => void;
  currency: string;
  currencies: string[];
  onCurrency: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <FieldHeader label={label} required={required} hint={hint} onSuggest={onSuggest} />
      <div className={cn("flex h-9 items-stretch overflow-hidden rounded-[8px] border bg-white transition focus-within:border-[#8fc0cf] focus-within:ring-2 focus-within:ring-[#e8f4f8]", borderClass(error))}>
        <select
          value={currency}
          onChange={(event) => onCurrency(event.target.value)}
          aria-label="Currency"
          className="h-full shrink-0 border-r border-[#e7e5e4] bg-[#faf9f6] pl-2.5 pr-1.5 text-[12px] font-medium text-[var(--text-label)] outline-none"
        >
          {currencies.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] tabular-nums text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {suffix ? <span className="flex h-full shrink-0 items-center pr-3 text-[12px] text-[var(--text-muted)]">{suffix}</span> : null}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ── Date ──────────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  label,
  required,
  hint,
  error,
  onSuggest,
}: FieldChrome & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <FieldHeader label={label} required={required} hint={hint} onSuggest={onSuggest} />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(BASE_INPUT, borderClass(error))}
      />
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
      <div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-[#f0efed]">
        <div
          className={cn("h-full rounded-full transition-all duration-300", complete ? "bg-[#15803d]" : "bg-[#0e7090]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--text-label)]">
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
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0e7090]" />
          Saving…
        </>
      ) : (
        <>
          <Check size={12} className="text-[#15803d]" />
          Saved
        </>
      )}
    </span>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
