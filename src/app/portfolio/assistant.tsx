"use client";

// ── The leadership assistant ──
// The brain that answered the portfolio rail: seeded conversations, a keyword responder over the
// same derivations the tiles use, and the thinking beat before an answer.
//
// It lives here rather than in `page.tsx` because the rail it fed has been removed — a committee
// page is read across its full width, so the assistant is becoming a docked dialog instead of a
// permanent 364px column. Nothing renders this yet. It is kept whole, and out of the route, so
// the dock is a wiring job rather than a rewrite.

import { ChatCardList } from "@/components/chat/chat-use-case-card";
import { Markdown } from "@/components/document-record/markdown";
import type { ChatSession } from "@/components/chat/chat-history";
import type { RailAnswer } from "@/components/chat/mini-chat-rail";
import { STAGE_GROUPS, phaseForStage } from "@/data/lifecycle";
import { ALL_RECORDS, AS_OF, PORTFOLIO_SNAPSHOTS, USE_CASES, type UseCaseCard } from "@/data/registry";
import {
  aging,
  attainmentSummary,
  blockers,
  capacityByOwner,
  formatDay,
  gateMix,
  gateOutcomes,
  headline,
  kpiAttainment,
  medianCycleDaysByPhase,
  moneyTable,
  oldestOpenGate,
  pct,
  phasesBySpeed,
  portfolioDigest,
  riskMix,
  throughput,
  usd,
  valueByFunction,
  type PhaseMap,
} from "@/lib/portfolio";

const PHASES: PhaseMap = { order: Object.keys(STAGE_GROUPS), phaseOf: phaseForStage };

// ── Earlier conversations, in the same voice as the other rails ──
export const LEADERSHIP_HISTORY: ChatSession[] = [
  {
    id: "seed-value",
    title: "What's the value so far?",
    when: "Fri",
    turns: [
      { role: "user", text: "What's the value so far?", time: "9:24 AM" },
      {
        role: "assistant",
        text: "$1.79M is committed against $1.08M of confirmed benefit from the 5 live use cases — about 20 months to pay back. Their business cases projected $1.55M, so we are realising 70% of what was promised.",
      },
      { role: "user", text: "Which one pays back fastest?", time: "9:26 AM" },
      {
        role: "assistant",
        text: "Meeting Notes Summariser: $95K spent, $140K a year confirmed against $150K projected, so about 8 months. It is also the closest to its business case of anything we have shipped.",
      },
    ],
  },
  {
    id: "seed-clog",
    title: "Where is it clogging?",
    when: "Jul 2",
    turns: [
      { role: "user", text: "Where is it clogging?", time: "2:41 PM" },
      {
        role: "assistant",
        text: "Delivery is the longest phase at 67 days, but most of that is build. The one to watch is Governance & Risk at 33 days for a decision — that's queueing, not work.",
      },
      { role: "user", text: "What's sitting there?", time: "2:43 PM" },
      {
        role: "assistant",
        text: "Customer Churn Signal Model at R2 in review, and Invoice Exception Classifier, whose R2 is blocked — Elena Weber owns that one.",
      },
    ],
  },
];

// ── The rail's responder ──
// The tracker's rail answers about records; this one answers about the system. The
// one overlap is "what's not moving", which both can answer — the same assistant
// shouldn't refuse a question because you asked it on the wrong page.
//
// Every branch also names where it can go next. The starters only exist on the empty
// state, so an answer without follow-ups leaves the reader guessing what else this
// thing knows — and each `followUps` string is phrased to land on another branch here.
// ai-upgrade: swap the keyword matching for a real model call.
export function answerForLeader(question: string, cards: UseCaseCard[], person: string): RailAnswer | undefined {
  const asked = question.toLowerCase();
  const h = headline(cards, PORTFOLIO_SNAPSHOTS, AS_OF);

  if (/digest|brief|state of|how are we|how's the portfolio|where do we stand|summar/.test(asked)) {
    return {
      text: `Here's where it stands as of ${formatDay(AS_OF)}.`,
      detail: <Markdown source={portfolioDigest(cards, PORTFOLIO_SNAPSHOTS, PHASES, AS_OF)} />,
      followUps: ["Where is it clogging?", "What's not moving?", "Which targets are we missing?"],
    };
  }

  if (/blocked|stuck|not moving|on hold|holding|waiting|aging|old/.test(asked)) {
    const stalled = blockers(cards);
    const aged = aging(cards, AS_OF).map((row) => row.card);
    const shown = [...new Set([...stalled, ...aged])].filter((card) => USE_CASES.includes(card));
    return shown.length
      ? {
          text: `${stalled.length} ${stalled.length === 1 ? "record isn't" : "records aren't"} moving, and ${aged.length} have been in the same stage for over a week:`,
          detail: <ChatCardList cards={shown.slice(0, 5)} />,
          followUps: ["Who has the most open?", "How are gate decisions going?", "Where is it clogging?"],
        }
      : "Everything on the board has moved in the last week.";
  }

  if (/slow|clog|cycle|how long|throughput|speed|bottleneck|intake/.test(asked)) {
    const cycle = medianCycleDaysByPhase(cards, PHASES);
    const ranked = phasesBySpeed(cycle, PHASES);
    const slow = ranked[0];
    const fast = ranked[ranked.length - 1];
    return {
      text: `${slow} is the slow phase — a median of ${cycle[slow]?.days} days across ${cycle[slow]?.sample} records, against ${cycle[fast]?.days} in ${fast}. A gate decision now takes ${h.decisionDays} days, down from ${h.decisionDays + h.decisionTrend} in ${h.since}.`,
      followUps: ["What's not moving?", "How many came in per month?", "Who has the most open?"],
    };
  }

  if (/value|money|invest|benefit|payback|roi|saving|cost|spend/.test(asked)) {
    return {
      text: `${usd(h.investment)} committed, ${usd(h.benefit)} of annualised benefit from the ${h.live} live — about ${h.paybackMonths} months to pay back.`,
      detail: <Markdown source={moneyTable(cards)} />,
      followUps: ["Which targets are we missing?", "Which business functions is it in?", "What's the risk mix?"],
    };
  }

  if (/gate|approv|pass rate|decision|reject/.test(asked)) {
    const gates = gateOutcomes(cards);
    const oldest = oldestOpenGate(cards, AS_OF);
    return {
      text: `${pct(gates.passRate)} of ${gates.decided} gate decisions have been approvals — ${gates.passed} passed, ${gates.negative} blocked or rejected. ${
        gates.open
      } are open${oldest ? `, the oldest ${oldest.card.gate?.id} on ${oldest.card.title}, ${oldest.days} days with ${oldest.card.actionOwner}` : ""}. Current mix: ${gateMix(
        cards,
      )
        .map((row) => `${row.count} ${row.status.toLowerCase()}`)
        .join(", ")}.`,
      followUps: ["What's not moving?", "What's the risk mix?", "Where is it clogging?"],
    };
  }

  if (/throughput|raised|intake volume|per month|how many came/.test(asked)) {
    const months = throughput(PORTFOLIO_SNAPSHOTS);
    return {
      text: `By month: ${months
        .map(
          (month) =>
            `${month.label} ${month.submitted} raised, ${month.approved} approved, ${month.closed} closed${month.partial ? " (so far)" : ""}`,
        )
        .join("; ")}.`,
      followUps: ["Where is it clogging?", "How are gate decisions going?"],
    };
  }

  if (/function|department|business unit|which team/.test(asked)) {
    return {
      text: `By function: ${valueByFunction(cards)
        .map((row) => `${row.fn} ${usd(row.investment)} across ${row.count}`)
        .join(", ")}.`,
      followUps: ["What's the value so far?", "What's the risk mix?"],
    };
  }

  if (/risk|tier|exposure|compliance/.test(asked)) {
    const mix = riskMix(cards);
    const full = cards.filter((card) => card.riskTier === "Full");
    return {
      text: `${mix.map((row) => `${row.count} ${row.tier.toLowerCase()}`).join(", ")}. The full-tier ones are ${full
        .map((card) => card.title)
        .join(", ")} — those carry the assessments that take the longest.`,
      followUps: ["Where is it clogging?", "How are gate decisions going?"],
    };
  }

  if (/kpi|target|attainment|hitting|met|missing|performing/.test(asked)) {
    const rows = kpiAttainment(cards);
    const summary = attainmentSummary(rows);
    const misses = rows.filter((row) => !row.met);
    return {
      text: `${summary.met} of ${summary.total} production targets are being met. ${
        misses.length
          ? `The misses: ${misses.map((row) => `${row.card.title} — ${row.name} at ${row.actual}${row.unit} against ${row.target}${row.unit}`).join("; ")}.`
          : "Nothing is behind."
      }`,
      followUps: ["What's the value so far?", "Which business functions is it in?"],
    };
  }

  if (/capacity|load|overload|who owns|who has|busiest|mine|my /.test(asked)) {
    const named = cards.filter((card) => card.actionOwner === person && card.lifecycle === "Active");
    if (/mine|my /.test(asked) && named.length) {
      return {
        text: `${named.length} ${named.length === 1 ? "record is" : "records are"} with ${person}:`,
        detail: <ChatCardList cards={named} />,
        followUps: ["What's not moving?", "Brief me on the portfolio"],
      };
    }
    const load = capacityByOwner(cards, AS_OF);
    return {
      text: `${load
        .slice(0, 3)
        .map((row) => `${row.owner} has ${row.open} open${row.attention ? `, ${row.attention} needing a decision` : ""}`)
        .join("; ")}. The oldest thing anyone is sitting on is ${load[0]?.oldestDays} days.`,
      followUps: ["What's not moving?", "Where is it clogging?"],
    };
  }

  return undefined;
}

// A work step before the answer, so a portfolio question reads as reasoning over the
// registry rather than a lookup.
export function thinkingBeatFor(question: string) {
  const asked = question.toLowerCase();
  if (/digest|brief|state of|summar/.test(asked)) return { activity: "Assembling", text: `the digest from ${ALL_RECORDS.length} records` };
  if (/value|money|payback|roi/.test(asked)) return { activity: "Adding up", text: "investment and benefit by state" };
  if (/slow|clog|cycle|throughput|blocked|aging/.test(asked)) return { activity: "Counting", text: "days in stage across the board" };
  return { activity: "Reading", text: `${PORTFOLIO_SNAPSHOTS.length} months of the registry` };
}
