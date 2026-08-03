"use client";

import { ChevronRight, Maximize2, Minimize2, PanelLeftClose, MessageSquarePlus, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button, IconButton, buttonClass } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The app shell ──
// Three rows of chrome, shared by every route:
// 1. a global top bar on the canvas — product mark, title, search, the user;
// 2. a rail + tab bar — the chat rail's header and its two controls on the
// left, the panel's views (and any panel toggle) on the right;
// 3. the content panel's own header — object icon, title, breadcrumb, and the
// view's own controls.
// Routes supply data (title, tabs, breadcrumb, controls), never their own chrome.

// ── The rail's header ──
// Sits at the top of the rail itself. The divider appears once the conversation
// scrolls under it, so a short chat still reads as one surface.

export function RailHeader({
  label = "AI Factory",
  scrolled = false,
  expanded = false,
  onToggleExpand,
  collapsed = false,
  onToggleCollapse,
  onNewChat,
  history,
}: {
  label?: string;
  scrolled?: boolean;
  // Full-width chat: the content panel steps aside entirely.
  expanded?: boolean;
  onToggleExpand: () => void;
  // Rail hidden: only this header's toggle is left, as a slim strip.
  collapsed?: boolean;
  onToggleCollapse: () => void;
  // Clears the conversation and starts again from the empty state.
  onNewChat?: () => void;
  // Past conversations on this surface.
  history?: ReactNode;
}) {
  // Collapsed, the header *is* the way back — it keeps its place in the row so
  // the control never moves out from under the pointer.
  const toggle = (
    <IconButton label={collapsed ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`} onClick={onToggleCollapse} size={28}>
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
    </IconButton>
  );

  if (collapsed) {
    return <div className="flex h-11 shrink-0 items-center justify-center">{toggle}</div>;
  }

  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center gap-1 border-b px-1 transition-colors",
        scrolled ? "border-[var(--border-hairline)]" : "border-transparent",
      )}
    >
      {toggle}
      <Link href="/" className="text-[14px] font-medium text-[var(--text-primary)] transition hover:text-[var(--accent-strong)]">
        {label}
      </Link>
      <span className="ml-auto flex items-center gap-0.5">
        {history}
        {onNewChat ? (
          <IconButton label="New chat" onClick={onNewChat} size={28}>
            <MessageSquarePlus size={15} />
          </IconButton>
        ) : null}
        <IconButton label={expanded ? "Restore the split view" : "Expand chat to full width"} onClick={onToggleExpand} active={expanded} size={28}>
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

// ── The panel's views ──
// Rendered inside the panel header, next to the breadcrumb.

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
  compact = false,
}: {
  tabs: PanelTab[];
  activeId: string;
  onSelect?: (id: string) => void;
  // Trailing control for the row (e.g. the record's details sheet toggle).
  right?: ReactNode;
  // Icon-only, where the icons already carry the meaning (board / table).
  compact?: boolean;
}) {
  return (
    <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const shape = cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] text-[13px] transition",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
          compact ? "w-9 justify-center" : "px-3",
          active
            ? "border border-[var(--border-default)] bg-white font-semibold text-[var(--text-primary)] "
            : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
        );
        // A tooltip only where the icon is the whole label. On a labelled tab it just
        // repeats the word you're already reading.
        const tip = compact ? tab.label : undefined;
        const inner = (
          <>
            {tab.icon ? <span className={cn("shrink-0", active ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{tab.icon}</span> : null}
            {compact ? null : tab.label}
          </>
        );
        return tab.href && !active ? (
          <Link key={tab.id} href={tab.href} data-tip={tip} aria-label={compact ? tab.label : undefined} className={shape}>
            {inner}
          </Link>
        ) : (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect?.(tab.id)}
            aria-current={active ? "page" : undefined}
            data-tip={tip}
            aria-label={compact ? tab.label : undefined}
            className={shape}
          >
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
      data-tip={active ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
    >
      {icon}
      {label}
    </Button>
  );
}

// ── Row 3: the content panel ──

// Where you are, as a path you can walk back up: All use cases › the record › the
// view. The last crumb is the page you're on.
export type Crumb = {
  label: string;
  href?: string;
  icon?: ReactNode;
  title?: string;
  // A crumb that is its own control (e.g. the stage switcher) renders this
  // instead of plain text.
  node?: ReactNode;
};

export function PanelBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-1.5 text-[14px]">
      {items.map((crumb, index) => {
        const last = index === items.length - 1;
        if (crumb.node) {
          return (
            <span key={crumb.label} className="flex min-w-0 items-center gap-1.5">
              {crumb.node}
            </span>
          );
        }
        const body = (
          <span
            data-tip={crumb.title}
            className={cn("inline-flex min-w-0 items-center gap-1.5", last ? "font-medium text-[var(--accent-strong)]" : "text-[var(--text-label)]")}
          >
            {crumb.icon ? <span className="shrink-0 text-[var(--text-muted)]">{crumb.icon}</span> : null}
            <span className="whitespace-nowrap">{crumb.label}</span>
          </span>
        );
        return (
          <span key={crumb.label} className="flex min-w-0 items-center gap-1.5">
            {crumb.href && !last ? (
              <Link href={crumb.href} className="min-w-0 rounded-[6px] transition hover:text-[var(--text-primary)]">
                {body}
              </Link>
            ) : (
              body
            )}
            {last ? null : <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />}
          </span>
        );
      })}
    </nav>
  );
}

export function ContentPanel({
  icon,
  title,
  titleMeta,
  breadcrumb,
  tabs,
  controls,
  footer,
  scroll = true,
  children,
}: {
  icon?: ReactNode;
  // Omitted on routes whose header leads with a breadcrumb instead.
  title?: string;
  // A count or short qualifier that belongs to the title.
  titleMeta?: ReactNode;
  breadcrumb?: ReactNode;
  // The route's views (Overview / Workflow, Board / Table).
  tabs?: ReactNode;
  // The view's own real controls — filters and toggles, pushed to the right edge
  // so the left side stays the object's identity.
  controls?: ReactNode;
  footer?: ReactNode;
  // Panels whose content owns its own scrolling opt out.
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] ">
      <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-[var(--border-hairline)] px-6 py-2">
        {icon ? <span className="shrink-0 text-[var(--accent)]">{icon}</span> : null}
        {title ? <h1 className="font-display min-w-0 shrink-0 truncate text-[18px] leading-tight text-[var(--text-primary)]">{title}</h1> : null}
        {/* Breadcrumb before the count: what the panel *is* comes before how much
            of it there is. */}
        {breadcrumb}
        {titleMeta}
        {/* The tabs are a different kind of thing from the panel's name, so a rule
            separates them rather than more whitespace. */}
        {tabs ? (
          <>
            <span aria-hidden className="ml-1.5 h-4 w-px shrink-0 bg-[var(--border-default)]" />
            <div className="shrink-0">{tabs}</div>
          </>
        ) : null}
        {controls ? <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">{controls}</div> : null}
      </div>
      {/* Content scrolls inside the panel; nothing bleeds past its rounded edge. */}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden", scroll && "no-scrollbar overflow-y-auto")}>{children}</div>
      {footer ? (
        <div className="flex min-h-[48px] shrink-0 items-center gap-3 border-t border-[var(--border-hairline)] px-6 py-2">{footer}</div>
      ) : null}
    </section>
  );
}

// ── The frame ──
// Two grids sharing one column template: the rail/tab bar, then the rail body
// and the panel. Whitespace — not a divider — separates rail from panel.

export function AppShell({
  banner,
  railHeader,
  rail,
  aside,
  railExpanded = false,
  railCollapsed = false,
  children,
}: {
  // Full-width strip above everything (e.g. a returned / rejected notice).
  banner?: ReactNode;
  railHeader: ReactNode;
  rail: ReactNode;
  // Optional third column (the record's details sheet).
  aside?: ReactNode;
  // The chat takes the whole content area; the panel (and sheet) step aside.
  railExpanded?: boolean;
  // The rail is put away, leaving only its toggle; the panel takes the width.
  railCollapsed?: boolean;
  children: ReactNode;
}) {
  // A narrow side rail, not a half-split. Fixed at 364px so it reads the same
  // whether or not the details sheet is open, and the composer, starter chips and
  // user bubbles keep a deliberate measure. Collapsed it becomes a 36px strip —
  // just wide enough to hold the toggle that reopens it.
  const railTrack = railCollapsed ? "36px" : "364px";
  const columns = railExpanded ? "minmax(0,1fr)" : aside ? `${railTrack} minmax(0,62fr) minmax(0,38fr)` : `${railTrack} minmax(0,1fr)`;
  return (
    // One row of content: the rail and the panel, each carrying its own header.
    <main className="chat-glow flex h-screen flex-col overflow-hidden bg-[var(--shell-canvas)] text-[var(--text-primary)]">
      {banner}
      <div className="grid min-h-0 min-w-0 flex-1 gap-x-3 overflow-hidden px-3 py-3" style={{ gridTemplateColumns: columns }}>
        {/* The rail's grid item always renders: a display:none item is skipped by
 auto-placement, which would slide the panel into the rail's track. The
 conversation inside is hidden instead, so putting the rail away and
 bringing it back doesn't lose it. */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {railHeader}
          <div className={cn("flex min-h-0 flex-1 flex-col", railCollapsed && "hidden")}>{rail}</div>
        </section>
        {railExpanded ? null : <div className="flex min-h-0 min-w-0 flex-col">{children}</div>}
        {railExpanded ? null : aside}
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
