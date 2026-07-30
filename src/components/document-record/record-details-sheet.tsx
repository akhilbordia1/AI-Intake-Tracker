"use client";

import { ArrowUp, Check, FileText, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PersonAvatar } from "@/components/profile";
import { GATES, GATE_TONE, RECORD_ACTIVITY, RECORD_DETAILS, type Gate } from "@/data/lifecycle";
import { cn } from "@/lib/cn";

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
  moved: <Check size={16} />,
  approved: <ShieldCheck size={16} />,
  updated: <RotateCcw size={16} />,
  recorded: <FileText size={16} />,
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
        {gate.id} · {gate.status}
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
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-soft)] pl-4 pr-2 pt-2.5">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition",
                tab === t.key
                  ? "border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {t.label}
              {t.count != null ? (
                <span
                  className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold tabular-nums"
                  style={
                    tab === t.key
                      ? { background: "color-mix(in srgb, var(--accent) 12%, white)", color: "var(--accent)" }
                      : { background: "var(--surface-muted)", color: "var(--text-muted)" }
                  }
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {tab === "details" ? (
          <dl className="divide-y divide-[var(--border-hairline)]">
            {RECORD_DETAILS.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-6 px-5 py-3">
                <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
                <dd className="text-right text-[14px] font-semibold text-[var(--text-primary)]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {tab === "gates" ? (
          <div className="divide-y divide-[var(--border-hairline)]">
            {GATES.map((gate) => {
              const tone = GATE_TONE[gate.status];
              return (
                <div key={gate.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
                      <span className="text-[var(--accent)]">{gate.id}</span> {gate.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                      <PersonAvatar name={gate.approver} size={18} /> {gate.approver}
                      <span>·</span>
                      {gate.decided ?? "Pending"}
                    </p>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
                    {gate.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
        {tab === "comments" ? (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 divide-y divide-[var(--border-hairline)]">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-3 px-5 py-3">
                  <PersonAvatar name={c.by} size={26} />
                  <div className="min-w-0">
                    <p className="text-[13px]">
                      <span className="font-semibold text-[var(--text-primary)]">{c.by}</span>{" "}
                      <span className="text-[var(--text-muted)]">· {c.when}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-[var(--text-body)]">{c.text}</p>
                  </div>
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
          <div className="divide-y divide-[var(--border-hairline)]">
            {RECORD_ACTIVITY.map((a, i) => (
              <div key={i} className="flex gap-3 px-5 py-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border-soft)] text-[var(--text-muted)]">
                  {ACTIVITY_ICON[a.icon]}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">{a.title}</p>
                  <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{a.when}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
