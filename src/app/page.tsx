"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleDot,
  Columns3,
  FileText,
  Flag,
  Inbox,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  User,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { AppShell, ContentPanel, PanelBreadcrumb, PanelTabs, RailHeader, useRailMode } from "@/components/app-shell";
import { ChatHistoryButton, useChatSessions, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { ChatCardList } from "@/components/chat/chat-use-case-card";
import { JumpToTop } from "@/components/chat/chat-ui";
import { MiniChatRail, type RailAnswer } from "@/components/chat/mini-chat-rail";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import {
  Button,
  ButtonLink,
  CHIP,
  ChipOverflow,
  IconButton,
  MenuDivider,
  MenuItem,
  MenuLabel,
  MenuSurface,
  PHASE_TONES,
  PhaseIcon,
  StageIcon,
  titleCaseTag,
} from "@/components/ui/kit";
import { STAGE_GROUPS, STAGES, SUBSTAGE_TO_GROUP, shortStageLabel } from "@/data/lifecycle";
import {
  CURRENT_USER,
  USE_CASES,
  dueDate,
  filterUseCasesByScope,
  getAttentionMessage,
  scopeOptions,
  type GateStatus,
  type Lifecycle,
  type Priority,
  type ScopeFilter,
  type UseCaseCard,
} from "@/data/registry";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/use-click-outside";

type ViewKey = "stage" | "people" | "priority" | "due" | "status";
type DisplayMode = "board" | "table";

// The tracker rail's responder: answers the starter questions (and anything with
// the same keywords) straight from the registry rather than a canned line.
// ai-upgrade: swap the keyword matching for a real model call.
function answerAboutPortfolio(question: string, person: string): RailAnswer | undefined {
  const asked = question.toLowerCase();
  const list = (cards: UseCaseCard[], describe: (card: UseCaseCard) => string) =>
    cards.map((card) => `• ${card.id} ${card.title} — ${describe(card)}`).join("\n");

  if (/attention|mine|my |waiting on me|urgent/.test(asked)) {
    const mine = USE_CASES.filter((card) => card.needsAttention && card.actionOwner === person);
    const others = USE_CASES.filter((card) => card.needsAttention && card.actionOwner !== person);
    if (mine.length) {
      return {
        text: `${mine.length === 1 ? "One use case needs" : `${mine.length} use cases need`} ${person}:`,
        detail: <ChatCardList cards={mine} />,
      };
    }
    return others.length
      ? {
          text: `Nothing is waiting on ${person}. Elsewhere, ${others.length} use ${others.length === 1 ? "case needs" : "cases need"} attention:`,
          detail: <ChatCardList cards={others} />,
        }
      : `Nothing needs attention right now.`;
  }

  if (/blocked|stuck|on hold|rejected/.test(asked)) {
    const stalled = USE_CASES.filter(
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
    const atBoard = USE_CASES.filter((card) => card.substage === "GTAC" || card.stage === "GTAC" || card.dueGroup === "Funded");
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
      { role: "assistant", text: "At or past the GTAC board:\n\n• UC-103 Marketing Asset Tagger — Monitoring · funded" },
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
  Assessment: "Complete the required risk & compliance assessments.",
  "Business Case": "Review the business case; prioritize it for GTAC.",
  GTAC: "Approve or reject the business case; allocate investment.",
  "Plan & KPI": "Confirm delivery model, resourcing, roadmap, and KPIs.",
  "Solution blue print": "Translate business needs into a solution blueprint.",
  "Solutionise and Production": "Build, validate, and release the AI solution.",
  "Monitoring and tracking": "Track business KPIs and risks in production.",
  Adoption: "Drive adoption through training & change management.",
};

const stageOwner = (stageName: string) => STAGES.find((stage) => stage.name === stageName)?.owner;

const viewOptions: Array<{ key: ViewKey; label: string }> = [
  { key: "stage", label: "By Stage" },
  { key: "people", label: "By Owner" },
  { key: "priority", label: "By Priority" },
  { key: "due", label: "By Due Date" },
  { key: "status", label: "By Status" },
];

function formatStageOwner(card: UseCaseCard) {
  return card.owner === CURRENT_USER || card.actionOwner === CURRENT_USER ? "(Me)" : card.owner;
}

const viewColumnOrder: Record<ViewKey, string[]> = {
  stage: Object.keys(STAGE_GROUPS),
  people: ["Nisha Patel", "Priya Rao", "Elena Weber", "Rohan Desai", "Mira Kapoor", "Aarav Mehta", "Daniel Cho", "Noah R."],
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

export default function HomePage() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("board");
  const [activeView, setActiveView] = useState<ViewKey>("stage");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [activeProfile, setActiveProfile] = useState(CURRENT_USER);
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
  // Past conversations, plus whatever the user archives by starting a new one.
  const history = useChatSessions(REGISTRY_HISTORY);
  const liveTurns = useRef<ChatTurn[]>([]);
  const pastSession = history.sessions.find((session) => session.id === history.activeId) ?? null;
  const scopedUseCases = useMemo(() => filterUseCasesByScope(USE_CASES, scopeFilter), [scopeFilter]);
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
            wide={railMode.expanded}
            past={pastSession ? { session: pastSession, onBack: () => history.open(null) } : undefined}
            onTurnsChange={(turns) => {
              liveTurns.current = turns;
            }}
            scrollRef={railScrollRef}
            onScrolledChange={setRailScrolled}
            emptyTitle={`How can I help, ${activeProfile.split(" ")[0]}?`}
            intro={`${USE_CASES.length} use cases are in the registry and ${attentionCount} need attention. Describe an idea and I'll start a new one, or ask me about what's already here.`}
            starters={[
              { label: "Start a new use case", draft: "I want to build an AI assistant that ", icon: <Sparkles size={13} /> },
              { label: "What needs my attention?", icon: <Inbox size={13} /> },
              { label: "Which use cases are blocked?", icon: <ShieldCheck size={13} /> },
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
        // The same breadcrumb the record pages use, so the tracker's panel header
        // reads as the first step of that path rather than a title of its own.
        breadcrumb={<PanelBreadcrumb items={[{ label: "All use cases" }]} />}
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
            {/* Two groups, a rule between them: what you're looking at (search,
                the attention filter, grouping) and who you are. */}
            <CollapsingSearch value={search} onChange={setSearch} />
            <Button
              onClick={() => setAttentionOnly(!attentionOnly)}
              active={attentionOnly}
              aria-pressed={attentionOnly}
              className={cn(attentionOnly && "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]")}
            >
              <Inbox size={14} />
              Needs my attention
              <span className="font-mono text-[11px] text-[var(--text-muted)]">{attentionCount}</span>
            </Button>
            <FilterMenu activeView={activeView} onViewChange={setActiveView} activeScope={scopeFilter} onScopeChange={setScopeFilter} />
            {/* The one action this view is for. The rail can also start a use case
                from a described idea; this is the door for people who'd rather fill
                the intake in. */}
            <ButtonLink href="/intake" tone="primary">
              <Plus size={14} />
              New use case
            </ButtonLink>
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-[var(--border-default)]" />
            <ProfileSwitcher currentUser={activeProfile} onUserChange={setActiveProfile} compact />
          </>
        }
        scroll={false}
        titleMeta={
          // Just the number, as a chip: "11 use cases" spelled out beside a crumb
          // that already says "use cases" was the same word twice.
          <span
            data-tip={`${filteredUseCases.length} ${filteredUseCases.length === 1 ? "use case" : "use cases"}`}
            className={cn(CHIP, "font-mono bg-[var(--surface-strong)] text-[var(--text-label)]")}
          >
            {filteredUseCases.length}
          </span>
        }
      >
        {displayMode === "board" ? (
          <section className="flex min-h-0 flex-1 flex-col">
            {/* Columns share the panel's width down to a readable floor, then the
 board scrolls sideways rather than squeezing the cards. */}
            <div className="relative min-h-0 flex-1">
              <div className="no-scrollbar h-full min-h-0 overflow-x-auto px-5 pb-5 pt-4">
                <div
                  className="grid h-full min-h-[320px] gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
                    minWidth: `${columns.length * 340 + (columns.length - 1) * 12}px`,
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
        className="h-9 w-[190px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] pl-8 pr-2.5 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-input)]"
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
}: {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  activeScope: ScopeFilter;
  onScopeChange: (scope: ScopeFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  // Anything other than the default scope counts as filtered.
  const activeCount = activeScope === "all" ? 0 : 1;
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
          "inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] transition",
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
        <MenuSurface className="absolute right-0 top-11 z-30 w-[236px]">
          <MenuLabel>Group by</MenuLabel>
          {viewOptions.map((option) => (
            <MenuItem key={option.key} selected={activeView === option.key} onClick={() => onViewChange(option.key)}>
              {option.label}
            </MenuItem>
          ))}

          <MenuDivider />
          <MenuLabel>Scope</MenuLabel>
          {scopeOptions.map((option) => (
            <MenuItem key={option.key} selected={activeScope === option.key} onClick={() => onScopeChange(option.key)}>
              {option.label}
            </MenuItem>
          ))}
        </MenuSurface>
      ) : null}
    </div>
  );
}

const TABLE_COLS = (
  <colgroup>
    <col className="w-[36%]" />
    <col className="w-[13%]" />
    <col className="w-[16%]" />
    <col className="w-[23%]" />
    <col className="w-[12%]" />
  </colgroup>
);

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
    // Boxed like the lifecycle table: the panel's edge is whitespace, the table's
    // own edge is a hairline box. The box is the scroll container, so the header
    // band stays put against its top rather than scrolling out of the frame.
    <section className="min-h-0 flex-1 px-5 pb-5 pt-4">
      <div className="no-scrollbar h-full min-h-0 overflow-auto rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)]">
        <table className="w-full min-w-[880px] table-fixed border-collapse">
          {TABLE_COLS}
          {/* A filled band, so the column names read as chrome rather than as a
              first row of data — the same fill the lifecycle table uses. */}
          <thead className="sticky top-0 z-10 bg-[var(--surface-header)]">
            <tr className="border-b border-[var(--border-default)] text-left">
              <TableHeader icon={<FileText size={12} />}>Use case</TableHeader>
              <TableHeader icon={<Flag size={12} />}>Stage</TableHeader>
              <TableHeader icon={<User size={12} />}>Owner</TableHeader>
              <TableHeader icon={<CircleDot size={12} />}>Status</TableHeader>
              <TableHeader icon={<CalendarDays size={12} />} align="right">
                Due
              </TableHeader>
            </tr>
          </thead>

          {visibleColumns.map((column) => {
            const tone = PHASE_TONES[column.title] ?? "neutral";
            const members = STAGE_GROUPS[column.title];
            return (
              <tbody key={column.title}>
                <tr>
                  <th scope="colgroup" colSpan={5} className="px-2 pb-2 pt-5 text-left">
                    {/* Neutral band, coloured glyph: the phase reads from the icon
                        rather than a wash of tint behind everything. Its gutter and
                        inner padding add up to the cells' own 16px, so the phase name
                        sits on the same edge as the rows under it while the box still
                        floats inside the table. */}
                    <span className="flex min-h-[38px] items-center gap-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--surface-muted)] py-2.5 pl-2 pr-3">
                      <PhaseIcon phase={column.title} size={14} className="shrink-0" style={{ color: `var(--tone-${tone}-fg)` }} />
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{column.title}</span>
                      <span className="font-mono rounded-[5px] bg-[var(--surface-strong)] px-1.5 text-[11px] font-medium text-[var(--text-label)]">
                        {column.cards.length}
                      </span>
                      {members && members.length > 1 ? (
                        <span data-tip={`Includes ${members.join(" → ")}`} className="ml-auto text-[11px] font-normal text-[var(--text-muted)]">
                          {members.length} stages
                        </span>
                      ) : null}
                    </span>
                  </th>
                </tr>
                {column.cards.map((row) => (
                  <UseCaseTableRow key={row.id} row={row} />
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}

function UseCaseTableRow({ row }: { row: UseCaseCard }) {
  const lifecycleTag = LIFECYCLE_TAG[row.lifecycle];
  const priority = row.orgPriority ?? row.priority;
  const due = dueDate(row.due);

  return (
    <tr className="group h-[60px] border-b border-[var(--border-hairline)] transition last:border-b-0 hover:bg-[var(--surface-hover)]">
      {/* The title owns the first line; the id joins the meta line beneath it, so
          every title starts on the same edge and 11px mono isn't wedged against
          13px semibold. */}
      <td className="min-w-0 px-3 align-middle first:pl-4">
        <Link href={row.href} className="block min-w-0">
          <span className="block min-w-0 truncate text-[13px] font-semibold text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)]">
            {row.title}
          </span>
          <span className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[12px] leading-4 text-[var(--text-muted)]">
            <span className="font-mono shrink-0 text-[11px] text-[var(--text-faint)]">{row.id}</span>
            <span aria-hidden className="shrink-0 text-[var(--text-faint)]">
              ·
            </span>
            {/* The row is one line tall, so the description truncates — the tip is
                how you read the rest of it without opening the record. */}
            <span data-tip={row.description} className="min-w-0 truncate">
              {row.description}
            </span>
          </span>
        </Link>
      </td>

      <td className="px-3 align-middle">
        {/* One line — the phase band above already names the group. */}
        <span data-tip={`Stage — ${row.substage}`} className="block truncate text-[13px] text-[var(--text-body)]">
          {shortStageLabel(row.substage)}
        </span>
      </td>

      <td className="px-3 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex shrink-0 items-center">
            <PersonAvatar name={row.owner} size={20} />
            {row.coOwner ? (
              <span className="-ml-1.5 rounded-full ring-2 ring-[var(--surface)]">
                <PersonAvatar name={row.coOwner} size={20} />
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

      {/* Status carries priority too. Anything past the second chip collapses into
          a +n, so a busy row stays one line. */}
      <td className="px-3 align-middle">
        <ChipOverflow
          max={2}
          items={[
            ...(priority
              ? [
                  {
                    key: "priority",
                    label: `Priority — ${priority.toLowerCase()}`,
                    node: (
                      <span data-tip={`Priority — ${priority.toLowerCase()}`} className={[CHIP, PRIORITY_CHIP[priority]].join(" ")}>
                        <Flag size={11} />
                        {priority}
                      </span>
                    ),
                  },
                ]
              : []),
            ...(row.gate
              ? [
                  {
                    key: "gate",
                    label: `Gate ${row.gate.id} — ${row.gate.status.toLowerCase()}`,
                    node: <GateChip gate={row.gate} />,
                  },
                ]
              : []),
            ...(lifecycleTag
              ? [
                  {
                    key: "lifecycle",
                    label: `Lifecycle — ${row.lifecycle.toLowerCase()}`,
                    node: (
                      <span data-tip={`Lifecycle — ${row.lifecycle.toLowerCase()}`} className={[CHIP, lifecycleTag].join(" ")}>
                        {titleCaseTag(row.lifecycle)}
                      </span>
                    ),
                  },
                ]
              : []),
            ...(row.needsAttention
              ? [
                  {
                    key: "attention",
                    label: getAttentionMessage(row),
                    node: (
                      <span data-tip={getAttentionMessage(row)} className={[CHIP, "bg-[var(--accent-soft)] text-[var(--accent-strong)]"].join(" ")}>
                        <ArrowRight size={11} />
                        Action needed
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
        {!priority && !lifecycleTag && !row.gate && !row.needsAttention ? <span className="text-[13px] text-[var(--text-muted)]">—</span> : null}
      </td>

      <td className="px-3 pr-5 text-right align-middle">
        <span className="font-mono text-[12px] text-[var(--text-body)]">{due ?? "—"}</span>
      </td>
    </tr>
  );
}

// Same header cell as the lifecycle table: a glyph, then the column's name.
function TableHeader({ icon, children, align = "left" }: { icon?: ReactNode; children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn("h-9 px-3 text-[11px] font-medium text-[var(--text-muted)] first:pl-4 last:pr-5", align === "right" ? "text-right" : "text-left")}
    >
      {/* Icon first in every column, right-aligned ones included: a glyph on the
          far side of the label reads as a control, not as the column's kind. */}
      <span className="inline-flex items-center gap-1.5">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
      </span>
    </th>
  );
}

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
            // A menu, not a diagram: the panel is the product's menu surface, and
            // each stage is one row — number, name, owner, one line of what it is.
            // The timeline dots and connector spelled out an order the numbers
            // already carry, on a grey fill that fought the cards behind it.
            <MenuSurface style={{ position: "fixed", left: coords.x, top: coords.y, width: coords.w }} className="pointer-events-none z-[80] p-0">
              {/* No header: the trigger you hovered already says "4 stages".
                  Hairlines separate the rows — with two-line descriptions, gaps
                  alone left it unclear where one stage ended. The avatar sits
                  last, so every owner ends on the same right edge instead of
                  four avatars at four different offsets. */}
              <div className="divide-y divide-[var(--border-hairline)]">
                {members.map((member, index) => {
                  const owner = stageOwner(member);
                  const desc = STAGE_DESC[member];
                  return (
                    <div key={member} className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 shrink-0 font-mono text-[11px] text-[var(--text-faint)]">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{member}</span>
                        {/* Name only — four avatars down a 240px menu were more
                            colour than the row needed. */}
                        {owner ? <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{owner}</span> : null}
                      </div>
                      {desc ? <p className="ml-5 mt-1 text-[11px] leading-[1.45] text-[var(--text-muted)]">{desc}</p> : null}
                    </div>
                  );
                })}
              </div>
            </MenuSurface>,
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
    // The column is a box: a recessed tray holding white cards, so a phase reads
    // as one container rather than a loose stack floating on the panel.
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] bg-[var(--surface-muted)]">
      {/* Outside the scroll area, so it stays put without a sticky fill. Its
          hairline only appears once cards have scrolled under it. */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-3.5 pb-3 pt-3.5",
          hasScrolled ? "border-[var(--border-hairline)]" : "border-transparent",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <PhaseIcon phase={column.title} size={14} className="shrink-0" style={{ color: `var(--tone-${PHASE_TONES[column.title] ?? "neutral"}-fg)` }} />
          <h2 className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{column.title}</h2>
          {members && members.length > 1 ? <PhaseStagesHint members={members} /> : null}
        </div>
        <span className="grid h-[20px] min-w-[20px] shrink-0 place-items-center rounded-full bg-[var(--surface-strong)] px-1.5 font-mono text-[11px] font-medium text-[var(--text-label)]">
          {column.cards.length}
        </span>
      </div>

      <div
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-10 pt-0.5"
        onScroll={(event) => setHasScrolled(event.currentTarget.scrollTop > 0)}
      >
        {column.cards.map((card) => (
          <UseCaseBoardCard key={card.id} card={card} />
        ))}
      </div>
      {/* A card that runs past the bottom of the column dissolves rather than
 being cut in half at rest. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[var(--surface-muted)]" />
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
    <span data-tip={`Gate ${gate.id} — ${gate.status.toLowerCase()}`} className={[CHIP, GATE_BADGE[gate.status]].join(" ")}>
      <ShieldCheck size={11} />
      <span className="font-mono">{gate.id}</span> · {titleCaseTag(gate.status)}
    </span>
  );
}

// Priority as a tinted chip, the way the references carry it — the colour does the
// work, so the word can stay small.
const PRIORITY_CHIP: Record<Priority, string> = {
  High: "bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)]",
  Medium: "bg-[var(--tone-warning-bg)] text-[var(--tone-warning-fg)]",
  Low: "bg-[var(--tone-success-bg)] text-[var(--tone-success-fg)]",
};

function CardChip({ tip, className, children }: { tip?: string; className?: string; children: ReactNode }) {
  return (
    <span data-tip={tip} className={[CHIP, className ?? ""].join(" ")}>
      {children}
    </span>
  );
}

function UseCaseBoardCard({ card }: { card: UseCaseCard }) {
  const lifecycleTag = LIFECYCLE_TAG[card.lifecycle];
  const priority = card.orgPriority ?? card.priority;
  const due = dueDate(card.due);

  return (
    // Title first, then what it is, then what it's tagged with, then the record's
    // own line: id and date on the left, the people on the right.
    <Link
      href={card.href}
      className="group block shrink-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] transition hover:border-[var(--border-input)] hover:bg-[var(--surface-muted)]"
    >
      <div className="px-3.5 pb-3 pt-3">
        <div className="flex min-w-0 items-start gap-2">
          <StageIcon stage={card.substage} size={14} className="mt-[3px] shrink-0 text-[var(--text-muted)]" />
          <h3 className="min-w-0 flex-1 text-[14px] font-semibold leading-[1.4] text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)]">
            {card.title}
          </h3>
        </div>

        {/* No tip here: the card has room for the whole description, and a tip
            that repeats what you're already reading covers the card. */}
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-[var(--text-body)]">{card.description}</p>

        {/* Chips stay on one line: past the third, the rest collapse into a +n whose
            tooltip lists them. */}
        <div className="mt-2.5 min-w-0">
          <ChipOverflow
            max={3}
            items={[
              {
                key: "stage",
                label: `Stage — ${card.substage}`,
                node: (
                  <CardChip tip={`Stage — ${card.substage}`} className="bg-[var(--surface-strong)] text-[var(--text-body)]">
                    {shortStageLabel(card.substage)}
                  </CardChip>
                ),
              },
              ...(priority
                ? [
                    {
                      key: "priority",
                      label: `Priority — ${priority.toLowerCase()}`,
                      node: (
                        <CardChip
                          tip={
                            card.orgPriority && card.priority !== card.orgPriority
                              ? `Priority — portfolio ${card.orgPriority}, functional ${card.priority}`
                              : `Priority — ${priority.toLowerCase()}`
                          }
                          className={PRIORITY_CHIP[priority]}
                        >
                          {priority}
                        </CardChip>
                      ),
                    },
                  ]
                : []),
              ...(card.gate
                ? [
                    {
                      key: "gate",
                      label: `Gate ${card.gate.id} — ${card.gate.status.toLowerCase()}`,
                      node: (
                        <CardChip
                          tip={`Assessment gate ${card.gate.id} — ${card.gate.status.toLowerCase()}`}
                          className={GATE_BADGE[card.gate.status]}
                        >
                          <span className="font-mono">{card.gate.id}</span> · {titleCaseTag(card.gate.status)}
                        </CardChip>
                      ),
                    },
                  ]
                : []),
              ...(lifecycleTag
                ? [
                    {
                      key: "lifecycle",
                      label: `Lifecycle — ${card.lifecycle.toLowerCase()}`,
                      node: (
                        <CardChip tip={`Lifecycle — ${card.lifecycle.toLowerCase()}`} className={lifecycleTag}>
                          {titleCaseTag(card.lifecycle)}
                        </CardChip>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        {/* The action is not a tag: it takes the card's width with the arrow on the
            far side, so it reads as the thing to do rather than another label. */}
        {card.needsAttention ? (
          <span className="mt-3 flex w-full items-center gap-2 rounded-[8px] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--accent-strong)]">
            <span className="min-w-0 flex-1 truncate">{getAttentionMessage(card)}</span>
            <ArrowRight size={13} className="shrink-0" />
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-2 border-t border-[var(--border-hairline)] px-3.5 py-2 text-[11px] text-[var(--text-muted)]">
        <span className="font-mono shrink-0 text-[11px] font-medium">{card.id}</span>
        {due ? (
          <>
            <span aria-hidden className="h-2.5 w-px shrink-0 bg-[var(--border-default)]" />
            <span className="font-mono inline-flex shrink-0 items-center gap-1">
              <CalendarDays size={11} />
              {due}
            </span>
          </>
        ) : null}
        {card.pendingFor ? (
          <>
            <span aria-hidden className="h-2.5 w-px shrink-0 bg-[var(--border-default)]" />
            <span className="shrink-0">Waiting {card.pendingFor}</span>
          </>
        ) : null}
        <span
          data-tip={card.coOwner ? `${formatStageOwner(card)} and ${card.coOwner}` : formatStageOwner(card)}
          className="ml-auto flex shrink-0 items-center"
        >
          <PersonAvatar name={card.owner} size={20} />
          {card.coOwner ? (
            <span className="-ml-2 rounded-full ring-2 ring-[var(--surface)]">
              <PersonAvatar name={card.coOwner} size={20} />
            </span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}
