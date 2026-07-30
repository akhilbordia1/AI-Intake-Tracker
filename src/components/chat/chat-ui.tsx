"use client";

import { ArrowUp, AtSign, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/cn";

// ── The shared chat kit ──
// One look for every conversation in the product (the record's guided flow, its
// read-only stage chats, and the create-page composer): plain assistant text,
// a grey bubble for the user, tight activity lines while the agent works, and a
// single composer shape. Anything chat-shaped should be built from these parts
// rather than restyled locally.

// The conversation type scale. Kept here so all three chats stay in step.
const BODY = "text-[13px] leading-[1.65] tracking-[-0.05px]";

export function formatChatTime(date: Date = new Date()) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Centred date/time marker that opens a conversation. The clock differs between
// the prerender and the client, which is fine for a timestamp — hence the
// suppressed hydration warning rather than an effect.
export function ChatTimeDivider() {
  return (
    <div suppressHydrationWarning className="py-1 text-center text-[11px] text-[var(--text-muted)]">
      {`Today, ${formatChatTime()}`}
    </div>
  );
}

// One line of a conversation. `activity` renders a work step (bold label + muted
// detail); everything else is a message — the assistant as plain prose, the user
// as a right-aligned bubble with its send time. There is no boxed variant: what
// the agent says is a message, not a callout.
export type ChatLineProps = {
  role?: "assistant" | "user";
  text: string;
  recap?: boolean;
  time?: string;
  activity?: string;
  running?: boolean;
};

export function ChatLine({ role = "assistant", text, recap = false, time, activity, running = false }: ChatLineProps) {
  if (activity) {
    return (
      <div className="bubble-in-left flex items-baseline gap-2 text-[12px] leading-[1.6]">
        <span className="mt-[3px] shrink-0 self-start text-[var(--text-muted)]">
          {running ? (
            <LoaderCircle size={13} className="animate-spin text-[var(--accent)]" />
          ) : (
            <Check size={13} className="text-[var(--status-success)]" />
          )}
        </span>
        <span className="font-medium text-[var(--text-primary)]">{activity}</span>
        <span className="min-w-0 text-[var(--text-muted)]">{text}</span>
      </div>
    );
  }

  if (recap || role === "assistant") {
    return (
      <div className={cn("bubble-in-left max-w-[88%] py-0.5 text-[var(--text-body)]", BODY)}>
        <Collapsible text={text} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <div className={cn("bubble-in-right max-w-[82%] rounded-[14px] bg-[var(--surface-bubble)] px-4 py-2.5 text-[var(--text-primary)]", BODY)}>
        <Collapsible text={text} />
      </div>
      {time ? <span className="mt-1 pr-1 text-[11px] text-[var(--text-muted)]">{time}</span> : null}
    </div>
  );
}

// Composer dock: overlays the bottom of the conversation so messages scroll
// behind it, with a fade so they dissolve rather than clip at a hard edge.
export function ChatDock({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="h-10 bg-gradient-to-b from-transparent to-[var(--shell-canvas)]" />
      <div className="pointer-events-auto bg-[var(--shell-canvas)]">{children}</div>
    </div>
  );
}

// The one composer shape: textarea, a mention control on the left, a circular
// send on the right that stays visible (disabled) while there's nothing to send.
export function ChatComposer({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  placeholder,
  disabled = false,
  sendDisabled = false,
  size = "sm",
  padded = true,
}: {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  size?: "sm" | "lg";
  padded?: boolean;
}) {
  const large = size === "lg";
  const canSend = Boolean(value.trim()) && !sendDisabled && !disabled;
  return (
    <div className={cn("shrink-0", padded && "pt-1.5")}>
      <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] px-2 pb-1.5 pt-2.5 transition focus-within:border-[var(--accent-ring)]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "no-scrollbar block w-full resize-none bg-transparent px-1 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60",
            large ? "max-h-40 min-h-[62px] text-[15px] leading-6" : "max-h-32 min-h-[36px] text-[13px] leading-[20px]",
          )}
        />
        <div className="mt-0.5 flex items-center justify-between">
          {/* Starts a mention in the draft — the one left-hand control that has
 something real to do without a backend. */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(value && !value.endsWith(" ") ? `${value} @` : `${value}@`);
              inputRef?.current?.focus();
            }}
            aria-label="Mention someone"
            data-tip="Mention someone"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            <AtSign size={16} />
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
              canSend
                ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                : "cursor-not-allowed bg-[var(--surface-strong)] text-[var(--text-muted)]",
            )}
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// A long message folds down to its opening lines once it's on screen, so the
// conversation stays scannable; "Show more" puts it back. Short messages render
// untouched — no control, no clamp.
const LONG_MESSAGE = 460;

function Collapsible({ text }: { text: string }) {
  const long = text.length > LONG_MESSAGE;
  const [open, setOpen] = useState(false);
  if (!long) return <span className="whitespace-pre-line">{text}</span>;
  return (
    <>
      <span className={cn("block whitespace-pre-line", !open && "line-clamp-6")}>{text}</span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-1 text-[12px] font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
      >
        {open ? "Show less" : "Show more"}
      </button>
    </>
  );
}

// ── The start screen ──
// What a conversation looks like before anything is said: a mark, a headline, a
// lead line, suggestions, then the composer. Used by the registry rail, the
// record rail and the New use case page, so all three read as the same product —
// only the words and the suggestions differ.
export function ChatStartScreen<T extends { id: string; label: string; icon?: ReactNode }>({
  title,
  lead,
  starters,
  onPick,
  size = "sm",
  children,
}: {
  title: string;
  lead: string;
  starters: T[];
  onPick: (item: T) => void;
  // `lg` is the full-page version; `sm` fits the 330px rail.
  size?: "sm" | "lg";
  // The composer, supplied by the caller so it keeps its own state and handlers.
  children: ReactNode;
}) {
  const large = size === "lg";
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
      <div
        className={cn("no-scrollbar flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto text-center", large ? "pb-8" : "pb-5")}
      >
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]",
            large ? "h-9 w-9" : "h-8 w-8",
          )}
        >
          <Sparkles size={large ? 18 : 16} />
        </span>
        <h2 className={cn("font-display leading-tight text-[var(--text-primary)]", large ? "mt-4 text-[28px]" : "mt-3 text-[20px]")}>{title}</h2>
        <p
          className={cn(
            "text-balance text-[var(--text-body)]",
            large ? "mt-2 max-w-[52ch] text-[15px] leading-6" : "mt-1.5 max-w-[40ch] text-[13px] leading-[1.6]",
          )}
        >
          {lead}
        </p>
        {/* The suggestions belong to the greeting, not to the input: they read as
 one block here. (In a stage's chat they sit above the composer, because
 there they're follow-ups to a conversation already in progress.) */}
        <div className={cn("w-full", large ? "mt-5" : "mt-4")}>
          <ChatStarters padded={false} align="center" items={starters} onPick={onPick} />
        </div>
      </div>
      {/* Only the composer is docked, so the input is always at the bottom. */}
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Tap-to-send openers, shown while a chat has no user input yet.
export function ChatStarters<T extends { id: string; label: string; icon?: ReactNode }>({
  items,
  onPick,
  align = "start",
  padded = true,
}: {
  items: T[];
  onPick: (item: T) => void;
  align?: "start" | "center";
  padded?: boolean;
}) {
  return (
    <div className={cn("flex shrink-0 flex-wrap gap-1.5", align === "center" ? "justify-center" : "justify-start", padded && "pb-1.5")}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item)}
          className="inline-flex max-w-full items-start gap-1.5 whitespace-normal rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-left text-[12px] font-medium leading-[1.45] text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--text-primary)]"
        >
          {item.icon ? <span className="mt-[2px] shrink-0 text-[var(--accent)]">{item.icon}</span> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}
