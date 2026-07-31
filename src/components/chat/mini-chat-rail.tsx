"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { PastChatTranscript, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { ChatComposer, ChatDock, ChatLine, ChatStartScreen, ChatTimeDivider, formatChatTime } from "@/components/chat/chat-ui";

// A composer-only assistant rail for the routes that don't run a guided flow
// (the tracker board and the record overview). Same chat kit as the record's
// flow; the route supplies `answer`, which reads the real data so the starters
// give real answers, and `reply` is the fallback for anything it can't match.
// ai-upgrade: replace the keyword matching in `answer` with a real model call.
// Phrasing that means "make me a new one" rather than "tell me about these".
const NEW_IDEA_RE = /\b(new use case|new ticket|raise|submit|start|create|build|draft|i want|we want|idea for)\b/i;

// A suggestion either sends as-is (a question) or drops an editable draft into the
// composer (anything the user is meant to finish in their own words). The icon is
// what makes it read as a suggestion rather than a tag — the same pill the stage
// chats use.
export type RailStarter = string | { label: string; draft?: string; icon?: ReactNode };

export function MiniChatRail({
  intro,
  starters,
  answer,
  reply,
  onScrolledChange,
  scrollRef,
  placeholder = "Ask about this",
  emptyTitle,
  past,
  wide = false,
  onTurnsChange,
  newIdeaHref,
}: {
  intro: string;
  starters: RailStarter[];
  // Route-supplied responder: returns undefined when it has nothing specific.
  answer?: (question: string) => string | undefined;
  reply: string;
  placeholder?: string;
  // The empty state shown before the first message: a headline and the intro as a
  // lead line, above the suggestions.
  emptyTitle?: string;
  // A past conversation to show instead of the live one: read-only, with a way
  // back to the current chat.
  past?: { session: ChatSession; onBack: () => void };
  // The rail is expanded to the full content width, so the greeting can breathe.
  wide?: boolean;
  // Lets the surface archive what's on screen when a new chat is started.
  onTurnsChange?: (turns: ChatTurn[]) => void;
  // Anything that reads as "I want to build X" opens the record's guided flow with
  // the idea carried across, instead of being answered in the rail. There is no
  // form in between.
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
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const empty = turns.length === 0;

  // The surface holds the archive, so it needs whatever is currently on screen.
  useEffect(() => {
    onTurnsChange?.(turns);
  }, [turns, onTurnsChange]);

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

  const suggestions = starters
    .slice(0, 3)
    .map((starter, index) => (typeof starter === "string" ? { id: String(index), label: starter } : { id: String(index), ...starter }));

  // A draft suggestion hands over the opening words with the cursor at the end —
  // the user finishes the sentence and sends it themselves.
  function pick(item: { label: string; draft?: string }) {
    const { draft: seed } = item;
    if (!seed) {
      send(item.label);
      return;
    }
    setDraft(seed);
    const input = inputRef.current;
    if (input) {
      input.focus();
      requestAnimationFrame(() => input.setSelectionRange(seed.length, seed.length));
    }
  }

  const composer = (
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
  );

  // A past conversation reads as a transcript: no composer, and a way back.
  if (past) {
    return <PastChatTranscript session={past.session} scrollRef={scrollRef} onScrolledChange={onScrolledChange} />;
  }

  // Nothing asked yet: the rail shows the shared start screen, laid out in normal
  // flow (an overlaying dock would sit on top of the lead line).
  if (empty) {
    return (
      <ChatStartScreen size={wide ? "lg" : "sm"} title={emptyTitle ?? "How can I help?"} lead={intro} starters={suggestions} onPick={pick}>
        {composer}
      </ChatStartScreen>
    );
  }

  return (
    // Centred and measured so the rail still reads well when it's expanded to
    // the full width of the window.
    <div className="relative mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={(event) => onScrolledChange?.(event.currentTarget.scrollTop > 4)}
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-1.5 pb-40 pt-1"
      >
        <ChatTimeDivider />
        <ChatLine text={intro} />
        {turns.map((turn, index) => (
          <ChatLine key={index} role={turn.role} text={turn.text} time={turn.time} activity={turn.activity} />
        ))}
      </div>
      <ChatDock>{composer}</ChatDock>
    </div>
  );
}
