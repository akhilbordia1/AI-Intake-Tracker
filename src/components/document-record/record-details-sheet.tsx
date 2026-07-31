"use client";

import { ArrowUp, Building2, CalendarDays, Check, FileText, Globe, Layers, RotateCcw, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PersonAvatar } from "@/components/profile";
import { CHIP, titleCaseTag } from "@/components/ui/kit";
import { GATES, GATE_TONE, RECORD_ACTIVITY, RECORD_DETAILS, type Gate } from "@/data/lifecycle";
import { cn } from "@/lib/cn";

// People get an avatar, dates a calendar, the id a mono chip, and the
// organisational fields a neutral chip — a field's kind should be visible without
// reading its label.
const PEOPLE_FIELDS = new Set(["Created by", "Business sponsor"]);
const DATE_FIELDS = new Set(["Created on", "Target go-live"]);
const CHIP_FIELDS: Record<string, { icon: ReactNode; tone: string }> = {
  Department: { icon: <Building2 size={11} />, tone: "bg-[var(--surface-strong)] text-[var(--text-body)]" },
  Function: { icon: <Layers size={11} />, tone: "bg-[var(--surface-strong)] text-[var(--text-body)]" },
  Team: { icon: <Users size={11} />, tone: "bg-[var(--surface-strong)] text-[var(--text-body)]" },
  "Model archetype": { icon: <Sparkles size={11} />, tone: "bg-[var(--accent-soft)] text-[var(--accent-strong)]" },
};

function DetailValue({ label, value }: { label: string; value: string }) {
  if (label === "Use case ID") {
    return <span className={cn(CHIP, "font-mono bg-[var(--accent-soft)] text-[var(--accent-strong)]")}>{value}</span>;
  }
  if (PEOPLE_FIELDS.has(label)) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <PersonAvatar name={value} size={20} />
        <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text-primary)]">{value}</span>
      </span>
    );
  }
  if (DATE_FIELDS.has(label)) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
        <CalendarDays size={12} className="shrink-0 text-[var(--text-muted)]" />
        <span className="font-mono">{value}</span>
      </span>
    );
  }
  if (label === "Country") {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]">
        <Globe size={12} className="shrink-0 text-[var(--text-muted)]" />
        <span className="min-w-0 truncate">{value}</span>
      </span>
    );
  }
  const chip = CHIP_FIELDS[label];
  if (chip) {
    return (
      <span className={cn(CHIP, chip.tone)}>
        {chip.icon}
        {value}
      </span>
    );
  }
  return <span className="block min-w-0 truncate text-[13px] font-medium text-[var(--text-primary)]">{value}</span>;
}

// ── The record's details sheet ──
// The use case's metadata, its gates, its comments and its activity. The same
// panel on every route that shows a record, opened from the Details toggle in the
// tab row.

const RECORD_COMMENTS: { by: string; when: string; text: string }[] = [
  { by: "Lena Osei", when: "2d ago", text: "Flagged one compliance check (GxP/GCP CSV) — tracking to close before build." },
  { by: "Amara J.", when: "5d ago", text: "Business case looks solid; payback under a year. Recommending to GTAC." },
  { by: "Priya N.", when: "1w ago", text: "Intake looks complete — routing to full assessment given GxP relevance." },
];

const ACTIVITY_ICON: Record<(typeof RECORD_ACTIVITY)[number]["icon"], ReactNode> = {
  moved: <Check size={13} strokeWidth={2.5} />,
  approved: <ShieldCheck size={13} />,
  updated: <RotateCcw size={13} />,
  recorded: <FileText size={13} />,
};
export function GateBadge({ gate }: { gate: Gate }) {
  const tone = GATE_TONE[gate.status];
  return (
    <span className="flex items-center gap-2 text-[13px] leading-5">
      <span
        data-tip={`${gate.id} · ${gate.name}`}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
        style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
      >
        <ShieldCheck size={11} />
        <span className="font-mono">{gate.id}</span> · {gate.status}
      </span>
      <span className="hidden items-center gap-1.5 text-[var(--text-label)] lg:flex">
        Approver
        <PersonAvatar name={gate.approver} size={20} />
        <span className="font-medium text-[var(--text-primary)]">{gate.approver}</span>
      </span>
    </span>
  );
}
// Record details modal — the use case's metadata, gates, comments, and activity.
export function RecordDetailsSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"details" | "gates" | "comments" | "activity">("details");
  // ponytail: comment list is local prototype state — no persistence.
  const [comments, setComments] = useState(RECORD_COMMENTS);
  const [draft, setDraft] = useState("");
  const addComment = () => {
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [{ by: "You", when: "just now", text }, ...prev]);
    setDraft("");
  };
  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: "details", label: "Details" },
    { key: "gates", label: "Gates", count: GATES.length },
    { key: "comments", label: "Comments", count: comments.length },
    { key: "activity", label: "Activity", count: RECORD_ACTIVITY.length },
  ];
  return (
    <aside className="sheet-in-right flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] ">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-hairline)] px-3 py-2">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] transition",
                tab === t.key
                  ? "bg-[var(--surface-strong)] font-semibold text-[var(--text-primary)]"
                  : "font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
              )}
            >
              {t.label}
              {t.count != null ? <span className="font-mono text-[11px] font-medium text-[var(--text-muted)]">{t.count}</span> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {tab === "details" ? (
          // Rows carry the side padding, not the list: a divider that stops 16px
          // short of the sheet's edge reads as a box that isn't there.
          <dl className="py-2">
            {RECORD_DETAILS.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[124px_minmax(0,1fr)] items-center gap-4 border-b border-[var(--border-hairline)] px-4 py-3.5 last:border-b-0"
              >
                <dt className="text-[12px] text-[var(--text-muted)]">{label}</dt>
                <dd className="min-w-0">
                  <DetailValue label={label} value={value} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {tab === "gates" ? (
          <div className="py-2">
            {GATES.map((gate) => {
              const tone = GATE_TONE[gate.status];
              return (
                <div key={gate.id} className="flex items-start gap-2.5 border-b border-[var(--border-hairline)] px-4 py-3.5 last:border-b-0">
                  <span className={cn(CHIP, "font-mono mt-px bg-[var(--surface-strong)] text-[var(--text-body)]")}>{gate.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{gate.name}</p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                      <PersonAvatar name={gate.approver} size={20} />
                      <span className="min-w-0 truncate">{gate.approver}</span>
                      {gate.decided ? (
                        <>
                          <span aria-hidden className="h-2.5 w-px shrink-0 bg-[var(--border-default)]" />
                          <span className="font-mono shrink-0">{gate.decided}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className={cn(CHIP, "mt-px")} style={{ color: tone.fg, background: tone.bg }}>
                    {titleCaseTag(gate.status)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
        {tab === "comments" ? (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 py-2">
              {comments.map((c, i) => (
                <div key={i} className="border-b border-[var(--border-hairline)] px-4 py-3.5 last:border-b-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <PersonAvatar name={c.by} size={20} />
                    <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text-primary)]">{c.by}</span>
                    <span className="font-mono ml-auto shrink-0 text-[11px] text-[var(--text-muted)]">{c.when}</span>
                  </div>
                  <p className="mt-1.5 pl-[28px] text-[12px] leading-[1.55] text-[var(--text-body)]">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 flex min-h-[64px] items-center gap-2 border-t border-[var(--border-soft)] bg-white px-4 py-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
                rows={1}
                placeholder="Add a comment…"
                className="no-scrollbar max-h-24 min-h-9 flex-1 resize-none rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={addComment}
                disabled={!draft.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white transition hover:bg-[var(--accent-strong)] disabled:bg-[var(--surface-strong)] disabled:text-[var(--text-muted)]"
                aria-label="Post comment"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : null}
        {tab === "activity" ? (
          <ol className="px-4 pb-2 pt-[22px]">
            {RECORD_ACTIVITY.map((entry, index) => (
              <li key={entry.title} className="relative flex gap-3 pb-6 last:pb-0">
                {/* One line down the timeline, so the entries read as a sequence. */}
                {index === RECORD_ACTIVITY.length - 1 ? null : (
                  <span aria-hidden className="absolute bottom-0 left-[12px] top-7 w-px bg-[var(--border-hairline)]" />
                )}
                <span className="relative mt-px grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full bg-[var(--surface-strong)] text-[var(--text-label)]">
                  {ACTIVITY_ICON[entry.icon]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-[1.45] text-[var(--text-primary)]">{entry.title}</p>
                  <p className="font-mono mt-1 text-[11px] text-[var(--text-muted)]">{entry.when}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </aside>
  );
}
