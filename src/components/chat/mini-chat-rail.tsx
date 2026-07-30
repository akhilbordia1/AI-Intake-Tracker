"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type RefObject } from "react";

import {
  ChatComposer,
  ChatDock,
  ChatLine,
  ChatStarters,
  ChatTimeDivider,
  formatChatTime,
} from "@/components/chat/chat-ui";

// A composer-only assistant rail for the routes that don't run a guided flow
// (the tracker board and the record overview). Same chat kit as the record's
// flow; the route supplies `answer`, which reads the real data so the starters
// give real answers, and `reply` is the fallback for anything it can't match.
// ai-upgrade: replace the keyword matching in `answer` with a real model call.
// Phrasing that means "make me a new one" rather than "tell me about these".
const NEW_IDEA_RE = /\b(new use case|new ticket|raise|submit|start|create|build|draft|i want|we want|idea for)\b/i;

export function MiniChatRail({
  intro,
  starters,
  answer,
  reply,
  onScrolledChange,
  scrollRef,
  placeholder = "Ask about this",
  emptyTitle,
  starterGroups,
  newIdeaHref,
}: {
  intro: string;
  starters: string[];
  // Route-supplied responder: returns undefined when it has nothing specific.
  answer?: (question: string) => string | undefined;
  reply: string;
  placeholder?: string;
  // The empty state shown before the first message: a headline, the intro as a
  // lead line, and grouped suggestions.
  emptyTitle?: string;
  starterGroups?: { label: string; items: string[] }[];
  // Anything that reads as "I want to build X" hands off to the intake flow with
  // the idea carried across, instead of being answered in the rail.
  newIdeaHref?: string;
  // The rail's header lives in the shell's tab row, so the divider it shows once
  // the conversation scrolls under it is driven from here.
  onScrolledChange?: (scrolled: boolean) => void;
  // Lifted so the rail header's "jump to first message" can scroll it.
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<{ role: "assistant" | "user"; text: string; time?: string; activity?: string }[]>([]);
  const empty = turns.length === 0;

  function send(text: string) {
    const message = text.trim();
    if (!message) return;
    setDraft("");
    // "I want to build …" isn't a question about the portfolio — it's a new use
    // case. Acknowledge it in the rail, then hand off to the intake flow with the
    // idea in the URL so the user doesn't retype it.
    if (newIdeaHref && NEW_IDEA_RE.test(message)) {
      setTurns((current) => [
        ...current,
        { role: "user", text: message, time: formatChatTime() },
        { role: "assistant", text: "Starting a new use case from that", activity: "Opening" },
      ]);
      router.push(`${newIdeaHref}?idea=${encodeURIComponent(message)}`);
      return;
    }
    setTurns((current) => [
      ...current,
      { role: "user", text: message, time: formatChatTime() },
      { role: "assistant", text: answer?.(message) ?? reply },
    ]);
  }

  return (
    // Centred and measured so the rail still reads well when it's expanded to
    // the full width of the window.
    <div className="relative mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={(event) => onScrolledChange?.(event.currentTarget.scrollTop > 4)}
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-40 pt-1"
      >
        {empty ? (
          // Empty state: what this assistant is for, before anything is asked.
          <div className="mt-auto pb-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles size={16} />
            </span>
            <h2 className="font-display mt-3 text-[18px] leading-snug text-[var(--text-primary)]">{emptyTitle ?? "How can I help?"}</h2>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-body)]">{intro}</p>
          </div>
        ) : (
          <>
            <ChatTimeDivider />
            <ChatLine text={intro} />
            {turns.map((turn, index) => (
              <ChatLine key={index} role={turn.role} text={turn.text} time={turn.time} activity={turn.activity} />
            ))}
          </>
        )}
      </div>
      <ChatDock>
        {/* Suggestions: grouped when the route supplies groups (so "start
            something" reads apart from "ask about what's here"), flat otherwise. */}
        {empty ? (
          starterGroups?.length ? (
            <div className="space-y-1.5 pb-1.5">
              {starterGroups.map((group) => (
                <div key={group.label}>
                  <div className="pb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">{group.label}</div>
                  <ChatStarters padded={false} items={group.items.map((label, index) => ({ id: `${group.label}-${index}`, label }))} onPick={(item) => send(item.label)} />
                </div>
              ))}
            </div>
          ) : (
            <ChatStarters items={starters.map((label, index) => ({ id: String(index), label }))} onPick={(item) => send(item.label)} />
          )
        ) : null}
        <ChatComposer
          inputRef={inputRef}
          value={draft}
          onChange={setDraft}
          onSend={() => send(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          placeholder={placeholder}
        />
      </ChatDock>
    </div>
  );
}
