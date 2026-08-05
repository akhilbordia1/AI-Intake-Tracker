"use client";

import { CheckCircle2, Circle, CircleDot, FileText, Flag, Gavel, Info, ListChecks, MinusCircle, User } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { AppShell, ContentPanel, PanelBreadcrumb, RailHeader, TabBarToggle, useRailMode } from "@/components/app-shell";
import { ChatHistoryButton, useChatSessions, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { JumpToTop } from "@/components/chat/chat-ui";
import { MiniChatRail } from "@/components/chat/mini-chat-rail";
import { RecordDetailsSheet } from "@/components/document-record/record-details-sheet";
import { RecordSummary } from "@/components/document-record/record-summary";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { USE_CASE } from "@/data/document-workflow-form-schema";
import {
  ACTIVE_STAGE_INDEX,
  COMPLETED_STAGE_INDEXES,
  GATES,
  OUTCOME_ROW,
  PATH_STAGE_COUNT,
  SKIPPED_STAGES,
  SKIPPED_STAGE_INDEXES,
  STAGE_INTROS,
  STAGES,
  firstName,
  nextStageIndex,
  pathPosition,
  stageStateAt,
  type StageState,
} from "@/data/lifecycle";
import { CHIP, Tag, type Tone } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The record's landing page ──
// Everything you need before opening the workflow: where the use case is, what
// you have to do about it, and how the 12 stages have gone (each completed stage
// carries its own outcome, so there's no separate wall of captured fields). All
// of it reads from STAGES / GATES / RECORD_DETAILS — there is no second dataset.

// State comes from the lifecycle, so the overview, the record and the stage path
// can't disagree about what a stage is — including the skipped ones.
const stateOf = (index: number) => stageStateAt(index);

// ── Role-aware actions ──
// One list, ordered yours-first. "Yours" is anything the current profile is the
// named owner or approver of and that is reachable now; the rest is somebody
// else's move. A stage you own is work to record; a gate you approve is a
// decision to make — the row's detail line says which, so the tag only has to
// name whose turn it is.

type ActionItem = {
  key: string;
  title: string;
  detail: string;
  // Whose turn it is (drives the avatar).
  who: string;
  mine: boolean;
  // What the row does: the button label when it's yours, otherwise who it's on.
  cta: string;
  tag: string;
  href: string;
  // 0 = yours now, 1 = someone else's move, 2 = not open yet.
  rank: 0 | 1 | 2;
};

function actionsFor(person: string): ActionItem[] {
  const items: ActionItem[] = [];
  const active = STAGES[ACTIVE_STAGE_INDEX];

  // The stage that is open right now.
  const activeIsMine = active.owner === person;
  items.push({
    key: `stage-${ACTIVE_STAGE_INDEX}`,
    title: active.name,
    detail: `${active.rows.length} details still to capture — ${active.rows.map(([label]) => label).join(", ")}.`,
    who: active.owner,
    mine: activeIsMine,
    cta: "Capture the details",
    tag: activeIsMine ? "Your turn" : `Waiting on ${firstName(active.owner)}`,
    href: `/detail?stage=${ACTIVE_STAGE_INDEX}`,
    rank: activeIsMine ? 0 : 1,
  });

  // Gates. A gate the lifecycle has reached is a live decision; one it hasn't is
  // only worth showing to the person who will have to make it.
  for (const gate of GATES) {
    // A waived gate has no decision left in it, and neither does a passed one.
    if (gate.status === "Passed" || gate.status === "Waived") continue;
    const gateStageIndex = STAGES.findIndex((stage) => stage.name === gate.afterStage);
    const reached = gateStageIndex <= ACTIVE_STAGE_INDEX;
    const mine = gate.approver === person;
    if (!reached && !mine) continue;
    items.push({
      key: `gate-${gate.id}`,
      title: `${gate.id} · ${gate.name}`,
      detail: !reached
        ? `Opens after ${gate.afterStage}.`
        : gate.artifacts.length
          ? `Sign off the evidence — ${gate.artifacts.join(", ")}.`
          : "Record the gate decision.",
      who: gate.approver,
      mine: mine && reached,
      cta: "Review and sign off",
      tag: !reached ? `Opens after ${gate.afterStage}` : mine ? "Your review" : `Waiting on ${firstName(gate.approver)}`,
      href: gateStageIndex >= 0 ? `/detail?stage=${gateStageIndex}` : "/detail",
      rank: !reached ? 2 : mine ? 0 : 1,
    });
  }

  // Stages further down the path that this person will own.
  STAGES.forEach((stage, index) => {
    if (index <= ACTIVE_STAGE_INDEX || stage.owner !== person) return;
    // A skipped stage is nobody's work — it never opens.
    if (SKIPPED_STAGE_INDEXES.includes(index)) return;
    items.push({
      key: `later-${index}`,
      title: stage.name,
      detail: STAGE_INTROS[stage.name] ?? "",
      who: stage.owner,
      mine: false,
      cta: "Open the stage",
      tag: "Not open yet",
      href: `/detail?stage=${index}`,
      rank: 2,
    });
  });

  return items.sort((a, b) => a.rank - b.rank);
}

// The overview rail's responder: answers its starters from the record itself —
// the action list it already computes, the completed stages' outcomes, and who
// picks the record up next.
// ai-upgrade: swap the keyword matching for a real model call.
function answerAboutRecord(question: string, person: string, actions: ActionItem[]): string | undefined {
  const asked = question.toLowerCase();

  if (/outstanding|left|remaining|to do|need/.test(asked)) {
    const mine = actions.filter((action) => action.mine);
    const open = actions.filter((action) => action.rank === 1);
    if (mine.length) return `Yours on this record:\n\n${mine.map((action) => `• ${action.title} — ${action.detail}`).join("\n")}`;
    return open.length
      ? `Nothing is waiting on ${person}. The record is waiting on:\n\n${open.map((action) => `• ${action.title} — ${action.tag.replace("Waiting on ", "")}`).join("\n")}`
      : `Nothing is outstanding — every open step is done.`;
  }

  if (/decision|decided|so far|history|outcome|progress/.test(asked)) {
    const lines = COMPLETED_STAGE_INDEXES.map((index) => {
      const stage = STAGES[index];
      const outcome = stage.rows.find(([label]) => OUTCOME_ROW.test(label)) ?? stage.rows[0];
      return `• ${stage.name} — ${outcome[1]} (${stage.owner})`;
    });
    const passed = GATES.filter((gate) => gate.status === "Passed").map((gate) => gate.id);
    const waived = SKIPPED_STAGE_INDEXES.map((index) => STAGES[index].name);
    return `${COMPLETED_STAGE_INDEXES.length} of ${PATH_STAGE_COUNT} stages are complete${passed.length ? `, with ${passed.join(" and ")} passed` : ""}${
      waived.length ? `, and ${waived.join(" and ")} skipped` : ""
    }:\n\n${lines.join("\n")}`;
  }

  if (/next|who owns|after this|upcoming/.test(asked)) {
    const nextIndex = nextStageIndex(ACTIVE_STAGE_INDEX);
    const next = nextIndex === null ? undefined : STAGES[nextIndex];
    const active = STAGES[ACTIVE_STAGE_INDEX];
    return next
      ? `${active.name} is with ${active.owner} now. Next is ${next.name}, owned by ${next.owner} — ${STAGE_INTROS[next.name] ?? ""}`.trim()
      : `${active.name} is the last stage, and it's with ${active.owner}.`;
  }

  return undefined;
}

// Earlier conversations about this record, alongside anything said now.
const RECORD_HISTORY: ChatSession[] = [
  {
    id: "seed-decisions",
    title: "Summarise the decisions so far",
    when: "Jul 5",
    turns: [
      { role: "user", text: "Summarise the decisions so far", time: "3:41 PM" },
      {
        role: "assistant",
        text: "9 of 12 stages are complete, with R1 and R2 passed. Triage set a full assessment, risk & compliance cleared with conditions, and GTAC funded it at the June board.",
      },
      { role: "user", text: "Any conditions attached?", time: "3:43 PM" },
      { role: "assistant", text: "Yes — human review stays mandatory on every output, and the CSV documentation has to close before production." },
    ],
  },
  {
    id: "seed-owner",
    title: "Who owns the next stage?",
    when: "Jun 30",
    turns: [
      { role: "user", text: "Who owns the next stage?", time: "9:18 AM" },
      { role: "assistant", text: "Solutionise and Production is with Noah R. now. Next is Monitoring and tracking, owned by Marco B." },
    ],
  },
];

export default function OverviewPage() {
  // Default to whoever the record is actually waiting on, so the page opens in its
  // "something needs you" state rather than a list of other people's work.
  const [currentUser, setCurrentUser] = useState(STAGES[ACTIVE_STAGE_INDEX].owner);
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
  const history = useChatSessions(RECORD_HISTORY);
  const liveTurns = useRef<ChatTurn[]>([]);
  const pastSession = history.sessions.find((session) => session.id === history.activeId) ?? null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The record block only takes a rule once the table has scrolled under it.
  const [tableScrolled, setTableScrolled] = useState(false);
  const actions = useMemo(() => actionsFor(currentUser), [currentUser]);

  const activeStage = STAGES[ACTIVE_STAGE_INDEX];

  return (
    <AppShell
      railExpanded={railMode.expanded}
      railCollapsed={railMode.collapsed}
      aside={detailsOpen ? <RecordDetailsSheet onClose={() => setDetailsOpen(false)} /> : undefined}
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
            intro={`This is ${USE_CASE.name} (${USE_CASE.id}). It's at ${activeStage.name}, stage ${pathPosition(ACTIVE_STAGE_INDEX)} of ${PATH_STAGE_COUNT}, with ${activeStage.owner} preparing it. Ask me anything, or open the workflow to record the next stage.`}
            emptyTitle={`How can I help, ${firstName(currentUser)}?`}
            starters={[
              { label: "What's outstanding?", icon: <ListChecks size={13} /> },
              { label: "Summarise the decisions so far", icon: <Gavel size={13} /> },
              { label: "Who owns the next stage?", icon: <User size={13} /> },
            ]}
            answer={(question) => answerAboutRecord(question, currentUser, actions)}
            placeholder="Ask about this use case"
            reply="I can answer on what's outstanding, the decisions so far, and who owns the next stage. Open the Workflow tab and I'll walk you through the stage you own."
          />
        </div>
      }
    >
      <ContentPanel
        // The record block stays put and the lifecycle scrolls under it, the way the
        // stage form works — so the name and its status are always on screen.
        scroll={false}
        breadcrumb={
          <PanelBreadcrumb
            items={[
              { label: "All use cases", href: "/" },
              { label: USE_CASE.id, icon: <FileText size={13} />, title: USE_CASE.name },
            ]}
          />
        }
        controls={
          <>
            {/* Details first, the profile last — the same order the tracker's header ends on, so the
                switcher is the final thing in the header row on every surface. A rule between them:
                one is a panel this page can show, the other is who you are. */}
            <TabBarToggle label="Details" icon={<Info size={15} />} active={detailsOpen} onClick={() => setDetailsOpen((open) => !open)} />
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-[var(--border-default)]" />
            <ProfileSwitcher currentUser={currentUser} onUserChange={setCurrentUser} compact />
          </>
        }
      >
        <RecordSummary currentUser={currentUser} divider={tableScrolled} />
        {/* The table takes the record block's side padding, so its box lines up with
            the name above it, and scrolls on its own beneath it. */}
        <div
          onScroll={(event) => setTableScrolled(event.currentTarget.scrollTop > 4)}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-5"
        >
          <LifecycleTable currentUser={currentUser} />
        </div>
      </ContentPanel>
    </AppShell>
  );
}

// ── The record header block ──
// One status line, one lead paragraph, three facts. The record's id and phase are
// in the panel breadcrumb and the gate is an action row below, so neither is
// repeated here.

// ── The lifecycle, as a table ──
// Every stage on one row: where it is, whose it is, what came out of it. The rows
// link into the workflow at that stage.

const STATE_TONE: Record<StageState, Tone> = { complete: "success", active: "info", skipped: "waived", upcoming: "neutral" };
const STATE_LABEL: Record<StageState, string> = { complete: "Complete", active: "In progress", skipped: "Skipped", upcoming: "Not started" };
const STATE_ICON: Record<StageState, ReactNode> = {
  complete: <CheckCircle2 size={11} />,
  active: <CircleDot size={11} />,
  skipped: <MinusCircle size={11} />,
  upcoming: <Circle size={11} />,
};

function LifecycleTable({ currentUser }: { currentUser: string }) {
  return (
    // The columns a stage actually has: its number, its name, where it stands, who
    // holds it, and what came out of it. No phase column — the phase track above
    // the table is what groups these twelve stages. Numbers and dates are mono, so
    // they line up as data.
    // The table sits in its own box, so the header band and the rows are held by a
    // rounded edge rather than running into the page.
    <div className="no-scrollbar min-w-0 overflow-auto rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)]">
      <table className="w-full min-w-[880px] table-fixed border-collapse">
        <colgroup>
          <col className="w-[6%]" />
          <col className="w-[30%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col className="w-[30%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[var(--surface-header)]">
          <tr className="border-b border-[var(--border-default)] text-left">
            <TableHead className="pl-4">#</TableHead>
            <TableHead icon={<Flag size={12} />}>Stage</TableHead>
            <TableHead icon={<CircleDot size={12} />}>Status</TableHead>
            <TableHead icon={<User size={12} />}>Owner</TableHead>
            <TableHead icon={<CheckCircle2 size={12} />} className="pr-4">
              Outcome
            </TableHead>
          </tr>
        </thead>

        {/* One flat list: the phase bands were separating twelve rows into four
            groups of three, which the numbers and the stage names already carry. */}
        <tbody>
          {STAGES.map((stage, index) => {
            const state = stateOf(index);
            const skip = SKIPPED_STAGES[stage.name];
            const outcome = stage.rows.find(([label]) => OUTCOME_ROW.test(label)) ?? stage.rows[0];
            const ownedByMe = stage.owner === currentUser;
            return (
              <tr
                key={stage.name}
                className={cn(
                  "group h-[52px] border-b border-[var(--border-hairline)] transition last:border-b-0",
                  state === "active" ? "bg-[var(--surface-muted)]" : "hover:bg-[var(--surface-hover)]",
                  state === "skipped" && "text-[var(--text-muted)]",
                )}
              >
                <td className="pl-4 pr-2 align-middle">
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">{String(index + 1).padStart(2, "0")}</span>
                </td>

                <th scope="row" className="min-w-0 px-3 text-left align-middle font-normal">
                  <Link href={`/detail?stage=${index}`} className="block min-w-0">
                    <span
                      className={cn(
                        "min-w-0 truncate text-[13px] transition",
                        state === "active"
                          ? "font-semibold text-[var(--accent-strong)]"
                          : "font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-strong)]",
                      )}
                    >
                      {stage.name}
                    </span>
                  </Link>
                </th>

                <td className="px-3 align-middle">
                  <Tag tone={STATE_TONE[state]} icon={STATE_ICON[state]} className={CHIP}>
                    {STATE_LABEL[state]}
                  </Tag>
                </td>

                <td className="min-w-0 px-3 align-middle">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <PersonAvatar name={stage.owner} size={20} highlight={ownedByMe} />
                    <span
                      className={cn("min-w-0 truncate text-[12px] text-[var(--text-body)]", ownedByMe && "font-semibold text-[var(--text-primary)]")}
                    >
                      {ownedByMe ? "You" : stage.owner}
                    </span>
                  </span>
                </td>

                <td className="min-w-0 px-3 pr-4 align-middle">
                  {/* A skipped stage has no outcome — it has a reason, and whose
                      call it was. */}
                  <span
                    data-tip={
                      skip
                        ? `Skipped by ${skip.by}, ${skip.when} — ${skip.reason}`
                        : state === "upcoming"
                          ? undefined
                          : `${outcome?.[0]} — ${outcome?.[1]}`
                    }
                    className={cn(
                      "block truncate text-[12px]",
                      state === "complete" || state === "active" ? "text-[var(--text-body)]" : "text-[var(--text-muted)]",
                    )}
                  >
                    {skip ? skip.reason : state === "upcoming" ? "Not recorded yet" : (outcome?.[1] ?? "—")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Column headers carry a small glyph, the way the reference tables label a column
// by its kind rather than by weight alone.
function TableHead({ icon, className, children }: { icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <th scope="col" className={cn("h-9 px-3 text-[11px] font-medium text-[var(--text-muted)]", className)}>
      <span className="inline-flex items-center gap-1.5">
        {icon ? <span className="shrink-0 text-[var(--text-muted)]">{icon}</span> : null}
        {children}
      </span>
    </th>
  );
}
