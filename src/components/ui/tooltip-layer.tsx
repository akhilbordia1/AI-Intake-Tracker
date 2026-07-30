"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// ── Tooltips ──
// One listener for the whole app: anything with a `data-tip` attribute gets a
// tooltip that appears immediately on hover or keyboard focus. Native `title`
// waits about a second and can't be configured, and a CSS `::after` bubble is
// clipped by the panels' `overflow: hidden` — a single portalled layer avoids
// both problems and needs nothing at the call site.

type Tip = { text: string; left: number; top: number; below: boolean };

const GAP = 8;
const MAX_WIDTH = 260;

export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    function show(target: EventTarget | null) {
      const element = target instanceof Element ? target.closest("[data-tip]") : null;
      const text = element?.getAttribute("data-tip")?.trim();
      if (!element || !text) return;
      const rect = element.getBoundingClientRect();
      // Flip below when there isn't room above, and clamp to the viewport so a
      // tip on an edge element stays readable.
      const below = rect.top < 44;
      setTip({
        text,
        left: Math.min(Math.max(MAX_WIDTH / 2 + 8, rect.left + rect.width / 2), window.innerWidth - MAX_WIDTH / 2 - 8),
        top: below ? rect.bottom + GAP : rect.top - GAP,
        below,
      });
    }

    function hide(event: Event) {
      const related = (event as MouseEvent).relatedTarget;
      if (related instanceof Element && related.closest("[data-tip]")) return;
      setTip(null);
    }

    const onOver = (event: Event) => show(event.target);
    const onFocus = (event: Event) => show(event.target);
    const clear = () => setTip(null);

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", hide, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", clear, true);
    // Any scroll or click moves what's under the pointer, so the tip goes away.
    window.addEventListener("scroll", clear, true);
    document.addEventListener("pointerdown", clear, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", hide, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", clear, true);
      window.removeEventListener("scroll", clear, true);
      document.removeEventListener("pointerdown", clear, true);
    };
  }, []);

  if (!tip || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: tip.left,
        top: tip.top,
        maxWidth: MAX_WIDTH,
        transform: `translate(-50%, ${tip.below ? "0" : "-100%"})`,
      }}
      className="pointer-events-none z-[100] whitespace-pre-line rounded-[6px] bg-[var(--text-primary)] px-2 py-1 text-[11px] font-medium leading-[1.35] tracking-normal text-white"
    >
      {tip.text}
    </div>,
    document.body,
  );
}
