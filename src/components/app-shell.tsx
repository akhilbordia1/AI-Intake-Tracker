"use client";

import { ChevronRight, Maximize2, Minimize2, MessageSquarePlus, PanelRightClose, PanelRightOpen } from "lucide-react";
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
  label = "Assistant",
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
      {/* Right-hand glyphs, because the rail is the right-hand column: a left-facing panel icon on
          a panel that lives on the right points at nothing. */}
      {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
    </IconButton>
  );

  if (collapsed) {
    return <div className="flex min-h-[52px] shrink-0 items-center justify-center py-2">{toggle}</div>;
  }

  return (
    <div
      className={cn(
        // 52px, matching `ContentPanel`'s header exactly. At 44px the rail's row was eight pixels
        // shorter than the panel's beside it, so "Assistant" and its three controls sat above the
        // profile switcher and the breadcrumb rather than on their line.
        "flex min-h-[52px] shrink-0 items-center gap-1 border-b px-1 py-2 transition-colors",
        scrolled ? "border-[var(--border-hairline)]" : "border-transparent",
      )}
    >
      {toggle}
      {/* Plain text, not a link home. It said "AI Factory" and pointed at `/` while the rail was the
          window's left column, which made the product mark part of the chat; the mark is the panel's
          now, and what's left here is what this column actually is. */}
      <span className="text-[14px] font-medium text-[var(--text-primary)]">{label}</span>
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
  segmented = false,
}: {
  tabs: PanelTab[];
  activeId: string;
  onSelect?: (id: string) => void;
  // Trailing control for the row (e.g. the record's details sheet toggle).
  right?: ReactNode;
  // Icon-only, where the icons already carry the meaning (board / table).
  compact?: boolean;
  // One toggle instead of a row of tabs: the whole control is boxed, the segments sit inside
  // it, and the active one is the raised white half. For a pair of mutually exclusive reads of
  // the same data — Health or Value — where a tab strip implies a list you could add to.
  segmented?: boolean;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar flex shrink-0 items-center overflow-x-auto",
        segmented ? "gap-0.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-strong)] p-0.5" : "gap-1",
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const shape = cn(
          "inline-flex shrink-0 items-center gap-1.5 text-[13px] transition",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
          segmented ? "h-8 rounded-[8px]" : "h-9 rounded-[10px]",
          compact ? "w-9 justify-center" : "px-3",
          segmented
            ? // Inside a boxed toggle the active half is told by its fill against the trough, so
              // it takes no border of its own — one would read as a box inside a box.
              active
              ? "bg-[var(--surface)] font-semibold text-[var(--text-primary)]"
              : "text-[var(--text-body)] hover:text-[var(--text-primary)]"
            : active
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
  // `centerTabs` (tabs absolutely placed on the panel's midline) and `bare` (no card at all) lived
  // here for the standalone `/portfolio` shell. That shell is gone — the leadership views are a tab
  // of the tracker's panel now — and nothing else wanted either, so both came out rather than staying
  // as options no caller passes.
  // The view's own real controls — filters and toggles, pushed to the right edge
  // so the left side stays the object's identity.
  controls?: ReactNode;
  footer?: ReactNode;
  // Panels whose content owns its own scrolling opt out.
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)]">
      <div className="relative flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-[var(--border-hairline)] px-6 py-2">
        {/* The product mark, leading the panel header. It lived in the rail until the rail moved to the
            right-hand column and took the app's only top-left identity with it — so it sits here, on
            the same edge as the content it names, and stays the way back to the board. Ruled off from
            the breadcrumb: the mark is the product, the crumb is where you are in it. */}
        <Link href="/" className="shrink-0 text-[14px] font-medium text-[var(--text-primary)] transition hover:text-[var(--accent-strong)]">
          AI Factory
        </Link>
        {/* The rule only where something follows the mark in the flow. With the tabs centred out of the
            flow there was nothing after it, so the rule hung off the mark's right shoulder pointing at
            empty space. */}
        {breadcrumb || title || titleMeta ? <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--border-default)]" /> : null}
        {icon ? <span className="shrink-0 text-[var(--accent)]">{icon}</span> : null}
        {title ? <h1 className="font-display min-w-0 shrink-0 truncate text-[18px] leading-tight text-[var(--text-primary)]">{title}</h1> : null}
        {/* Breadcrumb before the count: what the panel *is* comes before how much
            of it there is. */}
        {breadcrumb}
        {titleMeta}
        {/* Where the tabs are the only thing in this row besides the mark and the profile, they sit on
            the panel's own midline rather than tucked against the mark — a two-state switch between
            whole surfaces belongs on the axis of the thing it switches, and `mx-auto` would only
            centre it in whatever space the mark and the controls left over. Absolutely placed, it is
            centred whatever is either side of it, and it needs no dividing rule because nothing is
            beside it to divide from.

            Where a breadcrumb or a title comes first, the tabs stay in the flow after it with a rule
            between them: there they are a step in a path, not a switch. */}
        {tabs ? (
          breadcrumb || title || titleMeta ? (
            <>
              <span aria-hidden className="ml-1.5 h-4 w-px shrink-0 bg-[var(--border-default)]" />
              <div className="shrink-0">{tabs}</div>
            </>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
              <div className="pointer-events-auto">{tabs}</div>
            </div>
          )
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

// ── The view row ──
// The second row of the panel: which view of the active mode is showing, and the controls that
// belong to *that* mode. One component so the registry's row (Board / Table, search, filters) and
// the reporting row (five readings, two scopes) are the same object rather than two rows that drift.
//
// The mode tabs stay up in the panel header. Three rows of chrome — header, mode, view — is a lot of
// furniture above the first number, and vertical space is the thing this page keeps running out of.
export function PanelViewRow({
  heading,
  count,
  views,
  controls,
  action,
}: {
  // The mode's own title, and the row's anchor. The panel header names the *product* and which mode
  // is active; this says what you are looking at, at a size that reads as a page heading rather than
  // as another control — a header made only of controls gives the eye nowhere to land.
  heading: string;
  count?: ReactNode;
  // The views within the mode. Optional: where there are only two of them they're better off as an
  // icon toggle among the controls than as a labelled strip competing with the heading.
  views?: ReactNode;
  controls?: ReactNode;
  // The surface's standing action, last. Kept out of `controls` so it sits after the rule whichever
  // mode is showing, rather than drifting to a different place in each.
  action?: ReactNode;
}) {
  return (
    // Full width, always. A `measure` prop lived here for one revision so the heading could line up
    // with capped content below — but this row is chrome, and chrome belongs at the panel's edges: the
    // scope selects pulled 300px in from the right edge read as floating in the middle of the card.
    <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--border-hairline)] px-5 py-2">
      {/* Display serif at 18px, the size `ContentPanel` gives its own title — this row *is* the page
            heading now that the panel header is identity and mode only. No rule after it: 18px serif
            beside 13px sans separates itself, and this header had more rules than it had groups. */}
      <h2 className="font-display shrink-0 text-[18px] leading-tight text-[var(--text-primary)]">{heading}</h2>
      {count}
      {/* Views sit with the heading, not with the filters. Which view you're in is part of *what
            you're looking at*; search and the filters are what has been taken away from it. On the
            right they made a run of five controls that had to be read one at a time to find out which
            were about the data and which about the drawing of it. */}
      {views ? <div className="ml-1.5 shrink-0">{views}</div> : null}
      {/* One group, tight: `gap-1` inside the filters and the rule before the action are what say
            "these belong together, that one doesn't". At an even 6px everything read as a queue of
            unrelated buttons. */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
        {controls}
        {action ? (
          <>
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-[var(--border-default)]" />
            {action}
          </>
        ) : null}
      </div>
    </div>
  );
}

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
  // Both optional, though every route currently passes them — the one surface that didn't (the
  // standalone leadership view, which docked its assistant in a floating panel) is a tab of the
  // tracker now and uses the rail like everything else.
  railHeader?: ReactNode;
  rail?: ReactNode;
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
  const hasRail = Boolean(rail || railHeader);
  // The rail is the *last* column. It led the row until now, which put the assistant between the
  // window edge and the thing being discussed: on every route the object of the conversation — a
  // board, a record, a portfolio — started 380px in, and the eye had to cross the chat to reach it.
  // On the right it's where a side panel is expected, the content keeps the left edge it shares with
  // the top bar's product mark, and the composer sits under the pointer's resting corner.
  //
  // On `/detail` the details sheet stays next to its record and the rail goes outside it: the sheet
  // is part of the object, the chat is about it.
  // Two columns, always: the content and the side track. The details sheet used to add a third, which
  // squeezed the record it describes into the middle of three panels — and the sheet is *about* the
  // record, so taking width from it to show it is the wrong trade. It shares the rail's column now and
  // covers it, which is also what a sheet is: something that comes over what you were doing.
  const columns = railExpanded || !hasRail ? "minmax(0,1fr)" : `minmax(0,1fr) ${railTrack}`;
  return (
    // One row of content: the rail and the panel, each carrying its own header.
    <main className="chat-glow flex h-screen flex-col overflow-hidden bg-[var(--shell-canvas)] text-[var(--text-primary)]">
      {banner}
      <div className="grid min-h-0 min-w-0 flex-1 gap-x-3 overflow-hidden px-3 py-3" style={{ gridTemplateColumns: columns }}>
        {railExpanded ? null : <div className="flex min-h-0 min-w-0 flex-col">{children}</div>}
        {/* The rail's grid item always renders: a display:none item is skipped by
 auto-placement, which would slide the panel into the rail's track. The
 conversation inside is hidden instead, so putting the rail away and
 bringing it back doesn't lose it. */}
        {hasRail ? (
          <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ gridColumn: 2 }}>
            {railHeader}
            <div className={cn("flex min-h-0 flex-1 flex-col", railCollapsed && "hidden")}>{rail}</div>
            {/* Placed in the same grid cell and layered over it, so the conversation stays mounted
                underneath — close the sheet and the thread is where you left it. */}
            {aside ? (
              // Opaque, so nothing of the conversation reads through the sheet's own rounded corners —
              // the panel it covers has to look covered. Rounded to the same 12px as the sheet: as a
              // square block its four corners poked out past the sheet's arcs, and against the canvas's
              // composer glow they read as white notches behind the card.
              <div className="absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col rounded-[12px] bg-[var(--shell-canvas)]">{aside}</div>
            ) : null}
          </section>
        ) : null}
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
