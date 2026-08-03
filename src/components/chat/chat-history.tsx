"use client";

import { History, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { ChatLine, ChatTimeDivider } from "@/components/chat/chat-ui";
import { IconButton, MenuDivider, MenuItem, MenuLabel, MenuSurface } from "@/components/ui/kit";

// ── Chat history ──
// Past conversations on this surface: the ones seeded with the prototype's data,
// plus anything the user archives by starting a new chat. The menu is portalled
// like the stage path, because the rail clips its own overflow.

export type ChatTurn = {
  role: "assistant" | "user";
  text: string;
  time?: string;
  activity?: string;
  detail?: ReactNode;
  // Where this answer can go next. Shown only under the newest turn — an assistant
  // that answers and then stops makes the user guess what else it knows.
  followUps?: string[];
};

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
            <MenuSurface
              ref={menuRef}
              role="menu"
              aria-label="Chat history"
              style={{ left: anchor.left, top: anchor.top, maxHeight: anchor.maxHeight, width: 248 }}
              className="no-scrollbar fixed z-[80] overflow-y-auto overscroll-contain"
            >
              <MenuItem
                icon={<MessageSquare size={14} />}
                meta="Live"
                selected={activeId === null}
                onClick={() => {
                  onOpen(null);
                  setAnchor(null);
                }}
              >
                Current chat
              </MenuItem>

              {sessions.length ? (
                <>
                  <MenuDivider />
                  <MenuLabel>Earlier</MenuLabel>
                  {sessions.map((session) => (
                    <MenuItem
                      key={session.id}
                      icon={<History size={14} />}
                      meta={session.when}
                      selected={activeId === session.id}
                      onClick={() => {
                        onOpen(session.id);
                        setAnchor(null);
                      }}
                    >
                      {session.title}
                    </MenuItem>
                  ))}
                </>
              ) : null}
            </MenuSurface>,
            document.body,
          )
        : null}
    </>
  );
}

// A finished conversation: the transcript, and the way back to the live one.
export function PastChatTranscript({
  session,
  scrollRef,
  onScrolledChange,
}: {
  session: ChatSession;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScrolledChange?: (scrolled: boolean) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={(event) => onScrolledChange?.(event.currentTarget.scrollTop > 4)}
          className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-1.5 pb-4 pt-1"
        >
          <ChatTimeDivider />
          {session.turns.map((turn, index) => (
            <ChatLine key={index} role={turn.role} text={turn.text} time={turn.time} activity={turn.activity} detail={turn.detail} />
          ))}
          <p className="pt-2 text-[11px] text-[var(--text-muted)]">{`${session.title} · ${session.when} — this conversation is closed.`}</p>
        </div>
      </div>
    </div>
  );
}
