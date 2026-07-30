"use client";

import { ArrowUp, AtSign, Check, LoaderCircle } from "lucide-react";
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

// One line of a conversation. `activity` renders a work step (bold label +
// muted detail), `notice` a completion strip, otherwise it's a message —
// assistant as plain prose, user as a right-aligned bubble with its send time.
export type ChatLineProps = {
  role?: "assistant" | "user";
  text: string;
  recap?: boolean;
  time?: string;
  notice?: boolean;
  activity?: string;
  running?: boolean;
};

export function ChatLine({ role = "assistant", text, recap = false, time, notice = false, activity, running = false }: ChatLineProps) {
  if (activity) {
    return (
      <div className="bubble-in-left flex items-baseline gap-2 text-[12px] leading-[1.6]">
        <span className="mt-[3px] shrink-0 self-start text-[var(--text-muted)]">
          {running ? <LoaderCircle size={13} className="animate-spin text-[var(--accent)]" /> : <Check size={13} className="text-[var(--status-success)]" />}
        </span>
        <span className="font-medium text-[var(--text-primary)]">{activity}</span>
        <span className="min-w-0 text-[var(--text-muted)]">{text}</span>
      </div>
    );
  }

  if (notice) {
    return (
      <div className="bubble-in-left flex items-center gap-2 rounded-[10px] bg-[var(--surface-strong)] px-3 py-2 text-[12px] text-[var(--text-body)]">
        <Check size={13} strokeWidth={2.5} className="shrink-0 text-[var(--status-success)]" />
        {text}
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
    <div className={cn("shrink-0", padded && "pb-3 pt-1.5")}>
      <div className="rounded-[14px] border border-[var(--border-default)] bg-white px-3 pb-1.5 pt-2.5 transition focus-within:border-[var(--accent-ring)]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "no-scrollbar block w-full resize-none bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60",
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
            title="Mention someone"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-white py-1.5 pl-2.5 pr-3 text-[12px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--text-primary)]"
        >
          {item.icon ? <span className="shrink-0 text-[var(--accent)]">{item.icon}</span> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}
