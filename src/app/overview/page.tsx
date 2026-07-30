"use client";

import { ArrowRight, FileText, LayoutDashboard, LayoutList, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import {
  AppShell,
  AppTopBar,
  ContentPanel,
  PanelBreadcrumb,
  PanelTabs,
  RailHeader,
  useRailMode,
} from "@/components/app-shell";
import { MiniChatRail } from "@/components/chat/mini-chat-rail";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { USE_CASE } from "@/data/document-workflow-form-schema";
import {
  ACTIVE_STAGE_INDEX,
  COMPLETED_STAGE_INDEXES,
  GATE_TONE,
  GATES,
  RECORD_DETAILS,
  OUTCOME_ROW,
  STAGE_GROUPS,
  STAGE_INTROS,
  STAGES,
  type StageItem,
  firstName,
  gateForStage,
  phaseForStage,
  stageValue,
} from "@/data/lifecycle";
import { ProgressBar, StageNode } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The record's landing page ──
// Everything you need before opening the workflow: where the use case is, what
// you have to do about it, and how the 12 stages have gone (each completed stage
// carries its own outcome, so there's no separate wall of captured fields). All
// of it reads from STAGES / GATES / RECORD_DETAILS — there is no second dataset.

type StageState = "complete" | "active" | "upcoming";

function stateOf(index: number): StageState {
  if (COMPLETED_STAGE_INDEXES.includes(index)) return "complete";
  return index === ACTIVE_STAGE_INDEX ? "active" : "upcoming";
}

const recordDetail = (label: string) => RECORD_DETAILS.find(([key]) => key === label)?.[1];

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
    tag: activeIsMine ? "Your turn" : `Waiting on ${active.owner}`,
    href: `/detail?stage=${ACTIVE_STAGE_INDEX}`,
    rank: activeIsMine ? 0 : 1,
  });

  // Gates. A gate the lifecycle has reached is a live decision; one it hasn't is
  // only worth showing to the person who will have to make it.
  for (const gate of GATES) {
    if (gate.status === "Passed") continue;
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
      tag: !reached ? "Not open yet" : mine ? "Your review" : `Waiting on ${gate.approver}`,
      href: gateStageIndex >= 0 ? `/detail?stage=${gateStageIndex}` : "/detail",
      rank: !reached ? 2 : mine ? 0 : 1,
    });
  }

  // Stages further down the path that this person will own.
  STAGES.forEach((stage, index) => {
    if (index <= ACTIVE_STAGE_INDEX || stage.owner !== person) return;
    items.push({
      key: `later-${index}`,
      title: stage.name,
      detail: STAGE_INTROS[stage.name] ?? "",
      who: stage.owner,
      mine: false,
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
    return `${COMPLETED_STAGE_INDEXES.length} of ${STAGES.length} stages are complete${passed.length ? `, with ${passed.join(" and ")} passed` : ""}:\n\n${lines.join("\n")}`;
  }

  if (/next|who owns|after this|upcoming/.test(asked)) {
    const next = STAGES[ACTIVE_STAGE_INDEX + 1];
    const active = STAGES[ACTIVE_STAGE_INDEX];
    return next
      ? `${active.name} is with ${active.owner} now. Next is ${next.name}, owned by ${next.owner} — ${STAGE_INTROS[next.name] ?? ""}`.trim()
      : `${active.name} is the last stage, and it's with ${active.owner}.`;
  }

  return undefined;
}

export default function OverviewPage() {
  const [currentUser, setCurrentUser] = useState("Priya N.");
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
  const actions = useMemo(() => actionsFor(currentUser), [currentUser]);

  const activeStage = STAGES[ACTIVE_STAGE_INDEX];
  const nextStage = STAGES[ACTIVE_STAGE_INDEX + 1];

  return (
    <AppShell
      topBar={
        <AppTopBar
          title={USE_CASE.name}
          profile={<ProfileSwitcher currentUser={currentUser} onUserChange={setCurrentUser} compact />}
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
          activeId="overview"
          tabs={[
            { id: "overview", label: "Overview", icon: <LayoutDashboard size={14} /> },
            { id: "workflow", label: "Workflow", href: "/detail", icon: <LayoutList size={14} /> },
          ]}
        />
      }
      rail={
        <MiniChatRail
          scrollRef={railScrollRef}
          onScrolledChange={setRailScrolled}
          intro={`This is ${USE_CASE.name} (${USE_CASE.id}). It's at ${activeStage.name}, stage ${ACTIVE_STAGE_INDEX + 1} of ${STAGES.length}, with ${activeStage.owner} preparing it. Ask me anything, or open the workflow to record the next stage.`}
          starters={["What's outstanding?", "Summarise the decisions so far", "Who owns the next stage?"]}
          answer={(question) => answerAboutRecord(question, currentUser, actions)}
          placeholder="Ask about this use case"
          reply="I can answer on what's outstanding, the decisions so far, and who owns the next stage. Open the Workflow tab and I'll walk you through the stage you own."
        />
      }
    >
      <ContentPanel
        icon={<LayoutDashboard size={17} />}
        title="Overview"
        breadcrumb={<PanelBreadcrumb source={USE_CASE.id} item={phaseForStage(activeStage.name)} icon={<FileText size={13} />} />}
      >
        <RecordSummary activeStage={activeStage} currentUser={currentUser} />
        <Section title="What you need to do" hint={`As ${currentUser}`}>
          <ActionList actions={actions} currentUser={currentUser} />
        </Section>
        {/* The hint carries the one fact the track itself can't: what comes next. */}
        <Section title="The lifecycle" hint={nextStage ? `Next · ${nextStage.name} (${nextStage.owner})` : undefined}>
          <LifecycleTrack currentUser={currentUser} />
        </Section>
      </ContentPanel>
    </AppShell>
  );
}

// ── The record header block ──
// One status line, one lead paragraph, three facts. The record's id and phase are
// in the panel breadcrumb and the gate is an action row below, so neither is
// repeated here.

function RecordSummary({ activeStage, currentUser }: { activeStage: StageItem; currentUser: string }) {
  const tier = stageValue("Triage", "Risk governance tier");
  const overallRisk = stageValue("Assessment - Risk & Compliance", "Overall risk");
  const ownedByMe = activeStage.owner === currentUser;

  return (
    <div className="border-b border-[var(--border-hairline)] px-7 pb-6 pt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-[20px] leading-tight text-[var(--text-primary)]">{USE_CASE.name}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
          In delivery
        </span>
        <span className="text-[13px] text-[var(--text-muted)]">
          {activeStage.name} · stage {ACTIVE_STAGE_INDEX + 1} of {STAGES.length}
        </span>
      </div>

      <p className="mt-3 max-w-[82ch] text-[14px] leading-6 text-[var(--text-body)]">
        {stageValue("Ideation", "Problem statement")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px]">
        <Fact label="Stage owner">
          <span className="inline-flex items-center gap-1.5">
            <PersonAvatar name={activeStage.owner} size={20} highlight={ownedByMe} />
            <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{activeStage.owner}</span>
          </span>
        </Fact>
        <Fact label="Risk tier">
          <span className="text-[var(--text-primary)]">
            {tier ?? "—"}
            {overallRisk ? <span className="text-[var(--text-muted)]"> ({overallRisk.toLowerCase()} risk)</span> : null}
          </span>
        </Fact>
        <Fact label="Target go-live">
          <span className="text-[var(--text-primary)]">{recordDetail("Target go-live") ?? "—"}</span>
        </Fact>
      </div>

      <p className="mt-3 text-[12px] text-[var(--text-muted)]">
        Raised by {recordDetail("Created by")} on {recordDetail("Created on")}.
      </p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[var(--text-label)]">{label}</span>
      <span className="text-[var(--text-muted)]">·</span>
      {children}
    </span>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--border-hairline)] px-7 py-6 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[18px] leading-tight text-[var(--text-primary)]">{title}</h3>
        {hint ? <span className="shrink-0 text-[12px] text-[var(--text-muted)]">{hint}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ── What you need to do ──
// One list, yours first. Each row's tag names whose turn it is; the title never
// repeats the verb, and the detail line says what the move actually is.

function ActionList({ actions, currentUser }: { actions: ActionItem[]; currentUser: string }) {
  const nothingMine = !actions.some((action) => action.mine);

  return (
    <div>
      {nothingMine ? (
        <p className="text-[13px] leading-6 text-[var(--text-muted)]">
          Nothing needs {currentUser} right now — here&rsquo;s what the record is waiting on.
        </p>
      ) : null}
      <ul className={cn("space-y-2", nothingMine && "mt-3")}>
        {actions.map((action) => (
          <li key={action.key}>
            <Link
              href={action.href}
              className={cn(
                "flex items-start gap-3 rounded-[10px] border px-3.5 py-3 transition",
                action.mine
                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)]/50 hover:border-[var(--accent)]"
                  : action.rank === 2
                    ? "border-dashed border-[var(--border-default)] hover:bg-[var(--surface-muted)]"
                    : "border-[var(--border-default)] hover:bg-[var(--surface-muted)]",
              )}
            >
              <span className="mt-0.5 shrink-0">
                <PersonAvatar name={action.who} size={22} highlight={action.mine} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{action.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      action.mine
                        ? "bg-[var(--accent)] text-white"
                        : action.rank === 2
                          ? "text-[var(--text-muted)]"
                          : "bg-[var(--surface-strong)] text-[var(--text-label)]",
                    )}
                  >
                    {action.tag}
                  </span>
                </span>
                <span className="mt-1 block text-[12px] leading-5 text-[var(--text-body)]">{action.detail}</span>
              </span>
              <ArrowRight size={14} className="mt-1 shrink-0 text-[var(--text-muted)]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── The lifecycle ──
// Four phases in one line, each with its own progress; only the phase you're
// looking at lists its stages. Same node + connector language as the record's
// stage-path dropdown, so it reads as the same rail — just folded up.

type Phase = {
  name: string;
  stages: { index: number; stage: StageItem }[];
  done: number;
  total: number;
  isCurrent: boolean;
};

const PHASES: Phase[] = Object.entries(STAGE_GROUPS).map(([name, stageNames]) => {
  const stages = stageNames
    .map((stageName) => ({ index: STAGES.findIndex((stage) => stage.name === stageName), stage: STAGES.find((stage) => stage.name === stageName)! }))
    .filter((entry) => entry.index >= 0);
  return {
    name,
    stages,
    done: stages.filter((entry) => stateOf(entry.index) === "complete").length,
    total: stages.length,
    isCurrent: stages.some((entry) => entry.index === ACTIVE_STAGE_INDEX),
  };
});

function LifecycleTrack({ currentUser }: { currentUser: string }) {
  const currentPhase = PHASES.find((phase) => phase.isCurrent)?.name ?? PHASES[0].name;
  const [openPhase, setOpenPhase] = useState<string>(currentPhase);
  const openIndex = PHASES.findIndex((phase) => phase.name === openPhase);
  const open = PHASES[openIndex] ?? PHASES[0];

  return (
    <div className="min-w-0">
      {/* The phase rail: four nodes on one connected line. The line is the
          lifecycle; the tint marks how far along it the record is. */}
      <div className="relative grid grid-cols-4 gap-2">
        <span aria-hidden className="absolute inset-x-[12.5%] top-[10px] h-px bg-[var(--border-default)]" />
        {PHASES.map((phase, index) => {
          const complete = phase.done === phase.total;
          const isOpen = index === openIndex;
          return (
            <button
              key={phase.name}
              type="button"
              onClick={() => setOpenPhase(phase.name)}
              aria-expanded={isOpen}
              className="group relative min-w-0 rounded-[8px] px-1 pb-2 pt-0 text-left"
            >
              <span className="relative flex justify-center">
                <span className="rounded-full bg-[var(--surface)] p-0.5">
                  <StageNode state={complete ? "complete" : phase.isCurrent ? "active" : "upcoming"} size={20} />
                </span>
              </span>
              <span
                className={cn(
                  "mt-2 block truncate text-center text-[13px] transition",
                  isOpen ? "font-semibold text-[var(--accent-strong)]" : "font-medium text-[var(--text-body)] group-hover:text-[var(--text-primary)]",
                )}
              >
                {phase.name}
              </span>
              <span className="mt-1.5 block text-center text-[11px] tabular-nums text-[var(--text-muted)]">
                {phase.done}/{phase.total} stages
              </span>
              <ProgressBar ratio={phase.done / phase.total} complete={complete} className="mt-1.5" />
            </button>
          );
        })}
      </div>

      {/* The open phase's stages, anchored to the phase they belong to: a notch
          under the selected node, then the stage rail inside a tinted panel — so
          it reads as that phase opened up, not as a second unrelated row. */}
      <div className="relative mt-3">
        <span
          aria-hidden
          className="absolute -top-[7px] h-3 w-3 rotate-45 border-l border-t border-[var(--accent-border)] bg-[var(--accent-soft)]"
          style={{ left: `calc(${(openIndex + 0.5) * 25}% - 6px)` }}
        />
        <div className="rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-soft)]/45 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{open.name}</span>
            <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
              {open.done} of {open.total} stages complete
            </span>
          </div>
          <ol className="mt-2.5 min-w-0 space-y-1">
            {open.stages.map((entry, position) => {
              const state = stateOf(entry.index);
              const gate = gateForStage(entry.stage.name);
              const gateTone = gate ? GATE_TONE[gate.status] : null;
              const ownedByMe = entry.stage.owner === currentUser;
              const last = position === open.stages.length - 1;
              return (
                <li key={entry.stage.name} className="relative">
                  {/* The connector continues the rail down through the stages. */}
                  {last ? null : <span aria-hidden className="absolute left-[21px] top-[30px] bottom-[-6px] w-px bg-[var(--border-default)]" />}
                  <Link
                    href={`/detail?stage=${entry.index}`}
                    className={cn(
                      "flex min-w-0 items-center gap-2.5 rounded-[8px] border px-2.5 py-2 transition",
                      state === "active"
                        ? "border-[var(--accent-border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
                        : "border-transparent bg-[var(--surface)]/70 hover:border-[var(--accent-ring)] hover:bg-[var(--surface)]",
                    )}
                  >
                    <StageNode state={state} index={entry.index + 1} size={20} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px]",
                        state === "active" ? "font-semibold text-[var(--accent-strong)]" : "font-medium text-[var(--text-body)]",
                      )}
                    >
                      {entry.stage.name}
                    </span>
                    {gate && gateTone ? (
                      <span
                        title={`${gate.id} · ${gate.name} — approver ${gate.approver}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold"
                        style={{ color: gateTone.fg, background: gateTone.bg, borderColor: gateTone.border }}
                      >
                        <ShieldCheck size={10} />
                        {gate.id}
                      </span>
                    ) : null}
                    <span className={cn("shrink-0 text-[11px] text-[var(--text-muted)]", ownedByMe && "font-semibold text-[var(--text-body)]")}>
                      {firstName(entry.stage.owner)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
