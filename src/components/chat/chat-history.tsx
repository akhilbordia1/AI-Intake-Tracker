"use client";

import { CornerUpLeft, History } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { ChatLine, ChatTimeDivider } from "@/components/chat/chat-ui";
import { IconButton } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── Chat history ──
// Past conversations on this surface: the ones seeded with the prototype's data,
// plus anything the user archives by starting a new chat. The menu is portalled
// like the stage path, because the rail clips its own overflow.

export type ChatTurn = { role: "assistant" | "user"; text: string; time?: string; activity?: string };

export type ChatSession = {
  id: string;
  title: string;
  // Human "when", not a timestamp — this prototype has no clock to sort by.
  when: string;
  turns: ChatTurn[];
};

// The live conversation is `null`; anything else is a session id.
export type ActiveSession = string | null;

export function useChatSessions(seed: ChatSession[]) {
  const [sessions, setSessions] = useState<ChatSession[]>(seed);
  const [activeId, setActiveId] = useState<ActiveSession>(null);
  // Bumped to remount the live rail — that's what "new chat" means.
  const [liveKey, setLiveKey] = useState(0);

  return {
    sessions,
    activeId,
    liveKey,
    // Open a past conversation, or return to the live one.
    open: (id: ActiveSession) => setActiveId(id),
    // Archive whatever is on screen (if anything was said) and start fresh.
    startNew: (turns: ChatTurn[], title: string) => {
      if (turns.length > 0) {
        setSessions((current) => [{ id: `session-${current.length + 1}-${turns.length}`, title, when: "Just now", turns }, ...current]);
      }
      setActiveId(null);
      setLiveKey((key) => key + 1);
    },
  };
}

export function ChatHistoryButton({
  sessions,
  activeId,
  onOpen,
}: {
  sessions: ChatSession[];
  activeId: ActiveSession;
  onOpen: (id: ActiveSession) => void;
}) {
  const [anchor, setAnchor] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setAnchor(null);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setAnchor(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 236;
    setAnchor({
      left: Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12),
      top: rect.bottom + 6,
      maxHeight: Math.max(200, window.innerHeight - rect.bottom - 24),
    });
  }

  return (
    <>
      <IconButton ref={triggerRef} label="Chat history" onClick={toggle} active={open} size={28}>
        <History size={15} />
      </IconButton>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Chat history"
              style={{ left: anchor.left, top: anchor.top, maxHeight: anchor.maxHeight, width: 236 }}
              className="no-scrollbar fixed z-[80] overflow-y-auto overscroll-contain rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] p-1 shadow-[var(--shadow-menu)]"
            >
              <MenuRow
                label="Current chat"
                meta="Live"
                selected={activeId === null}
                onClick={() => {
                  onOpen(null);
                  setAnchor(null);
                }}
              />
              {sessions.length ? <div className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">Earlier</div> : null}
              {sessions.map((session) => (
                <MenuRow
                  key={session.id}
                  label={session.title}
                  meta={session.when}
                  selected={activeId === session.id}
                  onClick={() => {
                    onOpen(session.id);
                    setAnchor(null);
                  }}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MenuRow({ label, meta, selected, onClick }: { label: string; meta: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-left transition",
        selected ? "bg-[var(--surface-strong)]" : "hover:bg-[var(--surface-hover)]",
      )}
    >
      <span className={cn("min-w-0 flex-1 truncate text-[12px]", selected ? "font-semibold text-[var(--accent-strong)]" : "text-[var(--text-body)]")}>
        {label}
      </span>
      <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{meta}</span>
    </button>
  );
}

// A finished conversation: the transcript, and the way back to the live one.
export function PastChatTranscript({
  session,
  onBack,
  scrollRef,
  onScrolledChange,
}: {
  session: ChatSession;
  onBack: () => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScrolledChange?: (scrolled: boolean) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-[7px] bg-[var(--surface-strong)] px-2 py-1 text-[11px] font-medium text-[var(--text-label)] transition hover:text-[var(--text-primary)]"
        >
          <CornerUpLeft size={12} />
          Back to current chat
        </button>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={(event) => onScrolledChange?.(event.currentTarget.scrollTop > 4)}
          className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-4 pt-1"
        >
          <ChatTimeDivider />
          {session.turns.map((turn, index) => (
            <ChatLine key={index} role={turn.role} text={turn.text} time={turn.time} activity={turn.activity} />
          ))}
          <p className="pt-2 text-[11px] text-[var(--text-muted)]">{`${session.title} · ${session.when} — this conversation is closed.`}</p>
        </div>
      </div>
    </div>
  );
}
