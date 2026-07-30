"use client";

import {
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button, IconButton, buttonClass } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The app shell ──
// Three rows of chrome, shared by every route:
//   1. a global top bar on the canvas — product mark, title, search, the user;
//   2. a rail + tab bar — the chat rail's header and its two controls on the
//      left, the panel's views (and any panel toggle) on the right;
//   3. the content panel's own header — object icon, title, breadcrumb, and the
//      view's own controls.
// Routes supply data (title, tabs, breadcrumb, controls), never their own chrome.

// ── Row 1: the global top bar ──

export function AppTopBar({
  title,
  titleHref,
  search,
  profile,
}: {
  // The thing you're in: the app on the tracker, the record on a record route.
  title: string;
  // Where the title points when it isn't already the page you're on.
  titleHref?: string;
  // Wired search (the tracker). Routes without their own search send you to the
  // one that has it rather than showing a dead field.
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  // The user menu — ProfileSwitcher in compact (avatar + chevron) form.
  profile?: ReactNode;
}) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
      <div className="flex min-w-0 items-center gap-2">
      <Link
        href="/"
        title="All use cases"
        aria-label="All use cases"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)]"
      >
        <Sparkles size={15} />
      </Link>
      {titleHref ? (
        <Link
          href={titleHref}
          className="min-w-0 truncate px-0.5 text-[15px] font-medium text-[var(--text-primary)] transition hover:text-[var(--accent-strong)]"
        >
          {title}
        </Link>
      ) : (
        <span className="min-w-0 truncate px-0.5 text-[15px] font-medium text-[var(--text-primary)]">{title}</span>
      )}
      </div>

      <div className="hidden w-[min(430px,42vw)] md:block">
        <div className="relative">
          <Search aria-hidden size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          {search ? (
            <input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder ?? "Search…"}
              className="h-9 w-full rounded-full border border-[var(--border-default)] bg-[var(--surface-muted)] pl-9 pr-4 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          ) : (
            <Link
              href="/"
              title="Search every use case"
              className="flex h-9 w-full items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-muted)] pl-9 pr-4 text-[13px] text-[var(--text-muted)] transition hover:border-[var(--accent-ring)] hover:text-[var(--text-body)]"
            >
              Search use cases…
            </Link>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1">{profile}</div>
    </header>
  );
}

// ── Row 2, left: the chat rail's header ──
// The rail's only header. The divider appears once the conversation scrolls
// under it, so a short chat still reads as one surface.

export function RailHeader({
  label = "Chat",
  scrolled = false,
  onJumpToTop,
  canJumpToTop = false,
  expanded = false,
  onToggleExpand,
  collapsed = false,
  onToggleCollapse,
}: {
  label?: string;
  scrolled?: boolean;
  // Scrolls the conversation back to its opening message.
  onJumpToTop: () => void;
  canJumpToTop?: boolean;
  // Full-width chat: the content panel steps aside entirely.
  expanded?: boolean;
  onToggleExpand: () => void;
  // Rail hidden: only this header's toggle is left, as a slim strip.
  collapsed?: boolean;
  onToggleCollapse: () => void;
}) {
  // Collapsed, the header *is* the way back — it keeps its place in the row so
  // the control never moves out from under the pointer.
  const toggle = (
    <IconButton
      label={collapsed ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
      onClick={onToggleCollapse}
      size={28}
    >
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
    </IconButton>
  );

  if (collapsed) {
    return <div className="flex h-11 shrink-0 items-center justify-center">{toggle}</div>;
  }

  return (
    <div className={cn("flex h-11 shrink-0 items-center gap-1 border-b px-1 transition-colors", scrolled ? "border-[var(--border-hairline)]" : "border-transparent")}>
      {toggle}
      <span className="text-[14px] font-medium text-[var(--text-primary)]">{label}</span>
      <span className="ml-auto flex items-center gap-0.5">
        <IconButton label="Jump to first message" onClick={onJumpToTop} disabled={!canJumpToTop} size={28}>
          <ArrowUpGlyph />
        </IconButton>
        <IconButton
          label={expanded ? "Restore the split view" : "Expand chat to full width"}
          onClick={onToggleExpand}
          active={expanded}
          size={28}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </IconButton>
      </span>
    </div>
  );
}

// Collapsed / expanded are mutually exclusive rail states, so one hook owns both
// and entering either clears the other.
export function useRailMode() {
  const [mode, setMode] = useState<"split" | "collapsed" | "expanded">("split");
  return {
    collapsed: mode === "collapsed",
    expanded: mode === "expanded",
    toggleCollapse: () => setMode((current) => (current === "collapsed" ? "split" : "collapsed")),
    toggleExpand: () => setMode((current) => (current === "expanded" ? "split" : "expanded")),
  };
}

function ArrowUpGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

// ── Row 2, right: the panel's views ──

export type PanelTab = {
  id: string;
  label: string;
  icon?: ReactNode;
  // A tab that navigates to another route rather than switching a local view.
  href?: string;
};

export function PanelTabs({
  tabs,
  activeId,
  onSelect,
  right,
}: {
  tabs: PanelTab[];
  activeId: string;
  onSelect?: (id: string) => void;
  // Trailing control for the row (e.g. the record's details sheet toggle).
  right?: ReactNode;
}) {
  return (
    <div className="no-scrollbar flex h-11 shrink-0 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const shape = cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] transition",
          active
            ? "border border-[var(--border-default)] bg-white font-semibold text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
            : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
        );
        const inner = (
          <>
            {tab.icon ? <span className={cn("shrink-0", active ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{tab.icon}</span> : null}
            {tab.label}
          </>
        );
        return tab.href && !active ? (
          <Link key={tab.id} href={tab.href} className={shape}>
            {inner}
          </Link>
        ) : (
          <button key={tab.id} type="button" onClick={() => onSelect?.(tab.id)} aria-current={active ? "page" : undefined} className={shape}>
            {inner}
          </button>
        );
      })}
      {right ? <span className="ml-auto shrink-0 pl-2">{right}</span> : null}
    </div>
  );
}

// The tab row's trailing slot: a panel you can show or hide.
export function TabBarToggle({ label, icon, active = false, onClick }: { label: string; icon: ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <Button
      tone={active ? "secondary" : "quiet"}
      active={active}
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
    >
      {icon}
      {label}
    </Button>
  );
}

// ── Row 3: the content panel ──

// Subtle chip group: where the content comes from › what you're looking at.
// `trailing` carries a real dropdown where the route has one (no chevron
// otherwise, so the chip never advertises an affordance it doesn't have).
export function PanelBreadcrumb({ source, item, icon, trailing }: { source: string; item?: string; icon?: ReactNode; trailing?: ReactNode }) {
  return (
    <span className="hidden min-w-0 items-center gap-1.5 rounded-[8px] bg-[var(--surface-muted)] px-2 py-1 md:inline-flex">
      {icon ? <span className="shrink-0 text-[var(--accent)]">{icon}</span> : null}
      <span className="min-w-0 truncate text-[13px] font-medium text-[var(--accent-strong,var(--accent))]">{source}</span>
      {item || trailing ? <ChevronRight size={13} className="shrink-0 text-[var(--text-muted)]" /> : null}
      {item ? <span className="min-w-0 truncate text-[13px] text-[var(--text-body)]">{item}</span> : null}
      {trailing}
    </span>
  );
}

export function ContentPanel({
  icon,
  title,
  breadcrumb,
  controls,
  footer,
  scroll = true,
  children,
}: {
  icon?: ReactNode;
  title: string;
  breadcrumb?: ReactNode;
  // The view's own real controls — filters and toggles, pushed to the right edge
  // so the left side stays the object's identity.
  controls?: ReactNode;
  footer?: ReactNode;
  // Panels whose content owns its own scrolling opt out.
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-[10px] border border-b-0 border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-[var(--border-hairline)] px-4 py-2">
        {icon ? <span className="shrink-0 text-[var(--accent)]">{icon}</span> : null}
        <h1 className="font-display min-w-0 shrink-0 truncate text-[18px] leading-tight text-[var(--text-primary)]">{title}</h1>
        {breadcrumb}
        {controls ? <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">{controls}</div> : null}
      </div>
      {/* Content scrolls inside the panel; nothing bleeds past its rounded edge. */}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden", scroll && "no-scrollbar overflow-y-auto")}>{children}</div>
      {footer ? (
        <div className="flex min-h-[48px] shrink-0 items-center gap-3 border-t border-[var(--border-hairline)] px-4 py-2">{footer}</div>
      ) : null}
    </section>
  );
}

// ── The frame ──
// Two grids sharing one column template: the rail/tab bar, then the rail body
// and the panel. Whitespace — not a divider — separates rail from panel.

export function AppShell({
  topBar,
  banner,
  railHeader,
  rail,
  tabs,
  aside,
  railExpanded = false,
  railCollapsed = false,
  children,
}: {
  topBar: ReactNode;
  // Full-width strip under the top bar (e.g. a returned / rejected notice).
  banner?: ReactNode;
  railHeader: ReactNode;
  rail: ReactNode;
  tabs: ReactNode;
  // Optional third column (the record's details sheet).
  aside?: ReactNode;
  // The chat takes the whole content area; the panel (and sheet) step aside.
  railExpanded?: boolean;
  // The rail is put away, leaving only its toggle; the panel takes the width.
  railCollapsed?: boolean;
  children: ReactNode;
}) {
  // A narrow side rail, not a half-split. Fixed at 330px so it reads the same
  // whether or not the details sheet is open (~23% / ~17% of a 1440 row) and the
  // composer, starter chips and user bubbles keep a deliberate measure. Collapsed
  // it becomes a 36px strip — just wide enough to hold the toggle that reopens it.
  const railTrack = railCollapsed ? "36px" : "330px";
  const columns = railExpanded
    ? "minmax(0,1fr)"
    : aside
      ? `${railTrack} minmax(0,62fr) minmax(0,38fr)`
      : `${railTrack} minmax(0,1fr)`;
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--shell-canvas)] text-[var(--text-primary)]">
      {topBar}
      {banner}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3">
        <div className="grid shrink-0 gap-x-3" style={{ gridTemplateColumns: columns }}>
          <div className="min-w-0">{railHeader}</div>
          {railExpanded ? null : <div className="min-w-0">{tabs}</div>}
        </div>
        <div className="grid min-h-0 flex-1 gap-x-3" style={{ gridTemplateColumns: columns }}>
          {/* The rail's grid item always renders: a display:none item is skipped
              by auto-placement, which would slide the panel into the rail's
              track. The conversation inside is hidden instead, so putting the
              rail away and bringing it back doesn't lose it. */}
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className={cn("flex min-h-0 flex-1 flex-col", railCollapsed && "hidden")}>{rail}</div>
          </section>
          {railExpanded ? null : <div className="flex min-h-0 min-w-0 flex-col">{children}</div>}
          {railExpanded ? null : aside}
        </div>
      </div>
    </main>
  );
}

// ── Actions ──
// Kept as the shell's export so routes can import one thing; the shape itself
// lives in the kit.
export function shellButton(variant: "primary" | "secondary" = "secondary") {
  return buttonClass(variant);
}
