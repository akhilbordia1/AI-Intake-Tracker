"use client";

import { Check, ChevronDown, Lock } from "lucide-react";
import { useRef, useState } from "react";

import { MenuDivider, MenuLabel, MenuSurface } from "@/components/ui/kit";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/use-click-outside";

// Switchable user profiles. Names match the stage owners so "owned by you"
// can light up as you switch.
export const PEOPLE: Array<{ name: string; role: string }> = [
  // The registry's owners come first: switching to one of them is what makes "what
  // needs my attention?" answer with something. (Before they were listed, every
  // profile in the switcher owned zero cards and the question dead-ended.)
  { name: "Nisha Patel", role: "Governance Lead" },
  { name: "Priya Rao", role: "Delivery Manager" },
  { name: "Rohan Desai", role: "Product Owner" },
  { name: "Elena Weber", role: "Business Analyst" },
  { name: "Mira Kapoor", role: "Intake Coordinator" },
  { name: "Aarav Mehta", role: "Finance Systems Lead" },
  { name: "Daniel Cho", role: "Marketing Ops Lead" },
  // The deep record's stage owners.
  { name: "Lena Osei", role: "Risk Assessor" },
  { name: "Dana K.", role: "AI CoE Lead" },
  { name: "Priya N.", role: "Portfolio Lead" },
  { name: "Amara J.", role: "AI Core Team" },
  { name: "Victor H.", role: "GTAC Chair" },
  { name: "Noah R.", role: "Delivery Lead" },
  { name: "Marco B.", role: "Adoption Lead" },
];

// A person's colour is derived from their name, so it's the same on the board, in
// a table, in a menu and in the chat — no lookup table to keep in sync.
const AVATAR_TONE_COUNT = 6;

function avatarTone(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  const slot = (hash % AVATAR_TONE_COUNT) + 1;
  return { background: `var(--avatar-${slot}-bg)`, color: `var(--avatar-${slot}-fg)` };
}

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
  size = 20,
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
      data-tip={name}
      style={{
        // Below 20px the initials can't keep their ring of space, so the circle
        // never renders smaller than that — one avatar shape everywhere.
        width: Math.max(20, size),
        height: Math.max(20, size),
        // Type scales with the circle, so the ring of space around the initials is
        // the same proportion at 16px as at 32px. 0.32 leaves the initials clearly
        // inside the circle rather than filling it.
        fontSize: Math.round(Math.max(20, size) * 0.34),
        lineHeight: 1,
        ...(active ? {} : avatarTone(name)),
      }}
      className={cn(
        // Explicit sans + reset tracking: the initials were inheriting the mono
        // face and the global 0.1px letter-spacing in some rows, which threw them
        // off-centre. Flex centring keeps them optically centred at any size.
        "font-sans inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-normal",
        active && "bg-[var(--accent)] text-white",
        highlight && "ring-2 ring-[var(--accent-ring)]",
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
        data-tip={lockedBy ? `This stage is owned by ${lockedBy} — switch profile to edit` : undefined}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-white pl-1 pr-2.5 text-[13px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
      >
        <span className="relative inline-flex">
          <PersonAvatar name={currentUser} size={26} active />
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
        <MenuSurface className="absolute right-0 top-11 z-50 w-64" role="menu" aria-label="Switch profile">
          <div className="flex items-center gap-2.5 rounded-[8px] px-2 pb-2 pt-1.5">
            <PersonAvatar name={currentUser} size={32} active highlight />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)]">{currentUser}</span>
              <span className="block truncate text-[11px] text-[var(--text-muted)]">
                {PEOPLE.find((person) => person.name === currentUser)?.role ?? ""}
              </span>
            </span>
          </div>
          <MenuDivider />
          <MenuLabel>Switch profile</MenuLabel>
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
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition",
                  isCurrent ? "bg-[var(--surface-strong)]" : "hover:bg-[var(--surface-hover)]",
                )}
              >
                <PersonAvatar name={person.name} size={26} active={isCurrent} highlight={isCurrent} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{person.name}</span>
                  <span className="block truncate text-[11px] text-[var(--text-muted)]">{person.role}</span>
                </span>
                {isCurrent ? <Check size={15} className="shrink-0 text-[var(--accent)]" /> : null}
              </button>
            );
          })}
        </MenuSurface>
      ) : null}
    </div>
  );
}
