"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, Columns3, Flag, Layers, Search, SlidersHorizontal, Table2 } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { AppShell, ContentPanel, PanelTabs, RailHeader, useRailMode } from "@/components/app-shell";
import { ChatHistoryButton, useChatSessions, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { JumpToTop } from "@/components/chat/chat-ui";
import { MiniChatRail } from "@/components/chat/mini-chat-rail";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { IconButton, titleCaseTag } from "@/components/ui/kit";
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
          (card) =>
            `${card.lifecycle === "Active" ? `gate ${card.gate?.id} ${card.gate?.status.toLowerCase()}` : card.lifecycle.toLowerCase()} at ${shortStageLabel(card.substage)}`,
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

// Earlier conversations on the registry. Hardcoded like the rest of the
// prototype's data; anything the user says is archived alongside them.
const REGISTRY_HISTORY: ChatSession[] = [
  {
    id: "seed-blocked",
    title: "Which use cases are blocked?",
    when: "Yesterday",
    turns: [
      { role: "user", text: "Which use cases are blocked?", time: "4:12 PM" },
      {
        role: "assistant",
        text: "2 use cases are not moving:\n\n• UC-132 Invoice Exception Classifier — gate R2 blocked at Business case\n• UC-097 Refund Auto-Approval Agent — rejected at Business case",
      },
      { role: "user", text: "Who can unblock UC-132?", time: "4:13 PM" },
      { role: "assistant", text: "Elena Weber owns the Business case stage, and R2 is Nisha Patel's decision once the evidence is in." },
    ],
  },
  {
    id: "seed-gtac",
    title: "What's waiting on GTAC?",
    when: "Mon",
    turns: [
      { role: "user", text: "What's waiting on GTAC?", time: "10:02 AM" },
      { role: "assistant", text: "At or past the GTAC board:\n\n• UC-142 Support Ticket Response Agent — Screening · owner Nisha Patel" },
    ],
  },
];

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
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
  // Past conversations, plus whatever the user archives by starting a new one.
  const history = useChatSessions(REGISTRY_HISTORY);
  const liveTurns = useRef<ChatTurn[]>([]);
  const pastSession = history.sessions.find((session) => session.id === history.activeId) ?? null;
  const scopedUseCases = useMemo(() => filterUseCasesByScope(useCases, scopeFilter), [scopeFilter]);
  const attentionCount = useMemo(() => scopedUseCases.filter((card) => card.needsAttention).length, [scopedUseCases]);
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
      railExpanded={railMode.expanded}
      railCollapsed={railMode.collapsed}
      railHeader={
        <RailHeader
          scrolled={railScrolled}
          expanded={railMode.expanded}
          onToggleExpand={railMode.toggleExpand}
          collapsed={railMode.collapsed}
          onToggleCollapse={railMode.toggleCollapse}
          onNewChat={() => history.startNew(liveTurns.current, liveTurns.current[0]?.text ?? "Untitled chat")}
          history={<ChatHistoryButton sessions={history.sessions} activeId={history.activeId} onOpen={history.open} />}
        />
      }
      rail={
        <div className="relative flex min-h-0 flex-1 flex-col">
          <JumpToTop visible={railScrolled} onClick={() => railScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })} />
          <MiniChatRail
            key={history.liveKey}
            past={pastSession ? { session: pastSession, onBack: () => history.open(null) } : undefined}
            onTurnsChange={(turns) => {
              liveTurns.current = turns;
            }}
            scrollRef={railScrollRef}
            onScrolledChange={setRailScrolled}
            emptyTitle={`How can I help, ${activeProfile.split(" ")[0]}?`}
            intro={`${useCases.length} use cases are in the registry and ${attentionCount} need attention. Describe an idea and I'll start a new one, or ask me about what's already here.`}
            starters={[
              { label: "Start a new use case", draft: "I want to build an AI assistant that " },
              "What needs my attention?",
              "Which use cases are blocked?",
            ]}
            answer={(question) => answerAboutPortfolio(question, activeProfile)}
            newIdeaHref="/detail"
            placeholder="Describe an idea, or ask about the registry"
            reply="I can answer on what needs attention, what's blocked, and what's at the GTAC board — or describe an idea and I'll start a new use case."
          />
        </div>
      }
    >
      <ContentPanel
        icon={displayMode === "board" ? <Columns3 size={17} /> : <Table2 size={17} />}
        data-tip="All use cases"
        tabs={
          <PanelTabs
            compact
            activeId={displayMode}
            onSelect={(id) => setDisplayMode(id as DisplayMode)}
            tabs={[
              { id: "board", label: "Board", icon: <Columns3 size={15} /> },
              { id: "table", label: "Table", icon: <Table2 size={15} /> },
            ]}
          />
        }
        controls={
          <>
            <CollapsingSearch value={search} onChange={setSearch} />
            <FilterMenu
              activeView={activeView}
              onViewChange={setActiveView}
              activeScope={scopeFilter}
              onScopeChange={setScopeFilter}
              attentionOnly={attentionOnly}
              onAttentionChange={setAttentionOnly}
              attentionCount={attentionCount}
            />
            <ProfileSwitcher currentUser={activeProfile} onUserChange={setActiveProfile} compact />
          </>
        }
        scroll={false}
        titleMeta={
          <span className="shrink-0 text-[12px] tabular-nums text-[var(--text-muted)]">
            {filteredUseCases.length} {filteredUseCases.length === 1 ? "use case" : "use cases"}
          </span>
        }
      >
        {displayMode === "board" ? (
          <section className="flex min-h-0 flex-1 flex-col">
            {/* Columns share the panel's width down to a readable floor, then the
 board scrolls sideways rather than squeezing the cards. */}
            <div className="relative min-h-0 flex-1">
              <div className="no-scrollbar h-full min-h-0 overflow-x-auto px-5">
                <div
                  className="grid h-full min-h-[320px] gap-6"
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
                    minWidth: `${columns.length * 340 + (columns.length - 1) * 24}px`,
                  }}
                >
                  {columns.map((column) => (
                    <KanbanColumn key={column.title} column={column} />
                  ))}
                </div>
              </div>
              {/* Sideways overflow reads as "more to scroll", not a sliced column. */}
              <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--surface)] to-transparent" />
            </div>
          </section>
        ) : (
          <UseCaseTableView columns={columns} totalRows={filteredUseCases.length} />
        )}
      </ContentPanel>
    </AppShell>
  );
}

// Search costs a 180px field in a header that has five other things in it, so it
// stays an icon until you use it (and reopens whenever a query is set).
function CollapsingSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const expanded = open || value.length > 0;

  if (!expanded) {
    return (
      <IconButton
        label="Search use cases"
        size={32}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Search size={15} />
      </IconButton>
    );
  }

  return (
    <label className="relative block">
      <Search aria-hidden size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            setOpen(false);
          }
        }}
        placeholder="Search use cases…"
        className="h-8 w-[180px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] pl-7 pr-2.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-input)]"
      />
    </label>
  );
}

// Grouping, scope and the attention toggle in one menu: three separate triggers
// filled the header without ever being used together.
function FilterMenu({
  activeView,
  onViewChange,
  activeScope,
  onScopeChange,
  attentionOnly,
  onAttentionChange,
  attentionCount,
}: {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  activeScope: ScopeFilter;
  onScopeChange: (scope: ScopeFilter) => void;
  attentionOnly: boolean;
  onAttentionChange: (only: boolean) => void;
  attentionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  // Anything other than the defaults counts as filtered, so the trigger can say so.
  const activeCount = (activeScope === "all" ? 0 : 1) + (attentionOnly ? 1 : 0);
  const groupLabel = viewOptions.find((option) => option.key === activeView)?.label ?? "By stage";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={`Grouped ${groupLabel.toLowerCase()}`}
        aria-label={`Filters — grouped ${groupLabel.toLowerCase()}`}
        className={[
          "inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] transition",
          open || activeCount > 0
            ? "border-[var(--accent-ring)] bg-[var(--surface-hover)] text-[var(--accent-strong)]"
            : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-body)] hover:border-[var(--border-input)] hover:bg-[var(--surface-hover)]",
        ].join(" ")}
      >
        <SlidersHorizontal size={14} />
        {activeCount > 0 ? (
          <span className="rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold leading-[17px] text-white">{activeCount}</span>
        ) : null}
        <ChevronDown size={13} className={["text-[var(--text-muted)] transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-9 z-30 w-[228px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-menu)]">
          <MenuGroupLabel>Group by</MenuGroupLabel>
          {viewOptions.map((option) => (
            <MenuOption key={option.key} selected={activeView === option.key} onClick={() => onViewChange(option.key)}>
              {option.label}
            </MenuOption>
          ))}

          <MenuGroupLabel className="mt-1.5">Scope</MenuGroupLabel>
          {scopeOptions.map((option) => (
            <MenuOption key={option.key} selected={activeScope === option.key} onClick={() => onScopeChange(option.key)}>
              {option.label}
            </MenuOption>
          ))}

          <div className="mt-1.5 border-t border-[var(--border-hairline)] pt-1.5">
            <MenuOption selected={attentionOnly} onClick={() => onAttentionChange(!attentionOnly)}>
              <span className="flex w-full items-center justify-between gap-2">
                Needs my attention
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{attentionCount}</span>
              </span>
            </MenuOption>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuGroupLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={["px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]", className ?? ""].join(" ")}>
      {children}
    </div>
  );
}

function MenuOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 w-full items-center rounded-[6px] px-2 text-left text-[12px] font-medium transition",
        selected
          ? "bg-[var(--surface-hover)] text-[var(--accent-strong)]"
          : "text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function UseCaseTableView({ columns, totalRows }: { columns: BoardColumn[]; totalRows: number }) {
  const visibleColumns = columns.filter((column) => column.cards.length > 0);

  if (totalRows === 0) {
    return (
      <section className="grid min-h-0 flex-1 place-items-center px-6 py-10">
        <p className="text-[13px] text-[var(--text-label)]">No use cases match the current search.</p>
      </section>
    );
  }

  return (
    // One table for the whole list: a sticky head, and each group announced by a
    // row rather than wrapped in its own card.
    <section className="no-scrollbar min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[980px] table-fixed border-collapse">
        <colgroup>
          <col className="w-[9%]" />
          <col className="w-[30%]" />
          <col className="w-[12%]" />
          <col className="w-[15%]" />
          <col className="w-[17%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[var(--surface-muted)]">
          <tr className="border-b border-[var(--border-default)] text-left">
            <TableHeader>ID</TableHeader>
            <TableHeader>Use case</TableHeader>
            <TableHeader>Stage</TableHeader>
            <TableHeader>Owner</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader align="right">Priority</TableHeader>
            <TableHeader align="right">Due</TableHeader>
          </tr>
        </thead>
        {visibleColumns.map((column) => (
          <tbody key={column.title}>
            <tr>
              <th scope="colgroup" colSpan={7} className="border-y border-[var(--border-hairline)] bg-[var(--surface)] px-6 py-2.5 text-left">
                <span className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">{column.title}</span>
                  <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{column.cards.length}</span>
                </span>
              </th>
            </tr>
            {column.cards.map((row) => (
              <UseCaseTableRow key={row.id} row={row} />
            ))}
          </tbody>
        ))}
      </table>
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
    <tr className="group h-[64px] border-b border-[var(--border-hairline)] transition last:border-b-0 hover:bg-[var(--surface-hover)]">
      <td className="px-6 align-middle">
        <Link href={row.href} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
          {row.id}
        </Link>
      </td>
      <td className="min-w-0 px-4 align-middle">
        <Link href={row.href} className="block min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-5 text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)]">
            {row.title}
          </span>
          <span className="block truncate text-[12px] leading-4 text-[var(--text-muted)]">{row.description}</span>
        </Link>
      </td>
      <td className="px-4 align-middle">
        {/* One line — the group row above already names the phase. */}
        <span data-tip={row.substage} className="block truncate text-[13px] text-[var(--text-body)]">
          {shortStageLabel(row.substage)}
        </span>
      </td>
      <td className="px-4 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex shrink-0 items-center">
            <PersonAvatar name={row.owner} size={18} />
            {row.coOwner ? (
              <span className="-ml-1.5 rounded-full ring-2 ring-[var(--surface)]">
                <PersonAvatar name={row.coOwner} size={18} />
              </span>
            ) : null}
          </span>
          <span
            data-tip={row.coOwner ? `${formatStageOwner(row)} and ${row.coOwner}` : formatStageOwner(row)}
            className="min-w-0 truncate text-[13px] text-[var(--text-body)]"
          >
            {row.coOwner ? `${formatStageOwner(row)} +1` : formatStageOwner(row)}
          </span>
        </span>
      </td>
      <td className="px-4 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          {lifecycleTag ? (
            <span className={["shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", lifecycleTag].join(" ")}>
              {titleCaseTag(row.lifecycle)}
            </span>
          ) : null}
          {row.gate ? <GateChip gate={row.gate} /> : null}
          {row.needsAttention ? (
            <span
              data-tip={getAttentionMessage(row)}
              className="min-w-0 shrink truncate rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]"
            >
              {getAttentionMessage(row)}
            </span>
          ) : null}
          {!lifecycleTag && !row.gate && !row.needsAttention ? <span className="text-[13px] text-[var(--text-muted)]">—</span> : null}
        </span>
      </td>
      <td className="px-4 text-right align-middle">
        <PriorityCell card={row} />
      </td>
      <td className="px-6 text-right align-middle">
        <span className="text-[13px] tabular-nums text-[var(--text-body)]">{due ?? "—"}</span>
      </td>
    </tr>
  );
}

function TableHeader({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={[
        "h-11 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-label)] first:pl-6 last:pr-6",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

// The flag on a card takes the priority's colour; the dot version is still used
// in the table, where the column header supplies the label.
const PRIORITY_ICON: Record<Priority, string> = {
  High: "text-[var(--status-danger)]",
  Medium: "text-[var(--tone-warning-fg)]",
  Low: "text-[var(--status-success)]",
};

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
      {showFunctional ? <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">fn {card.priority}</span> : null}
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
              className="pointer-events-none z-[80] rounded-[14px] border border-[var(--border-input)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-menu)]"
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
      <div className={["sticky top-0 z-10 bg-[var(--surface)] transition-shadow", hasScrolled ? "" : ""].join(" ")}>
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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[var(--surface)]" />
    </section>
  );
}

// Very light colour coding on the board: a card's header band and a 3px left edge
// take the tone of its state, so a column reads at a glance — red is stuck, amber
// is waiting on a decision, green is live, accent is yours to act on. Everything
// else stays neutral, so the colour marks exceptions rather than decorating rows.
type CardTone = "danger" | "warning" | "success" | "info" | "neutral";

function cardTone(card: UseCaseCard): CardTone {
  if (card.lifecycle === "Rejected" || card.gate?.status === "Rejected" || card.gate?.status === "Blocked") return "danger";
  if (card.lifecycle === "On hold" || card.gate?.status === "In review") return "warning";
  if (card.lifecycle === "Live") return "success";
  if (card.needsAttention) return "info";
  return "neutral";
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
    <span
      className={["inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", GATE_BADGE[gate.status]].join(" ")}
    >
      {gate.id} · {titleCaseTag(gate.status)}
    </span>
  );
}

function UseCaseBoardCard({ card }: { card: UseCaseCard }) {
  const lifecycleTag = LIFECYCLE_TAG[card.lifecycle];
  const priority = card.orgPriority ?? card.priority;
  const due = dueDate(card.due);
  const tone = cardTone(card);
  const toned = tone !== "neutral";

  return (
    <Link
      href={card.href}
      className="group block shrink-0 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] transition hover:border-[var(--border-input)]"
    >
      {/* Header band: the record's id and the tags that qualify it, on its own
          ground — the same treatment as the panel and table-group headers. */}
      <div
        style={toned ? { background: `var(--tone-${tone}-bg)`, borderColor: `var(--tone-${tone}-border)` } : undefined}
        className="flex min-h-[34px] items-center gap-2 border-b border-[var(--border-hairline)] bg-[var(--surface-strong)] px-4 py-1.5"
      >
        <span
          style={toned ? { color: `var(--tone-${tone}-fg)` } : undefined}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-label)]"
        >
          {card.id}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {lifecycleTag ? (
            <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", lifecycleTag].join(" ")}>{titleCaseTag(card.lifecycle)}</span>
          ) : null}
          {card.gate ? <GateChip gate={card.gate} /> : null}
        </span>
      </div>

      <div className="px-4 pb-3.5 pt-3">
        <h3 className="text-[14px] font-semibold leading-[1.4] text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)]">
          {card.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-[var(--text-body)]">{card.description}</p>

        {/* Each value carries an icon, so it says what it is without a caption and
            without waiting for a tooltip: who owns it, when it's due, where it is
            in the lifecycle, how urgent it is. */}
        <div className="mt-3.5 space-y-1.5 text-[12px]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 items-center">
              <PersonAvatar name={card.owner} size={18} />
              {card.coOwner ? (
                <span className="-ml-1.5 rounded-full ring-2 ring-[var(--surface)]">
                  <PersonAvatar name={card.coOwner} size={18} />
                </span>
              ) : null}
            </span>
            <span
              data-tip={card.coOwner ? `Owners — ${formatStageOwner(card)} and ${card.coOwner}` : `Owner — ${formatStageOwner(card)}`}
              className="min-w-0 truncate text-[var(--text-body)]"
            >
              {card.coOwner ? `${formatStageOwner(card)} +1` : formatStageOwner(card)}
            </span>
            {due ? (
              <span data-tip={`Due ${due}`} className="ml-auto flex shrink-0 items-center gap-1.5 tabular-nums text-[var(--text-body)]">
                <CalendarDays size={12} className="text-[var(--text-muted)]" />
                {due}
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 text-[var(--text-body)]">
            <span data-tip={`Stage — ${card.substage}`} className="flex min-w-0 items-center gap-1.5">
              <Layers size={12} className="shrink-0 text-[var(--text-muted)]" />
              <span className="min-w-0 truncate">{shortStageLabel(card.substage)}</span>
            </span>
            <span
              data-tip={
                priority
                  ? card.orgPriority && card.priority !== card.orgPriority
                    ? `Priority — portfolio ${card.orgPriority}, functional ${card.priority}`
                    : `Priority — ${priority.toLowerCase()}`
                  : "Not prioritised yet"
              }
              className="ml-auto flex shrink-0 items-center gap-1.5"
            >
              <Flag size={12} className={priority ? PRIORITY_ICON[priority] : "text-[var(--text-muted)]"} />
              {priority ?? "None"}
            </span>
          </div>
        </div>
      </div>

      {/* What this card wants from you, inside its border rather than hanging off
          the bottom of it. */}
      {card.needsAttention ? (
        <div className="flex items-center gap-1.5 border-t border-[var(--border-hairline)] bg-[var(--surface-muted)] px-4 py-2 text-[12px] font-medium text-[var(--text-primary)] transition group-hover:bg-[var(--surface-hover)]">
          <ArrowRight size={12} className="shrink-0 text-[var(--accent)]" />
          <span className="min-w-0 truncate">{getAttentionMessage(card)}</span>
          {card.pendingFor ? <span className="ml-auto shrink-0 text-[11px] text-[var(--text-muted)]">{card.pendingFor}</span> : null}
        </div>
      ) : null}
    </Link>
  );
}
