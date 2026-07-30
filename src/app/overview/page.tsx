"use client";

import { FileText, Info } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { AppShell, ContentPanel, PanelBreadcrumb, RailHeader, TabBarToggle, useRailMode } from "@/components/app-shell";
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
  SUBSTAGE_TO_GROUP,
  STAGE_INTROS,
  STAGES,
  firstName,
} from "@/data/lifecycle";
import { StageNode } from "@/components/ui/kit";
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
      cta: "Review and sign off",
      tag: !reached ? `Opens after ${gate.afterStage}` : mine ? "Your review" : `Waiting on ${firstName(gate.approver)}`,
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
  // Default to whoever the record is actually waiting on, so the page opens in its
  // "something needs you" state rather than a list of other people's work.
  const [currentUser, setCurrentUser] = useState(STAGES[ACTIVE_STAGE_INDEX].owner);
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
  // Bumping this remounts the rail, which is exactly "start a new chat".
  const [chatKey, setChatKey] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
          canJumpToTop={railScrolled}
          onJumpToTop={() => railScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          expanded={railMode.expanded}
          onToggleExpand={railMode.toggleExpand}
          collapsed={railMode.collapsed}
          onToggleCollapse={railMode.toggleCollapse}
          onNewChat={() => setChatKey((key) => key + 1)}
        />
      }
      rail={
        <MiniChatRail
          key={chatKey}
          scrollRef={railScrollRef}
          onScrolledChange={setRailScrolled}
          intro={`This is ${USE_CASE.name} (${USE_CASE.id}). It's at ${activeStage.name}, stage ${ACTIVE_STAGE_INDEX + 1} of ${STAGES.length}, with ${activeStage.owner} preparing it. Ask me anything, or open the workflow to record the next stage.`}
          emptyTitle={`How can I help, ${firstName(currentUser)}?`}
          starters={["What's outstanding?", "Summarise the decisions so far", "Who owns the next stage?"]}
          answer={(question) => answerAboutRecord(question, currentUser, actions)}
          placeholder="Ask about this use case"
          reply="I can answer on what's outstanding, the decisions so far, and who owns the next stage. Open the Workflow tab and I'll walk you through the stage you own."
        />
      }
    >
      <ContentPanel
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
            <TabBarToggle label="Details" icon={<Info size={15} />} active={detailsOpen} onClick={() => setDetailsOpen((open) => !open)} />
            <ProfileSwitcher currentUser={currentUser} onUserChange={setCurrentUser} compact />
          </>
        }
      >
        <RecordSummary currentUser={currentUser} />
        {/* Two columns: the work on the left, where it needs the reading width;
 the lifecycle on the right as a vertical rail, which fills the column
 instead of leaving a band of dead space under a thin strip. */}
        <LifecycleTable currentUser={currentUser} />
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

function LifecycleTable({ currentUser }: { currentUser: string }) {
  return (
    <div className="no-scrollbar min-w-0 overflow-auto">
      <table className="w-full min-w-[820px] table-fixed border-collapse">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[17%]" />
          <col className="w-[18%]" />
          <col className="w-[35%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[var(--surface-muted)]">
          <tr className="border-b border-[var(--border-default)] text-left">
            <th scope="col" className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">
              Stage
            </th>
            <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">
              Phase
            </th>
            <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">
              Owner
            </th>
            <th scope="col" className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">
              Outcome
            </th>
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage, index) => {
            const state = stateOf(index);
            const outcome = stage.rows.find(([label]) => OUTCOME_ROW.test(label)) ?? stage.rows[0];
            const ownedByMe = stage.owner === currentUser;
            return (
              <tr
                key={stage.name}
                className={cn(
                  "group h-[52px] border-b border-[var(--border-hairline)] transition last:border-b-0",
                  state === "active" ? "bg-[var(--accent-soft)]/50" : "hover:bg-[var(--accent-hover-bg)]",
                )}
              >
                <th scope="row" className="min-w-0 px-6 text-left align-middle font-normal">
                  <Link href={`/detail?stage=${index}`} className="flex min-w-0 items-center gap-2.5">
                    <StageNode state={state} index={index + 1} size={18} />
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
                <td className="px-3 align-middle text-[12px] text-[var(--text-muted)]">{SUBSTAGE_TO_GROUP[stage.name] ?? "—"}</td>
                <td className="min-w-0 px-3 align-middle">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <PersonAvatar name={stage.owner} size={18} highlight={ownedByMe} />
                    <span
                      className={cn("min-w-0 truncate text-[12px] text-[var(--text-body)]", ownedByMe && "font-semibold text-[var(--text-primary)]")}
                    >
                      {ownedByMe ? "You" : stage.owner}
                    </span>
                  </span>
                </td>
                <td className="min-w-0 px-6 align-middle">
                  <span
                    title={state === "upcoming" ? undefined : outcome?.[1]}
                    className={cn("block truncate text-[12px]", state === "upcoming" ? "text-[var(--text-muted)]" : "text-[var(--text-body)]")}
                  >
                    {state === "upcoming" ? "Not recorded yet" : (outcome?.[1] ?? "—")}
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
