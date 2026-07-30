"use client";

import Link from "next/link";
import { ChevronDown, Columns3, Plus, SlidersHorizontal, Table2 } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  AppShell,
  AppTopBar,
  ContentPanel,
  PanelTabs,
  RailHeader,
  shellButton,
  useRailMode,
} from "@/components/app-shell";
import { MiniChatRail } from "@/components/chat/mini-chat-rail";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { SHORT_STAGE_LABELS, STAGE_GROUPS, STAGES, SUBSTAGE_TO_GROUP } from "@/data/lifecycle";
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

// The tracker rail's responder: answers the starter questions (and anything with
// the same keywords) straight from the registry rather than a canned line.
// ai-upgrade: swap the keyword matching for a real model call.
function answerAboutPortfolio(question: string, person: string): string | undefined {
  const asked = question.toLowerCase();
  const list = (cards: UseCaseCard[], describe: (card: UseCaseCard) => string) =>
    cards.map((card) => `• ${card.id} ${card.title} — ${describe(card)}`).join("\n");

  if (/attention|mine|my |waiting on me|urgent/.test(asked)) {
    const mine = useCases.filter((card) => card.needsAttention && card.actionOwner === person);
    const others = useCases.filter((card) => card.needsAttention && card.actionOwner !== person);
    if (mine.length) {
      return `${mine.length === 1 ? "One use case needs" : `${mine.length} use cases need`} ${person}:\n\n${list(
        mine,
        (card) => `${card.attentionTask ?? "review"}${card.pendingFor ? `, waiting ${card.pendingFor}` : ""}`,
      )}`;
    }
    return others.length
      ? `Nothing is waiting on ${person}. Elsewhere, ${others.length} use ${others.length === 1 ? "case needs" : "cases need"} attention:\n\n${list(others, (card) => `${card.attentionTask ?? "review"} (${card.actionOwner})`)}`
      : `Nothing needs attention right now.`;
  }

  if (/blocked|stuck|on hold|rejected/.test(asked)) {
    const stalled = useCases.filter(
      (card) => card.lifecycle === "On hold" || card.lifecycle === "Rejected" || card.gate?.status === "Blocked" || card.gate?.status === "Rejected",
    );
    return stalled.length
      ? `${stalled.length} ${stalled.length === 1 ? "use case is" : "use cases are"} not moving:\n\n${list(
          stalled,
          (card) => `${card.lifecycle === "Active" ? `gate ${card.gate?.id} ${card.gate?.status.toLowerCase()}` : card.lifecycle.toLowerCase()} at ${shortStageLabel(card.substage)}`,
        )}`
      : "Nothing is blocked — every use case is moving.";
  }

  if (/gtac|board|funding|invest/.test(asked)) {
    const atBoard = useCases.filter((card) => card.substage === "GTAC" || card.stage === "GTAC" || card.dueGroup === "Funded");
    return atBoard.length
      ? `At or past the GTAC board:\n\n${list(atBoard, (card) => `${shortStageLabel(card.substage)} · ${card.dueGroup === "Funded" ? "funded" : `owner ${card.owner}`}`)}`
      : "Nothing is at the GTAC board right now.";
  }

  return undefined;
}

type BoardColumn = {
  title: string;
  cards: UseCaseCard[];
};

// What each lifecycle stage is *for* on the tracker (the record's own one-liners
// are in STAGE_INTROS); owners come from the lifecycle data, not a second copy.
const STAGE_DESC: Record<string, string> = {
  Ideation: "Submit the intake form; the AI registry is updated.",
  Qualification: "Basic validation to filter non-viable ideas by risk & readiness.",
  Prioritisation: "Score value & readiness; prioritize within the function.",
  Triage: "Determine the scope of the detailed assessments.",
  "Assessment - Risk & Compliance": "Complete the required risk & compliance assessments.",
  "Business Case": "Review the business case; prioritize it for GTAC.",
  GTAC: "Approve or reject the business case; allocate investment.",
  "Plan & KPI": "Confirm delivery model, resourcing, roadmap, and KPIs.",
  "Solution blue print": "Translate business needs into a solution blueprint.",
  "Solutionise and Production": "Build, validate, and release the AI solution.",
  "Monitoring and tracking": "Track business KPIs and risks in production.",
  Adoption: "Drive adoption through training & change management.",
};

const stageOwner = (stageName: string) => STAGES.find((stage) => stage.name === stageName)?.owner;

const shortStageLabel = (stageName: string) => {
  const index = STAGES.findIndex((stage) => stage.name === stageName);
  return index >= 0 ? SHORT_STAGE_LABELS[index] : stageName;
};

const useCases: UseCaseCard[] = [
  {
    id: "UC-138",
    title: "Finance Policy Summarizer",
    description: "Summarizes finance policy updates for regional ops teams.",
    owner: "Aarav Mehta",
    due: "Submitted",
    stage: "Intake",
    substage: "Ideation",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "Nisha Patel",
    needsAttention: true,
    attentionTask: "Review intake submission",
    pendingFor: "3 days",
    lifecycle: "Active",
    href: "/overview",
  },
  {
    id: "UC-141",
    title: "Sales Call Insight Assistant",
    description: "Turns sales call notes into follow-up actions and CRM fields.",
    owner: "Mira Kapoor",
    due: "Submitted",
    stage: "Intake",
    substage: "Ideation",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "Mira Kapoor",
    needsAttention: false,
    lifecycle: "Active",
    href: "/overview",
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
    href: "/overview",
  },
  {
    id: "UC-146",
    title: "Procurement Clause Checker",
    description: "Flags missing clauses in supplier contracts before approval.",
    owner: "Nisha Patel",
    due: "7 Jul 2026",
    stage: "Screening",
    substage: "Qualification",
    priority: "Medium",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: false,
    gate: { id: "R1", status: "Pending" },
    lifecycle: "Active",
    href: "/overview",
  },
  {
    id: "UC-147",
    title: "HR Benefits Advisor",
    description: "Answers employee benefits questions from approved policy content.",
    owner: "Nisha Patel",
    due: "8 Jul 2026",
    stage: "Screening",
    substage: "Prioritisation",
    priority: "Medium",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: false,
    lifecycle: "Active",
    href: "/overview",
  },
  {
    id: "UC-128",
    title: "Customer Churn Signal Model",
    description: "Scores customer churn risk for account planning discussions.",
    owner: "Rohan Desai",
    due: "10 Jul 2026",
    stage: "Governance review",
    substage: "Assessment - Risk & Compliance",
    priority: "High",
    orgPriority: "High",
    dueGroup: "This week",
    actionOwner: "Rohan Desai",
    needsAttention: false,
    gate: { id: "R2", status: "In review" },
    lifecycle: "Active",
    href: "/overview",
  },
  {
    id: "UC-132",
    title: "Invoice Exception Classifier",
    description: "Classifies invoice exceptions for accounts payable routing.",
    owner: "Elena Weber",
    due: "12 Jul 2026",
    stage: "Governance review",
    substage: "Business Case",
    priority: "Medium",
    orgPriority: "Medium",
    dueGroup: "Next week",
    actionOwner: "Elena Weber",
    needsAttention: false,
    gate: { id: "R2", status: "Blocked" },
    lifecycle: "On hold",
    href: "/overview",
  },
  {
    id: "UC-119",
    title: "Service Desk Knowledge Retrieval",
    description: "Retrieves approved knowledge articles for service desk agents.",
    owner: "Priya Rao",
    due: "16 Jul 2026",
    stage: "Planning",
    substage: "Solution blue print",
    priority: "Medium",
    orgPriority: "Low",
    dueGroup: "Next week",
    actionOwner: "Priya Rao",
    needsAttention: false,
    gate: { id: "R2", status: "Passed" },
    lifecycle: "Active",
    href: "/overview",
  },
  {
    id: "UC-125",
    title: "Demand Forecast Explainer",
    description: "Explains forecast movements for weekly supply planning.",
    owner: "Priya Rao",
    due: "18 Jul 2026",
    stage: "Planning",
    substage: "Plan & KPI",
    priority: "Medium",
    orgPriority: "Medium",
    dueGroup: "Next week",
    actionOwner: "Priya Rao",
    needsAttention: false,
    gate: { id: "R2", status: "Passed" },
    lifecycle: "Active",
    href: "/overview",
  },
  {
    id: "UC-103",
    title: "Marketing Asset Tagger",
    description: "Suggests campaign metadata for approved marketing assets.",
    owner: "Daniel Cho",
    coOwner: "Priya Rao",
    due: "Funded",
    stage: "Approved",
    substage: "Monitoring and tracking",
    priority: "Low",
    orgPriority: "Low",
    dueGroup: "Funded",
    actionOwner: "Daniel Cho",
    needsAttention: false,
    gate: { id: "R4", status: "Passed" },
    lifecycle: "Live",
    href: "/overview",
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
    href: "/overview",
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
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
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
    <AppShell
      topBar={
        <AppTopBar
          title="AI Intake Tracker"
          search={{ value: search, onChange: setSearch, placeholder: "Search use cases…" }}
          profile={<ProfileSwitcher currentUser={activeProfile} onUserChange={setActiveProfile} compact />}
        />
      }
      railExpanded={railMode.expanded}
      railCollapsed={railMode.collapsed}
      railHeader={
        <RailHeader
          scrolled={railScrolled}
          canJumpToTop={railScrolled}
          onJumpToTop={() => railScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          expanded={railMode.expanded}
          onToggleExpand={railMode.toggleExpand}
          collapsed={railMode.collapsed}
          onToggleCollapse={railMode.toggleCollapse}
        />
      }
      tabs={
        <PanelTabs
          activeId={displayMode}
          onSelect={(id) => setDisplayMode(id as DisplayMode)}
          tabs={[
            { id: "board", label: "Board", icon: <Columns3 size={14} /> },
            { id: "table", label: "Table", icon: <Table2 size={14} /> },
          ]}
          right={
            <Link href="/intake" className={shellButton("primary")}>
              <Plus size={14} />
              New use case
            </Link>
          }
        />
      }
      rail={
        <MiniChatRail
          scrollRef={railScrollRef}
          onScrolledChange={setRailScrolled}
          emptyTitle={`Hello, ${activeProfile.split(" ")[0]}`}
          intro={`${useCases.length} use cases are in the registry and ${attentionCount} need attention. Describe an idea and I'll start a new one, or ask me about what's already here.`}
          starterGroups={[
            { label: "Start something", items: ["I want to build an AI assistant for…", "Raise a new use case"] },
            { label: "About the registry", items: ["What needs my attention?", "Which use cases are blocked?", "What's waiting on GTAC?"] },
          ]}
          starters={["What needs my attention?", "Which use cases are blocked?", "What's waiting on GTAC?"]}
          answer={(question) => answerAboutPortfolio(question, activeProfile)}
          newIdeaHref="/intake"
          placeholder="Describe an idea, or ask about the registry"
          reply="I can answer on what needs attention, what's blocked, and what's at the GTAC board — or describe an idea and I'll start a new use case."
        />
      }
    >
      <ContentPanel
        icon={displayMode === "board" ? <Columns3 size={17} /> : <Table2 size={17} />}
        title="Use case pipeline"
        controls={
          <>
            <SlidersHorizontal size={14} className="mr-0.5 hidden text-[var(--text-muted)] lg:block" />
            <ViewDropdown
              activeView={activeView}
              open={viewMenuOpen}
              onOpenChange={setViewMenuOpen}
              onChange={setActiveView}
            />
            <ScopeFilterControl activeScope={scopeFilter} onChange={setScopeFilter} />
            <button
              type="button"
              onClick={() => setAttentionOnly(!attentionOnly)}
              aria-pressed={attentionOnly}
              className={[
                "inline-flex h-8 items-center gap-2 rounded-[8px] border px-2.5 text-[12px] transition",
                attentionOnly
                  ? "border-[var(--accent-ring)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--accent-strong)]",
              ].join(" ")}
            >
              Needs my attention
              <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--accent-strong)]">
                {attentionCount}
              </span>
            </button>
          </>
        }
        scroll={false}
        footer={
          <span className="ml-auto text-[12px] tabular-nums text-[var(--text-muted)]">
            {filteredUseCases.length} {filteredUseCases.length === 1 ? "result" : "results"}
          </span>
        }
      >
        {displayMode === "board" ? (
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-x-auto px-4">
              <div
                className="grid h-full min-h-[540px] gap-5 pr-1"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(330px, 1fr))`,
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
      </ContentPanel>
    </AppShell>
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
      <FilterTrigger label="Scope" value={activeLabel} open={open} onClick={() => setOpen(!open)} />

      {open ? (
        <div className="absolute right-0 top-9 z-30 w-max min-w-full rounded-[8px] border border-[var(--border-default)] bg-white p-1 shadow-[var(--shadow-menu)]">
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
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "text-[var(--text-body)] hover:bg-[var(--shell-canvas)] hover:text-[var(--text-primary)]",
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

// One shape for both filter controls: a muted label, the current value, and a
// chevron — so grouping and scope read as filters rather than as a breadcrumb.
function FilterTrigger({
  label,
  value,
  open,
  onClick,
}: {
  label: string;
  value: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={open}
      className={[
        "inline-flex h-8 w-fit items-center gap-1.5 rounded-[8px] border bg-white px-2.5 text-[12px] transition",
        open ? "border-[var(--accent-ring)] bg-[var(--accent-hover-bg)]" : "border-[var(--border-default)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]",
      ].join(" ")}
    >
      <span className="whitespace-nowrap text-[var(--text-muted)]">{label}</span>
      <span className="whitespace-nowrap font-medium text-[var(--text-primary)]">{value}</span>
      <ChevronDown size={13} className={["text-[var(--text-muted)] transition", open ? "rotate-180" : ""].join(" ")} />
    </button>
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
      <FilterTrigger label="Group" value={activeLabel} open={open} onClick={() => onOpenChange(!open)} />

      {open ? (
        <div className="absolute right-0 top-9 z-30 w-max min-w-[170px] rounded-[8px] border border-[var(--border-default)] bg-white p-1 shadow-[var(--shadow-menu)]">
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
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "text-[var(--text-body)] hover:bg-[var(--shell-canvas)] hover:text-[var(--text-primary)]",
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
    <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
      {totalRows === 0 ? (
        <div className="grid h-[260px] place-items-center rounded-[8px] border border-[var(--border-default)] bg-white text-[13px] text-[var(--text-label)] shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
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
      <div className="flex items-baseline gap-2 px-1 pb-3 pt-1">
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
      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[30%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[19%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className="bg-white">
              <tr className="border-b border-[var(--border-hairline)] text-left">
                <TableHeader>ID</TableHeader>
                <TableHeader>Use case</TableHeader>
                <TableHeader>Stage</TableHeader>
                <TableHeader>Stage owner</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader align="right">Priority</TableHeader>
                <TableHeader align="right">Due</TableHeader>
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

// The `due` field mixes dates with lifecycle words ("Submitted", "Funded",
// "Rejected 12 Jun 2026"). The Due column shows only the date; the words belong
// to the status column, which already carries the gate and the lifecycle tag.
const DATE_IN_DUE = /(\d{1,2} \w{3} \d{4})/;
const dueDate = (due: string) => DATE_IN_DUE.exec(due)?.[1] ?? null;

function UseCaseTableRow({ row }: { row: UseCaseCard }) {
  const lifecycleTag = LIFECYCLE_TAG[row.lifecycle];
  const due = dueDate(row.due);

  return (
    <tr className="group border-b border-[var(--border-hairline)] transition last:border-b-0 hover:bg-[var(--accent-hover-bg)]">
      <td className="align-middle">
        <TableLink href={row.href} className="pl-5 pr-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{row.id}</span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          <span
            title={row.title}
            className="truncate text-[14px] font-semibold leading-5 text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)]"
          >
            {row.title}
          </span>
          <span className="mt-1 truncate text-[12px] leading-5 text-[var(--text-body)]">{row.description}</span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          {/* One line — the group header above already names the phase. */}
          <span title={row.substage} className="truncate text-[13px] leading-5 text-[var(--text-body)]">
            {shortStageLabel(row.substage)}
          </span>
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
            <span className="min-w-0 truncate text-[13px] leading-5 text-[var(--text-body)]">
              {row.coOwner ? `${formatStageOwner(row)} +1` : formatStageOwner(row)}
            </span>
          </span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {lifecycleTag ? (
              <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", lifecycleTag].join(" ")}>{row.lifecycle}</span>
            ) : null}
            {row.gate ? <GateChip gate={row.gate} /> : null}
            {row.needsAttention ? (
              <span className="inline-flex w-fit items-center rounded-[6px] bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold leading-none text-[var(--accent-strong)]">
                {getAttentionMessage(row)}
              </span>
            ) : null}
            {!lifecycleTag && !row.gate && !row.needsAttention ? (
              <span className="text-[13px] text-[var(--text-muted)]">—</span>
            ) : null}
          </span>
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="px-3" align="right">
          <PriorityCell card={row} />
        </TableLink>
      </td>
      <td className="align-middle">
        <TableLink href={row.href} className="pl-3 pr-5" align="right">
          <span className="truncate text-[13px] leading-5 tabular-nums text-[var(--text-body)]">{due ?? "—"}</span>
        </TableLink>
      </td>
    </tr>
  );
}

function TableHeader({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={[
        "h-10 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] first:pl-5 last:pr-5",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function TableLink({
  children,
  className = "",
  href,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  align?: "left" | "right";
}) {
  return (
    <Link
      href={href}
      // One height for every row, whether or not it carries status chips.
      className={["flex min-h-[64px] min-w-0 flex-col justify-center py-3 outline-none", align === "right" ? "items-end text-right" : "", className].join(" ")}
    >
      {children}
    </Link>
  );
}

const PRIORITY_DOT: Record<Priority, string> = {
  High: "bg-[var(--status-danger)]",
  Medium: "bg-[var(--tone-warning-fg)]",
  Low: "bg-[var(--status-success)]",
};

function PriorityCell({ card }: { card: UseCaseCard }) {
  const effective = card.orgPriority ?? card.priority;
  if (!effective) {
    return <span className="text-[13px] leading-5 text-[var(--text-muted)]">Not set</span>;
  }
  const showFunctional = card.orgPriority && card.priority && card.orgPriority !== card.priority;

  return (
    <span className="min-w-0">
      <span className="flex items-center justify-end gap-1.5 text-[13px] leading-5 text-[var(--text-body)]">
        <span className={["h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[effective]].join(" ")} />
        {effective}
      </span>
      {showFunctional ? (
        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">fn {card.priority}</span>
      ) : null}
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
              className="pointer-events-none z-[80] rounded-[14px] border border-[var(--border-input)] bg-[var(--surface-strong)] p-3 shadow-[0_10px_28px_rgba(12,10,9,0.14)]"
            >
              {members.map((member, index) => {
                const owner = stageOwner(member);
                const desc = STAGE_DESC[member];
                const last = index === members.length - 1;
                return (
                  <div key={member} className="flex gap-3">
                    <div className="flex flex-col items-center pt-[7px]">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] ring-4 ring-[var(--surface-strong)]" />
                      {last ? null : <span className="mt-1 w-px flex-1 bg-[var(--border-input)]" />}
                    </div>
                    <div className="min-w-0 flex-1" style={{ paddingBottom: last ? 0 : 14 }}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold leading-4 text-[var(--text-primary)]">{member}</span>
                        {owner ? (
                          <span className="flex shrink-0 items-center gap-1.5">
                            <PersonAvatar name={owner} size={18} />
                            <span className="text-[11px] font-medium text-[var(--text-body)]">{owner}</span>
                          </span>
                        ) : null}
                      </div>
                      {desc ? <p className="mt-1 text-[11px] leading-[1.35] text-[var(--text-label)]">{desc}</p> : null}
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
    <section className="relative flex h-full min-h-0 flex-col">
      <div
        className={[
          "sticky top-0 z-10 bg-white transition-shadow",
          hasScrolled ? "shadow-[0_6px_10px_-10px_rgba(15,23,42,0.18)]" : "shadow-none",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between gap-2 px-1 pb-3 pt-5">
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
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-14"
        onScroll={(event) => setHasScrolled(event.currentTarget.scrollTop > 0)}
      >
        {column.cards.map((card) => (
          <UseCaseBoardCard key={card.id} card={card} />
        ))}
      </div>
      {/* A card that runs past the bottom of the column dissolves rather than
          being cut in half at rest. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}

// Passed = green, in-review = amber, blocked/rejected = red, pending = neutral.
const GATE_BADGE: Record<GateStatus, string> = {
  Pending: "bg-[var(--surface-strong)] text-[var(--text-muted)]",
  "In review": "bg-[var(--tone-warning-bg)] text-[var(--tone-warning-fg)]",
  Passed: "bg-[var(--tone-success-bg)] text-[var(--tone-success-fg)]",
  Blocked: "bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)]",
  Rejected: "bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)]",
};

// Only surface a lifecycle tag for states a gate chip doesn't already convey.
const LIFECYCLE_TAG: Record<Lifecycle, string | null> = {
  Active: null,
  "On hold": "bg-[var(--tone-warning-bg)] text-[var(--tone-warning-fg)]",
  Rejected: null,
  Live: "bg-[var(--tone-success-bg)] text-[var(--tone-success-fg)]",
};

function GateChip({ gate }: { gate: { id: string; status: GateStatus } }) {
  return (
    <span className={["inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", GATE_BADGE[gate.status]].join(" ")}>
      {gate.id} · {gate.status}
    </span>
  );
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PriorityInline({ card }: { card: UseCaseCard }) {
  const effective = card.orgPriority ?? card.priority;
  if (!effective) return <span className="block text-[12px] font-medium text-[var(--text-muted)]">Not prioritized</span>;
  const showFunctional = card.orgPriority && card.priority && card.orgPriority !== card.priority;

  return (
    <span className="block min-w-0">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-primary)]">
        <span className={["h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[effective]].join(" ")} />
        {effective}
      </span>
      {showFunctional ? (
        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">functional: {card.priority}</span>
      ) : null}
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
      <span className="min-w-0 truncate text-[12px] font-medium text-[var(--text-primary)]">
        {card.coOwner ? `${formatStageOwner(card)} +1` : formatStageOwner(card)}
      </span>
    </div>
  );
}

function UseCaseBoardCard({ card }: { card: UseCaseCard }) {
  const lifecycleTag = LIFECYCLE_TAG[card.lifecycle];

  return (
    <Link href={card.href} className="group block">
      <div className="relative z-10 rounded-[10px] border border-[var(--border-default)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition group-hover:border-[var(--accent-ring)] group-hover:bg-[var(--accent-hover-bg)]">
        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{card.id}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              {lifecycleTag ? (
                <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", lifecycleTag].join(" ")}>
                  {card.lifecycle}
                </span>
              ) : null}
              {card.gate ? <GateChip gate={card.gate} /> : null}
            </div>
          </div>
          <h3 className="mt-2.5 text-[15px] font-semibold leading-[1.35] text-[var(--text-primary)]">{card.title}</h3>
          <p className="mt-2 line-clamp-2 text-[12px] leading-[1.5] text-[var(--text-body)]">{card.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--border-hairline)] px-5 py-4">
          <MetaCell label="Stage">
            {/* The short lifecycle label — the full name doesn't fit a card column. */}
            <span title={card.substage} className="block truncate text-[12px] font-medium text-[var(--text-primary)]">
              {shortStageLabel(card.substage)}
            </span>
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
        <div className="-mt-2 rounded-b-[10px] bg-[var(--accent-soft)] px-5 pb-2.5 pt-4 text-[12px] font-semibold leading-5 text-[var(--accent-strong)] shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition group-hover:bg-[#d3e9f0]">
          {getAttentionMessage(card)}
        </div>
      ) : null}
    </Link>
  );
}
