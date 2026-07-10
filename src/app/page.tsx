"use client";

import Link from "next/link";
import { ChevronDown, Columns3, Plus, Search, Table2 } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { useClickOutside } from "@/lib/use-click-outside";

type ViewKey = "stage" | "people" | "priority" | "due" | "status";
type DisplayMode = "board" | "table";
type ScopeFilter = "my" | "team" | "all";
type Priority = "High" | "Medium" | "Low";
type GateStatus = "Pending" | "In review" | "Passed" | "Blocked" | "Rejected";
type Lifecycle = "Active" | "On hold" | "Rejected" | "Live";

type UseCaseCard = {
  id: string;
  title: string;
  description: string;
  owner: string;
  // Shared-responsibility stages (e.g. adoption) carry a second owner.
  coOwner?: string;
  due: string;
  stage: string;
  // The specific detail-view stage inside the condensed board column.
  substage: string;
  // Functional priority (set by the functional lead). null until prioritized.
  priority: Priority | null;
  // Portfolio priority (set by the core team). Overrides functional once set.
  orgPriority?: Priority;
  dueGroup: "Submitted" | "This week" | "Next week" | "Funded" | "Rejected";
  actionOwner: string;
  needsAttention: boolean;
  attentionTask?: string;
  pendingFor?: string;
  // Assessment gate the use case currently sits at, with its own status.
  gate?: { id: string; status: GateStatus };
  lifecycle: Lifecycle;
  href: string;
};

type BoardColumn = {
  title: string;
  cards: UseCaseCard[];
};

// The four high-level phases of the AI enablement process; each board column
// is one phase, condensing the detail-view stages inside it.
const STAGE_GROUPS: Record<string, string[]> = {
  "Intake & Prioritization": ["Intake", "Screening", "Prioritize", "Triage"],
  "Gov, Risk & Tech Assessments": ["Assess", "Business case", "GTAC"],
  "Agile Solution Delivery": ["Plan", "Design", "Build", "Deploy"],
  "Value Realization": ["Adopt", "Monitor", "Improve"],
};

const SUBSTAGE_TO_GROUP: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_GROUPS).flatMap(([group, subs]) => subs.map((sub) => [sub, group])),
);

// One-liner + assigned person per stage (owners mirror the detail record).
const STAGE_META: Record<string, { owner: string; desc: string }> = {
  Intake: { owner: "Priya N.", desc: "Submit the intake form; the AI registry is updated." },
  Screening: { owner: "Priya N.", desc: "Basic validation to filter non-viable ideas by risk & readiness." },
  Prioritize: { owner: "Marco B.", desc: "Score value & readiness; prioritize within the function." },
  Triage: { owner: "Dana K.", desc: "Determine the scope of the detailed assessments." },
  Assess: { owner: "Lena Osei", desc: "Complete the required assessments; finalize the business case." },
  "Business case": { owner: "Amara J.", desc: "Review the business case; prioritize it for GTAC." },
  GTAC: { owner: "Victor H.", desc: "Approve or reject the business case; allocate investment." },
  Plan: { owner: "Dana K.", desc: "Confirm delivery model, resourcing, roadmap & timeline." },
  Design: { owner: "Noah R.", desc: "Translate business needs into a solution blueprint." },
  Build: { owner: "Noah R.", desc: "Iteratively build and test the AI solution." },
  Deploy: { owner: "Lena Osei", desc: "Release the solution into production." },
  Adopt: { owner: "Marco B.", desc: "Drive adoption through training & change management." },
  Monitor: { owner: "Marco B.", desc: "Track business KPIs and risks in production." },
  Improve: { owner: "Priya N.", desc: "Optimize and scale by expansion." },
};

const useCases: UseCaseCard[] = [
  {
    id: "UC-138",
    title: "Finance Policy Summarizer",
    description: "Summarizes finance policy updates for regional ops teams.",
    owner: "Aarav Mehta",
    due: "Submitted",
    stage: "Intake",
    substage: "Intake",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "Nisha Patel",
    needsAttention: true,
    attentionTask: "Review intake submission",
    pendingFor: "3 days",
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-141",
    title: "Sales Call Insight Assistant",
    description: "Turns sales call notes into follow-up actions and CRM fields.",
    owner: "Mira Kapoor",
    due: "Submitted",
    stage: "Intake",
    substage: "Intake",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "Mira Kapoor",
    needsAttention: false,
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-142",
    title: "Support Ticket Response Agent",
    description: "Drafts support replies with mandatory human review before send.",
    owner: "Nisha Patel",
    due: "6 Jul 2026",
    stage: "Screening",
    substage: "Triage",
    priority: "High",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: true,
    attentionTask: "Complete screening decision",
    pendingFor: "2 days",
    gate: { id: "R1", status: "In review" },
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-146",
    title: "Procurement Clause Checker",
    description: "Flags missing clauses in supplier contracts before approval.",
    owner: "Nisha Patel",
    due: "7 Jul 2026",
    stage: "Screening",
    substage: "Screening",
    priority: "Medium",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: false,
    gate: { id: "R1", status: "Pending" },
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-147",
    title: "HR Benefits Advisor",
    description: "Answers employee benefits questions from approved policy content.",
    owner: "Nisha Patel",
    due: "8 Jul 2026",
    stage: "Screening",
    substage: "Prioritize",
    priority: "Medium",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: false,
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-128",
    title: "Customer Churn Signal Model",
    description: "Scores customer churn risk for account planning discussions.",
    owner: "Rohan Desai",
    due: "10 Jul 2026",
    stage: "Governance review",
    substage: "Assess",
    priority: "High",
    orgPriority: "High",
    dueGroup: "This week",
    actionOwner: "Rohan Desai",
    needsAttention: false,
    gate: { id: "R2", status: "In review" },
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-132",
    title: "Invoice Exception Classifier",
    description: "Classifies invoice exceptions for accounts payable routing.",
    owner: "Elena Weber",
    due: "12 Jul 2026",
    stage: "Governance review",
    substage: "Business case",
    priority: "Medium",
    orgPriority: "Medium",
    dueGroup: "Next week",
    actionOwner: "Elena Weber",
    needsAttention: false,
    gate: { id: "R2", status: "Blocked" },
    lifecycle: "On hold",
    href: "/detail",
  },
  {
    id: "UC-119",
    title: "Service Desk Knowledge Retrieval",
    description: "Retrieves approved knowledge articles for service desk agents.",
    owner: "Priya Rao",
    due: "16 Jul 2026",
    stage: "Planning",
    substage: "Design",
    priority: "Medium",
    orgPriority: "Low",
    dueGroup: "Next week",
    actionOwner: "Priya Rao",
    needsAttention: false,
    gate: { id: "R2", status: "Passed" },
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-125",
    title: "Demand Forecast Explainer",
    description: "Explains forecast movements for weekly supply planning.",
    owner: "Priya Rao",
    due: "18 Jul 2026",
    stage: "Planning",
    substage: "Plan",
    priority: "Medium",
    orgPriority: "Medium",
    dueGroup: "Next week",
    actionOwner: "Priya Rao",
    needsAttention: false,
    gate: { id: "R2", status: "Passed" },
    lifecycle: "Active",
    href: "/detail",
  },
  {
    id: "UC-103",
    title: "Marketing Asset Tagger",
    description: "Suggests campaign metadata for approved marketing assets.",
    owner: "Daniel Cho",
    coOwner: "Priya Rao",
    due: "Funded",
    stage: "Approved",
    substage: "Monitor",
    priority: "Low",
    orgPriority: "Low",
    dueGroup: "Funded",
    actionOwner: "Daniel Cho",
    needsAttention: false,
    gate: { id: "R4", status: "Passed" },
    lifecycle: "Live",
    href: "/detail",
  },
  {
    id: "UC-097",
    title: "Refund Auto-Approval Agent",
    description: "Auto-approves low-value refund requests without human review.",
    owner: "Rohan Desai",
    due: "Rejected 12 Jun 2026",
    stage: "Governance review",
    substage: "GTAC",
    priority: "High",
    orgPriority: "High",
    dueGroup: "Rejected",
    actionOwner: "Rohan Desai",
    needsAttention: false,
    gate: { id: "R2", status: "Rejected" },
    lifecycle: "Rejected",
    href: "/detail",
  },
];

const viewOptions: Array<{ key: ViewKey; label: string }> = [
  { key: "stage", label: "By Stage" },
  { key: "people", label: "By Owner" },
  { key: "priority", label: "By Priority" },
  { key: "due", label: "By Due Date" },
  { key: "status", label: "By Status" },
];

const scopeOptions: Array<{ key: ScopeFilter; label: string }> = [
  { key: "my", label: "My Use Cases" },
  { key: "team", label: "Team Use Cases" },
  { key: "all", label: "All Use Cases" },
];

const currentUser = "Nisha Patel";
const portfolioTeamOwners = new Set(["Mira Kapoor", "Aarav Mehta", "Nisha Patel", "Rohan Desai"]);

function formatStageOwner(card: UseCaseCard) {
  return card.owner === currentUser || card.actionOwner === currentUser ? "(Me)" : card.owner;
}

const viewColumnOrder: Record<ViewKey, string[]> = {
  stage: Object.keys(STAGE_GROUPS),
  people: ["Nisha Patel", "Priya Rao", "Elena Weber", "Rohan Desai", "Mira Kapoor", "Aarav Mehta", "Daniel Cho"],
  priority: ["High", "Medium", "Low", "Not prioritized"],
  due: ["Submitted", "This week", "Next week", "Funded"],
  status: ["Active", "On hold", "Rejected", "Live"],
};

function getGroupValue(card: UseCaseCard, view: ViewKey) {
  if (view === "people") return card.owner;
  // Portfolio priority wins once set; else functional; else not yet prioritized.
  if (view === "priority") return card.orgPriority ?? card.priority ?? "Not prioritized";
  if (view === "due") return card.dueGroup;
  if (view === "status") return card.lifecycle;
  return SUBSTAGE_TO_GROUP[card.substage] ?? card.stage;
}

function buildColumns(view: ViewKey, cards: UseCaseCard[]): BoardColumn[] {
  return viewColumnOrder[view].map((title) => ({
    title,
    cards: cards.filter((card) => getGroupValue(card, view) === title),
  }));
}

function filterUseCasesByScope(cards: UseCaseCard[], scope: ScopeFilter) {
  if (scope === "my") return cards.filter((card) => card.owner === currentUser || card.actionOwner === currentUser);
  if (scope === "team") {
    return cards.filter((card) => portfolioTeamOwners.has(card.owner) || portfolioTeamOwners.has(card.actionOwner));
  }
  return cards;
}

function getAttentionMessage(card: UseCaseCard) {
  return card.attentionTask ?? "Needs attention";
}

export default function HomePage() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("board");
  const [activeView, setActiveView] = useState<ViewKey>("stage");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [activeProfile, setActiveProfile] = useState(currentUser);
  const scopedUseCases = useMemo(() => filterUseCasesByScope(useCases, scopeFilter), [scopeFilter]);
  const attentionCount = useMemo(
    () => scopedUseCases.filter((card) => card.needsAttention).length,
    [scopedUseCases],
  );
  const filteredUseCases = useMemo(() => {
    const visibleUseCases = attentionOnly ? scopedUseCases.filter((card) => card.needsAttention) : scopedUseCases;
    const query = search.trim().toLowerCase();
    if (!query) return visibleUseCases;

    return visibleUseCases.filter((card) =>
      [
        card.id,
        card.title,
        card.description,
        card.owner,
        card.coOwner,
        card.due,
        card.stage,
        card.substage,
        card.priority,
        card.orgPriority,
        card.lifecycle,
        card.gate?.id,
        card.gate?.status,
        card.dueGroup,
        card.actionOwner,
        card.pendingFor,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [attentionOnly, scopedUseCases, search]);
  const columns = useMemo(() => buildColumns(activeView, filteredUseCases), [activeView, filteredUseCases]);

  return (
    <main className="h-screen overflow-hidden bg-[#faf9f6] text-[var(--text-primary)]">
      <div className="flex h-full min-h-0 w-full flex-col px-7 pt-6">
        <header className="-mx-7 flex flex-col gap-5 px-7 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0e7090]">
              Viatris Internal
            </div>
            <h1 className="mt-2 font-display text-[38px] leading-[1.05] text-[var(--text-primary)]">
              AI Intake Tracker
            </h1>
          </div>

          <div className="flex w-fit items-center gap-3">
            <ProfileSwitcher currentUser={activeProfile} onUserChange={setActiveProfile} />
            <Link
              href="/intake"
              className="inline-flex h-9 w-fit items-center gap-2 rounded-[8px] bg-[#0e7090] px-3.5 text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-[#0c5f7a]"
            >
              <Plus size={15} />
              New Use Case
            </Link>
          </div>
        </header>

        <Toolbar
          activeView={activeView}
          attentionCount={attentionCount}
          attentionOnly={attentionOnly}
          displayMode={displayMode}
          scopeFilter={scopeFilter}
          search={search}
          onAttentionOnlyChange={setAttentionOnly}
          onDisplayModeChange={setDisplayMode}
          onScopeFilterChange={setScopeFilter}
          onSearchChange={setSearch}
          onViewChange={setActiveView}
        />

        {displayMode === "board" ? (
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="-mx-7 min-h-0 flex-1 overflow-x-auto px-7">
              <div
                className="grid h-full min-h-[540px] gap-0"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(300px, 1fr))`,
                }}
              >
                {columns.map((column) => (
                  <KanbanColumn key={column.title} column={column} />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <UseCaseTableView columns={columns} totalRows={filteredUseCases.length} />
        )}
      </div>
    </main>
  );
}

function Toolbar({
  activeView,
  attentionCount,
  attentionOnly,
  displayMode,
  scopeFilter,
  search,
  onAttentionOnlyChange,
  onDisplayModeChange,
  onScopeFilterChange,
  onSearchChange,
  onViewChange,
}: {
  activeView: ViewKey;
  attentionCount: number;
  attentionOnly: boolean;
  displayMode: DisplayMode;
  scopeFilter: ScopeFilter;
  search: string;
  onAttentionOnlyChange: (active: boolean) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onScopeFilterChange: (scope: ScopeFilter) => void;
  onSearchChange: (value: string) => void;
  onViewChange: (view: ViewKey) => void;
}) {
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  return (
    <div className="-mx-7 flex min-h-[50px] items-center justify-between gap-4 border-y border-[#f0efed] px-7 py-2.5">
      <div className="flex items-center gap-2">
        <DisplayModeToggle activeMode={displayMode} onChange={onDisplayModeChange} />
        <ScopeFilterControl activeScope={scopeFilter} onChange={onScopeFilterChange} />
        <ViewDropdown
          activeView={activeView}
          open={viewMenuOpen}
          onOpenChange={setViewMenuOpen}
          onChange={onViewChange}
        />
        <button
          type="button"
          onClick={() => onAttentionOnlyChange(!attentionOnly)}
          className={[
            "inline-flex h-8 items-center gap-2 rounded-[8px] border px-3 text-[12px] font-medium transition",
            attentionOnly
              ? "border-[#8fc0cf] bg-[#e8f4f8] text-[#0c5f7a]"
              : "border-[#e7e5e4] bg-white text-[var(--text-body)] hover:border-[#8fc0cf] hover:bg-[#f4fafb] hover:text-[#0c5f7a]",
          ].join(" ")}
        >
          Needs my attention
          <span
            className={[
              "rounded-full bg-[#e8f4f8] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#0c5f7a]",
            ].join(" ")}
          >
            {attentionCount}
          </span>
        </button>
      </div>

      <label className="relative block w-full max-w-[320px]">
        <Search
          aria-hidden
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search use cases"
          className="h-8 w-full rounded-[8px] border border-[#e7e5e4] bg-white pl-8 pr-3 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#8fc0cf] focus:ring-2 focus:ring-[#e8f4f8]"
        />
      </label>
    </div>
  );
}

function ScopeFilterControl({
  activeScope,
  onChange,
}: {
  activeScope: ScopeFilter;
  onChange: (scope: ScopeFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = scopeOptions.find((option) => option.key === activeScope)?.label ?? "All Use Cases";
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 w-fit items-center justify-between gap-2 rounded-[8px] border border-[#e7e5e4] bg-white px-3 text-[12px] font-medium text-[var(--text-primary)] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb]"
      >
        <span className="whitespace-nowrap">{activeLabel}</span>
        <ChevronDown
          size={14}
          className={[
            "text-[var(--text-muted)] transition",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-20 w-max min-w-full rounded-[8px] border border-[#e7e5e4] bg-white p-1 shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          {scopeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onChange(option.key);
                setOpen(false);
              }}
              className={[
                "block h-8 w-full rounded-[6px] px-2.5 text-left text-[12px] font-medium transition",
                activeScope === option.key
                  ? "bg-[#e8f4f8] text-[#0c5f7a]"
                  : "text-[var(--text-body)] hover:bg-[#faf9f6] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DisplayModeToggle({
  activeMode,
  onChange,
}: {
  activeMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[8px] border border-[#e7e5e4] bg-white p-1">
      <button
        type="button"
        aria-label="Board view"
        onClick={() => onChange("board")}
        className={[
          "grid h-6 w-7 place-items-center rounded-[6px] transition",
          activeMode === "board"
            ? "bg-[#e8f4f8] text-[#0c5f7a]"
            : "text-[var(--text-label)] hover:bg-[#faf9f6] hover:text-[var(--text-primary)]",
        ].join(" ")}
      >
        <Columns3 size={14} />
      </button>
      <button
        type="button"
        aria-label="Table view"
        onClick={() => onChange("table")}
        className={[
          "grid h-6 w-7 place-items-center rounded-[6px] transition",
          activeMode === "table"
            ? "bg-[#e8f4f8] text-[#0c5f7a]"
            : "text-[var(--text-label)] hover:bg-[#faf9f6] hover:text-[var(--text-primary)]",
        ].join(" ")}
      >
        <Table2 size={14} />
      </button>
    </div>
  );
}

function ViewDropdown({
  activeView,
  open,
  onOpenChange,
  onChange,
}: {
  activeView: ViewKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (view: ViewKey) => void;
}) {
  const activeLabel = viewOptions.find((option) => option.key === activeView)?.label ?? "By Stage";
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => onOpenChange(false), open);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-8 w-fit items-center justify-between gap-2 rounded-[8px] border border-[#e7e5e4] bg-white px-3 text-[12px] font-medium text-[var(--text-primary)] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb]"
      >
        <span className="whitespace-nowrap">{activeLabel}</span>
        <ChevronDown
          size={14}
          className={[
            "text-[var(--text-muted)] transition",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-20 w-max min-w-full rounded-[8px] border border-[#e7e5e4] bg-white p-1 shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          {viewOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onChange(option.key);
                onOpenChange(false);
              }}
              className={[
                "block h-8 w-full rounded-[6px] px-2.5 text-left text-[12px] font-medium transition",
                activeView === option.key
                  ? "bg-[#e8f4f8] text-[#0c5f7a]"
                  : "text-[var(--text-body)] hover:bg-[#faf9f6] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UseCaseTableView({ columns, totalRows }: { columns: BoardColumn[]; totalRows: number }) {
  const visibleColumns = columns.filter((column) => column.cards.length > 0);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto py-5 pr-2 [scrollbar-gutter:stable]">
      {totalRows === 0 ? (
        <div className="grid h-[260px] place-items-center rounded-[8px] border border-[#e7e5e4] bg-white text-[13px] text-[var(--text-label)] shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
          No use cases match the current search.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleColumns.map((column) => (
            <TableGroupCard key={column.title} column={column} />
          ))}
        </div>
      )}
    </section>
  );
}

function TableGroupCard({ column }: { column: BoardColumn }) {
  const members = STAGE_GROUPS[column.title];
  const groupHint = members && members.length > 1 ? `Includes ${members.join(" → ")}` : undefined;

  return (
    <section>
      <div className="flex items-baseline gap-2 px-[18px] pb-3 pt-1">
        <h2
          title={groupHint}
          className={["text-[15px] font-medium text-[var(--text-primary)]", groupHint ? "cursor-help" : ""].join(" ")}
        >
          {column.title}
        </h2>
        {members && members.length > 1 ? (
          <span title={groupHint} className="cursor-help text-[11px] font-medium text-[var(--text-muted)]">
            {members.join(" · ")}
          </span>
        ) : null}
        <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-[var(--surface-strong)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--text-label)]">
          {column.cards.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-[#e7e5e4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[35%]" />
              <col className="w-[16%]" />
              <col className="w-[17%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-white">
              <tr className="border-b border-[#f0efed] text-left">
                <TableHeader>ID</TableHeader>
                <TableHeader>Use case</TableHeader>
                <TableHeader>Stage</TableHeader>
                <TableHeader>Stage owner</TableHeader>
                <TableHeader>Priority</TableHeader>
                <TableHeader>Due</TableHeader>
              </tr>
            </thead>
            <tbody>
              {column.cards.map((row) => (
                <UseCaseTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UseCaseTableRow({ row }: { row: UseCaseCard }) {
  return (
    <tr className="group border-b border-[#f0efed] transition last:border-b-0 hover:bg-[#f4fafb]">
      <td className="align-middle">
        <TableLink href={row.href} className="pl-5 pr-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0e7090]">
            {row.id}
          </span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          <span className="truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)] transition group-hover:text-[#0c5f7a]">
            {row.title}
          </span>
          <span className="mt-1 flex max-w-[430px] min-w-0 items-center gap-2">
            {row.gate ? <GateChip gate={row.gate} /> : null}
            {row.needsAttention ? (
              <span className="inline-flex w-fit shrink-0 items-center rounded-[6px] bg-[#e8f4f8] px-2 py-1 text-[11px] font-semibold leading-none text-[#0c5f7a]">
                {getAttentionMessage(row)}
              </span>
            ) : null}
            <span className="min-w-0 truncate text-[12px] leading-5 text-[var(--text-body)]">
              {row.description}
            </span>
          </span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          <span className="truncate text-[14px] font-normal leading-5 text-[var(--text-body)]">{row.stage}</span>
          {row.substage !== row.stage ? (
            <span className="mt-0.5 truncate text-[12px] leading-4 text-[var(--text-muted)]">{row.substage}</span>
          ) : null}
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex shrink-0 items-center">
              <PersonAvatar name={row.owner} size={18} />
              {row.coOwner ? (
                <span className="-ml-1.5 rounded-full ring-2 ring-white">
                  <PersonAvatar name={row.coOwner} size={18} />
                </span>
              ) : null}
            </span>
            <span className="truncate text-[14px] font-normal leading-5 text-[var(--text-body)]">
              {row.coOwner ? `${formatStageOwner(row)} +1` : formatStageOwner(row)}
            </span>
          </span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          <PriorityCell card={row} />
        </TableLink>
      </td>
      <TableCell href={row.href} className="pr-5">
        {row.due}
      </TableCell>
    </tr>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="h-10 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] first:pl-5 last:pr-5">
      {children}
    </th>
  );
}

function TableLink({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={["flex min-h-[76px] min-w-0 flex-col justify-center py-3.5 outline-none", className].join(" ")}
    >
      {children}
    </Link>
  );
}

function TableCell({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <td className="align-middle">
      <TableLink href={href} className={["px-3", className].join(" ")}>
        <span className="truncate text-[14px] font-normal leading-5 text-[var(--text-body)]">{children}</span>
      </TableLink>
    </td>
  );
}

const PRIORITY_DOT: Record<Priority, string> = {
  High: "bg-[#dc2626]",
  Medium: "bg-[#d97706]",
  Low: "bg-[#16a34a]",
};

function PriorityCell({ card }: { card: UseCaseCard }) {
  const effective = card.orgPriority ?? card.priority;
  if (!effective) {
    return <span className="text-[13px] font-normal leading-5 text-[var(--text-muted)]">Not prioritized</span>;
  }
  const showFunctional = card.orgPriority && card.priority && card.orgPriority !== card.priority;

  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-normal leading-5 text-[var(--text-body)]">
      <span className={["h-1.5 w-1.5 rounded-full", PRIORITY_DOT[effective]].join(" ")} />
      {effective}
      {showFunctional ? <span className="text-[12px] text-[var(--text-muted)]">(fn {card.priority})</span> : null}
    </span>
  );
}

// Instant, styled hover tooltip listing the detail stages inside a phase.
// Rendered in a portal with fixed position so it never sits behind other
// columns / cards (which each create their own stacking context).
function PhaseStagesHint({ members }: { members: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; w: number } | null>(null);

  function show() {
    const el = ref.current;
    if (!el) return;
    // Match the cards exactly: same left edge and width as a card in the column.
    const column = el.closest("section");
    const card = column?.querySelector("a");
    const rect = (card ?? column ?? el).getBoundingClientRect();
    const w = Math.max(240, Math.round(rect.width));
    const x = Math.max(12, Math.min(rect.left, window.innerWidth - w - 12));
    setCoords({ x, y: el.getBoundingClientRect().bottom + 8, w });
  }

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setCoords(null)}
      className="inline-flex cursor-default items-baseline text-[11px] font-medium text-[var(--text-muted)]"
    >
      · {members.length} stages
      {coords && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{ position: "fixed", left: coords.x, top: coords.y, width: coords.w }}
              className="pointer-events-none z-[80] rounded-[14px] border border-[#d6d3d1] bg-[#eceae7] p-3 shadow-[0_10px_28px_rgba(12,10,9,0.14)]"
            >
              {members.map((member, index) => {
                const meta = STAGE_META[member];
                const last = index === members.length - 1;
                return (
                  <div key={member} className="flex gap-3">
                    <div className="flex flex-col items-center pt-[7px]">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] ring-4 ring-[#eceae7]" />
                      {last ? null : <span className="mt-1 w-px flex-1 bg-[#cbc7c0]" />}
                    </div>
                    <div className="min-w-0 flex-1" style={{ paddingBottom: last ? 0 : 14 }}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold leading-4 text-[var(--text-primary)]">{member}</span>
                        {meta ? (
                          <span className="flex shrink-0 items-center gap-1.5">
                            <PersonAvatar name={meta.owner} size={18} />
                            <span className="text-[11.5px] font-medium text-[var(--text-body)]">{meta.owner}</span>
                          </span>
                        ) : null}
                      </div>
                      {meta ? <p className="mt-1 text-[11.5px] leading-[1.35] text-[var(--text-label)]">{meta.desc}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

function KanbanColumn({ column }: { column: BoardColumn }) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const members = STAGE_GROUPS[column.title];

  return (
    <section className="flex h-full min-h-0 flex-col border-l border-[#f0efed] pl-3 pr-3 first:border-l-0 first:pl-0">
      <div
        className={[
          "-mx-3 sticky top-0 z-10 bg-[#faf9f6] transition-shadow",
          hasScrolled ? "shadow-[0_6px_10px_-10px_rgba(15,23,42,0.18)]" : "shadow-none",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between pb-3 pl-[18px] pr-[18px] pt-6">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-[15px] font-medium text-[var(--text-primary)]">{column.title}</h2>
            {members && members.length > 1 ? <PhaseStagesHint members={members} /> : null}
          </div>
          <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-[var(--surface-strong)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--text-label)]">
            {column.cards.length}
          </span>
        </div>
      </div>

      <div
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-10"
        onScroll={(event) => setHasScrolled(event.currentTarget.scrollTop > 0)}
      >
        {column.cards.map((card) => (
          <UseCaseBoardCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

// Passed = green, in-review = amber, blocked/rejected = red, pending = neutral.
const GATE_BADGE: Record<GateStatus, string> = {
  Pending: "bg-[#f0efed] text-[var(--text-muted)]",
  "In review": "bg-[#f6f0e6] text-[#a15c11]",
  Passed: "bg-[#eef4ee] text-[#15803d]",
  Blocked: "bg-[#f7eaea] text-[#b32020]",
  Rejected: "bg-[#f7eaea] text-[#b32020]",
};

// Only surface a lifecycle tag for states a gate chip doesn't already convey.
const LIFECYCLE_TAG: Record<Lifecycle, string | null> = {
  Active: null,
  "On hold": "bg-[#f6f0e6] text-[#a15c11]",
  Rejected: null,
  Live: "bg-[#eef4ee] text-[#15803d]",
};

function GateChip({ gate }: { gate: { id: string; status: GateStatus } }) {
  return (
    <span className={["inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", GATE_BADGE[gate.status]].join(" ")}>
      {gate.id} · {gate.status}
    </span>
  );
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PriorityInline({ card }: { card: UseCaseCard }) {
  const effective = card.orgPriority ?? card.priority;
  if (!effective) return <span className="text-[12px] font-medium text-[var(--text-muted)]">Not prioritized</span>;
  const showFunctional = card.orgPriority && card.priority && card.orgPriority !== card.priority;

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-primary)]">
      <span className={["h-1.5 w-1.5 rounded-full", PRIORITY_DOT[effective]].join(" ")} />
      {effective}
      {showFunctional ? <span className="text-[11px] font-normal text-[var(--text-muted)]">· fn {card.priority}</span> : null}
    </span>
  );
}

function OwnerInline({ card }: { card: UseCaseCard }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex shrink-0 items-center">
        <PersonAvatar name={card.owner} size={18} />
        {card.coOwner ? (
          <span className="-ml-1.5 rounded-full ring-2 ring-white">
            <PersonAvatar name={card.coOwner} size={18} />
          </span>
        ) : null}
      </div>
      <span className="truncate text-[12px] font-medium text-[var(--text-primary)]">
        {card.coOwner ? `${formatStageOwner(card)} +1` : formatStageOwner(card)}
      </span>
    </div>
  );
}

function UseCaseBoardCard({ card }: { card: UseCaseCard }) {
  const lifecycleTag = LIFECYCLE_TAG[card.lifecycle];

  return (
    <Link href={card.href} className="group block">
      <div className="relative z-10 rounded-[10px] border border-[#e7e5e4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition group-hover:border-[#8fc0cf] group-hover:bg-[#f4fafb]">
        <div className="px-4 pb-3.5 pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0e7090]">{card.id}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              {lifecycleTag ? (
                <span className={["rounded-full px-2 py-0.5 text-[10px] font-semibold", lifecycleTag].join(" ")}>
                  {card.lifecycle}
                </span>
              ) : null}
              {card.gate ? <GateChip gate={card.gate} /> : null}
            </div>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-5 text-[var(--text-primary)]">{card.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[var(--text-body)]">{card.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-[#f0efed] px-4 py-3.5">
          <MetaCell label="Stage">
            <span className="block truncate text-[12px] font-medium text-[var(--text-primary)]">{card.substage}</span>
          </MetaCell>
          <MetaCell label="Priority">
            <PriorityInline card={card} />
          </MetaCell>
          <MetaCell label={card.coOwner ? "Owners" : "Owner"}>
            <OwnerInline card={card} />
          </MetaCell>
          <MetaCell label="Due">
            <span className="block truncate text-[12px] font-medium text-[var(--text-primary)]">{card.due}</span>
          </MetaCell>
        </div>
      </div>
      {card.needsAttention ? (
        <div className="-mt-2 rounded-b-[10px] bg-[#e8f4f8] px-4 pb-2.5 pt-4 text-[12px] font-semibold leading-5 text-[#0c5f7a] shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition group-hover:bg-[#d3e9f0]">
          {getAttentionMessage(card)}
        </div>
      ) : null}
    </Link>
  );
}
