"use client";

import { Check, ChevronDown, Lock } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/use-click-outside";

// Switchable user profiles. Names match the stage owners so "owned by you"
// can light up as you switch.
export const PEOPLE: Array<{ name: string; role: string }> = [
  { name: "Lena Osei", role: "Risk Assessor" },
  { name: "Dana K.", role: "AI CoE Lead" },
  { name: "Priya N.", role: "Portfolio Lead" },
  { name: "Amara J.", role: "AI Core Team" },
  { name: "Victor H.", role: "GTAC Chair" },
  { name: "Noah R.", role: "Delivery Lead" },
  { name: "Marco B.", role: "Adoption Lead" },
];

export function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PersonAvatar({
  name,
  size = 24,
  highlight = false,
  active = false,
}: {
  name: string;
  size?: number;
  highlight?: boolean;
  active?: boolean;
}) {
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: size <= 22 ? 9 : 10 }}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold",
        active
          ? "bg-[var(--accent)] text-white"
          : highlight
            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-1 ring-[var(--accent-border)]"
            : "bg-[var(--border-default)] text-[var(--text-label)]",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ProfileSwitcher({
  currentUser,
  onUserChange,
  lockedBy,
  compact = false,
}: {
  currentUser: string;
  onUserChange: (name: string) => void;
  // When set, the current stage is owned by someone else — shown as a lock
  // badge on the avatar hinting to switch profiles.
  lockedBy?: string;
  // Avatar + chevron only (no name label).
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={lockedBy ? `This stage is owned by ${lockedBy} — switch profile to edit` : undefined}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-white pl-1 pr-2.5 text-[13px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
      >
        <span className="relative inline-flex">
          <PersonAvatar name={currentUser} size={28} active />
          {lockedBy ? (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-white bg-[var(--tone-warning-fg)] text-white">
              <Lock size={7} strokeWidth={2.5} />
            </span>
          ) : null}
        </span>
        {compact ? null : <span className="hidden sm:inline">{currentUser}</span>}
        <ChevronDown size={14} className={cn("text-[var(--text-muted)] transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-11 z-50 w-60 rounded-[10px] border border-[var(--border-default)] bg-white p-1.5 shadow-[var(--shadow-menu)]"
          role="menu"
          aria-label="Switch profile"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Switch profile</div>
          {PEOPLE.map((person) => {
            const isCurrent = person.name === currentUser;
            return (
              <button
                key={person.name}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => {
                  onUserChange(person.name);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition",
                  isCurrent ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-hover)]",
                )}
              >
                <PersonAvatar name={person.name} size={28} active={isCurrent} highlight={isCurrent} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{person.name}</span>
                  <span className="block truncate text-[11px] text-[var(--text-muted)]">{person.role}</span>
                </span>
                {isCurrent ? <Check size={15} className="shrink-0 text-[var(--accent)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
