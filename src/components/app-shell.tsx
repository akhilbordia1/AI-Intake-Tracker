"use client";

import { ChevronRight, Maximize2, Minimize2, MessageSquarePlus, PanelRightClose, Sparkles } from "lucide-react";
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
  // Collapsed, the rail's whole column goes — including this header. The way back is `RailToggle`,
  // which the route puts beside the person in its own header row; a 36px strip left behind held one
  // button and cost the panel 48px of width it could use for the board.
  if (collapsed) return null;

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
      {/* Right-hand glyph, because the rail is the right-hand column: a left-facing panel icon on a
          panel that lives on the right points at nothing. */}
      <IconButton label={`Hide ${label.toLowerCase()}`} onClick={onToggleCollapse} size={28}>
        <PanelRightClose size={16} />
      </IconButton>
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

// ── The way back to a put-away assistant ──
// Rendered by the route in the header row that holds the person — the top bar on the tracker, the
// panel's controls on the record pages — so the collapsed rail costs the layout nothing at all. It
// only appears while the rail is away, which is why the glyph isn't the panel icon its twin in
// `RailHeader` wears: a control that stands alone has to say what it opens, and what it opens is the
// assistant. Accent-tinted for the same reason — it's the one AI affordance on the row.
export function RailToggle({ onClick, size = 32 }: { onClick: () => void; size?: number }) {
  return (
    // Filled, not a bare glyph. On the canvas beside a bordered profile pill a plain 16px icon read as
    // decoration — the one control that brings a whole column back has to look like a control.
    <IconButton
      label="Show assistant"
      onClick={onClick}
      size={size}
      className="border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
    >
      <Sparkles size={16} />
    </IconButton>
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
  chips = false,
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
  // Chips: each view a small rounded button, the active one filled in the accent's softest step with
  // an accent border. The third of three shapes on one screen — the mode switch is a boxed toggle on
  // the canvas, the registry's two views are icon buttons beside their heading, and these are chips.
  // A chip row says "pick one of these five", which is what it is; an underline says "navigation",
  // which is what the mode switch above already claims.
  chips?: boolean;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar flex shrink-0 items-center overflow-x-auto",
        segmented ? "gap-0.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-strong)] p-0.5" : chips ? "gap-1.5" : "gap-1",
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const shape = cn(
          "inline-flex shrink-0 items-center gap-1.5 text-[13px] transition",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
          segmented ? "h-8 rounded-[8px]" : chips ? "h-8 rounded-full border" : "h-9 rounded-[10px]",
          compact ? "w-9 justify-center" : chips ? "px-3" : "px-3",
          segmented
            ? // Inside a boxed toggle the active half is told by its fill against the trough, so
              // it takes no border of its own — one would read as a box inside a box.
              active
              ? "bg-[var(--surface)] font-semibold text-[var(--text-primary)]"
              : "text-[var(--text-body)] hover:text-[var(--text-primary)]"
            : chips
              ? active
                ? "border-[var(--accent-border)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]"
                : "border-[var(--border-hairline)] bg-[var(--surface)] text-[var(--text-body)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              : active
                ? "border border-[var(--border-default)] bg-white font-semibold text-[var(--text-primary)] "
                : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
        );
        // A tooltip only where the icon is the whole label. On a labelled tab it just
        // repeats the word you're already reading.
        const tip = compact ? tab.label : undefined;
        const inner = (
          <>
            {tab.icon ? (
              <span
                className={cn("shrink-0", active ? (chips ? "text-[var(--accent-strong)]" : "text-[var(--accent)]") : "text-[var(--text-muted)]")}
              >
                {tab.icon}
              </span>
            ) : null}
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
    // Quiet in both states. On means the accent — no filled pill: `--surface-strong` on the record's
    // title row was a grey slab beside a name, heavier than the primary button on the tracker, and it
    // read as a disabled field rather than as a toggle that is on. Colour is enough to say "showing",
    // and the sheet it opens is itself the loudest possible confirmation.
    <Button
      tone="quiet"
      onClick={onClick}
      aria-pressed={active}
      className={active ? "text-[var(--accent-strong)] hover:bg-transparent hover:text-[var(--accent-strong)]" : undefined}
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
  // The header row is skipped entirely where a route puts nothing in it — the tracker's identity, mode
  // and profile live in the top bar now, so its panel starts at its own first row instead of opening
  // with a 52px bar holding one link.
  const hasHeader = Boolean(icon || title || titleMeta || breadcrumb || tabs || controls);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)]">
      {hasHeader ? (
        <div className="relative flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-[var(--border-hairline)] px-6 py-2">
          {/* No product mark here any more. It led this row on the record routes while they had no top
              bar, which left the app with two different homes for its identity — an 18px mark inside
              the panel on `/overview` and `/detail`, a 20px one on the canvas everywhere else, each
              with its own idea of where the person sits. Every route with a panel passes `AppTopBar`
              now, so this row is only ever the panel's subject and the panel's controls. */}
          {icon ? <span className="shrink-0 text-[var(--accent)]">{icon}</span> : null}
          {title ? <h1 className="font-display min-w-0 shrink-0 truncate text-[18px] leading-tight text-[var(--text-primary)]">{title}</h1> : null}
          {breadcrumb}
          {titleMeta}
          {tabs ? (
            <>
              <span aria-hidden className="ml-1.5 h-4 w-px shrink-0 bg-[var(--border-default)]" />
              <div className="shrink-0">{tabs}</div>
            </>
          ) : null}
          {controls ? <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">{controls}</div> : null}
        </div>
      ) : null}
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

// ── The top bar ──
// Above the panel, directly on the canvas: what the product is, which of its two surfaces you are on,
// and who you are. These were all inside the panel header, which made the panel's own chrome carry
// three different scales of thing at once — the product, the mode, the view and the view's filters,
// four levels in two rows. Out here the mode switch reads as switching *the whole page*, which is what
// it does, and the panel below is free to be about one thing.
export function AppTopBar({ center, right }: { center?: ReactNode; right?: ReactNode }) {
  return (
    // `relative` is load-bearing: without it the centred slot below resolves against the viewport
    // rather than this row, which put the mode toggle on the *window's* midline while the row it belongs
    // to stops at the rail. 56px and `pt-2 pb-3` give the row the same breathing space the panel's own
    // first row has, so the mark and the rail's "Assistant" land level.
    <div className="relative flex min-h-[56px] shrink-0 items-center gap-4 px-3 pb-3 pt-2">
      <Link
        href="/"
        className="font-display shrink-0 text-[20px] leading-tight text-[var(--text-primary)] transition hover:text-[var(--accent-strong)]"
      >
        AI Factory
      </Link>
      {/* Centred on the window, absolutely, so it sits on the axis whatever the widths of the mark and
          the profile either side of it. */}
      {center ? (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <div className="pointer-events-auto">{center}</div>
        </div>
      ) : null}
      {right ? <span className="ml-auto flex shrink-0 items-center gap-1.5">{right}</span> : null}
    </div>
  );
}

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
  search,
}: {
  // What you are looking at, and how much of it. The panel's own subject — the mode and the product
  // are up in the top bar now, so this row has one job.
  heading: string;
  count?: ReactNode;
  // Views that belong beside the subject rather than on a row of their own — two icon buttons, where
  // the pair is small enough to sit next to the heading without competing with it.
  views?: ReactNode;
  controls?: ReactNode;
  // The surface's standing action, set apart by a gap rather than a rule. Before `search`, not after:
  // search is the last thing in the row on both modes, so its position doesn't move when you switch —
  // and the green button in the middle of the run reads as the end of the *filters*, which it is.
  action?: ReactNode;
  // Always last, so the one control that appears on every mode is always in the same place.
  search?: ReactNode;
}) {
  return (
    // The rule is back. It came off while the panel header above it ended in one — two hairlines eight
    // pixels apart banded the top of the panel. With that header gone this is the panel's first row, so
    // the rule is what separates its subject from the views under it.
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--border-hairline)] px-5 py-2.5">
      <h2 className="shrink-0 text-[15px] font-semibold leading-tight text-[var(--text-primary)]">{heading}</h2>
      {count}
      {views ? <div className="ml-1.5 shrink-0">{views}</div> : null}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
        {controls}
        {action ? <span className="ml-1.5 shrink-0">{action}</span> : null}
        {search ? <span className="ml-1.5 shrink-0">{search}</span> : null}
      </div>
    </div>
  );
}

// The views of the active mode, on their own row under the subject. Not in the row above: a tab strip
// beside a heading and a run of filters is a third kind of control in a row that already had two.
export function PanelTabRow({ children }: { children: ReactNode }) {
  // `pt-3 pb-2`, and the content below adds its own `pt-4`: a chip row four pixels off the cards it
  // switches read as attached to the first one rather than as sitting over all of them.
  return <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-5 pb-2 pt-3">{children}</div>;
}

export function AppShell({
  banner,
  topBar,
  railHeader,
  rail,
  aside,
  railExpanded = false,
  railCollapsed = false,
  children,
}: {
  // Full-width strip above everything (e.g. a returned / rejected notice).
  banner?: ReactNode;
  // The canvas-level row above the columns: product, mode, person. Optional, because the record routes
  // keep their identity inside the panel header beside their breadcrumb.
  topBar?: ReactNode;
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
  // user bubbles keep a deliberate measure. Collapsed, the track goes entirely:
  // it used to leave a 36px strip holding the reopen button, which read as a
  // second empty column and kept 48px of width out of the content's reach for the
  // sake of one 28px control. That control lives in the route's own header row now
  // (`RailToggle`, beside the person), so putting the rail away gives the panel
  // everything it left behind.
  const hasRail = Boolean(rail || railHeader);
  // The rail is the *last* column. It led the row until now, which put the assistant between the
  // window edge and the thing being discussed: on every route the object of the conversation — a
  // board, a record, a portfolio — started 380px in, and the eye had to cross the chat to reach it.
  // On the right it's where a side panel is expected, the content keeps the left edge it shares with
  // the top bar's product mark, and the composer sits under the pointer's resting corner.
  //
  // On `/detail` the details sheet stays next to its record and the rail goes outside it: the sheet
  // is part of the object, the chat is about it. So it gets a **track of its own, in the middle** —
  // record, sheet, chat. It shared the rail's column and covered it for a while, which was cheaper in
  // width but put the assistant behind the one panel you open to check a fact you might then want to
  // ask about; a sheet that hides the chat makes the two halves of the record exclusive.
  // The sheet is *not* a track of this grid: it splits the panel's column, so the top bar above it
  // spans the record and the sheet together and stops at the rail. Two tracks here, as before.
  const railAway = railCollapsed;
  const oneColumn = railExpanded || railAway || !hasRail;
  const columns = oneColumn ? "minmax(0,1fr)" : "minmax(0,1fr) 364px";
  // Not while the chat is expanded — that state is the conversation taking the whole area, and the
  // record it discusses (sheet included) steps aside.
  const showAside = Boolean(aside) && !railExpanded;
  return (
    // One row of content: the rail and the panel, each carrying its own header.
    <main className="chat-glow flex h-screen flex-col overflow-hidden bg-[var(--shell-canvas)] text-[var(--text-primary)]">
      {banner}
      <div className="grid min-h-0 min-w-0 flex-1 gap-x-3 overflow-hidden px-3 pb-3 pt-1" style={{ gridTemplateColumns: columns }}>
        {railExpanded ? null : (
          // The top bar rides above *everything that isn't the chat*: the record and its details sheet
          // are one column here, split below the bar, so the row runs to the rail's edge and stops. It
          // ended at the panel's edge while the sheet was a track of the grid — the mark and the person
          // penned into the left two-thirds with a card to their right and nothing above it — and it
          // can't span the window either, or the rail's header is pushed down a row and the mode toggle
          // centres on an axis the panel doesn't share.
          <div className="flex min-h-0 min-w-0 flex-col">
            {topBar}
            <div className="flex min-h-0 min-w-0 flex-1 gap-x-3">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
              {/* The sheet: 364px, the rail's width, so the two side panels read as one track whichever
                  is showing. */}
              {showAside ? <section className="flex min-h-0 w-[364px] shrink-0 flex-col overflow-hidden">{aside}</section> : null}
            </div>
          </div>
        )}
        {/* The rail's grid item always renders — `display:none` rather than unmounted, so putting the
 rail away and bringing it back doesn't lose the conversation. Hiding it is only safe
 because the template drops the track at the same time: with the track still declared,
 a skipped item lets auto-placement slide the panel into the rail's.

 Column 2 only while there *is* a column 2. Pinned unconditionally, the expanded chat asked for
 a track the template no longer declared, so the grid made an implicit one beside the empty
 `1fr` — a full-width conversation rendered in the right-hand half of the window with a blank
 canvas to its left. */}
        {hasRail ? (
          <section
            className={cn("relative flex min-h-0 min-w-0 flex-col overflow-hidden", railAway && "hidden")}
            style={oneColumn ? undefined : { gridColumn: 2 }}
          >
            {railHeader}
            <div className="flex min-h-0 flex-1 flex-col">{rail}</div>
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
