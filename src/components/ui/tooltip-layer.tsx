"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

// ── Tooltips ──
// One listener for the whole app: anything with a `data-tip` attribute gets a
// tooltip that appears immediately on hover or keyboard focus. Native `title`
// waits about a second and can't be configured, and a CSS `::after` bubble is
// clipped by the panels' `overflow: hidden` — a single portalled layer avoids
// both problems and needs nothing at the call site.

type Tip = { text: string; left: number; top: number; below: boolean };

const GAP = 8;
const MAX_WIDTH = 260;
// A tip that carries more than a phrase is written as lines, and a line as
// `Label: value` — the layer sets the label back so the values line up and read
// as a small table rather than a paragraph in a black box.
const RICH_WIDTH = 300;

function TipBody({ text }: { text: string }) {
  const lines = text.split("\n");
  if (lines.length === 1) return <>{text}</>;

  const [heading, ...rest] = lines;
  return (
    <>
      <span className="block font-semibold">{heading}</span>
      <span className="mt-1 block border-t border-white/15 pt-1">
        {rest.map((line) => {
          const split = line.indexOf(":");
          const label = split > 0 ? line.slice(0, split) : null;
          return (
            <span key={line} className="mt-0.5 flex gap-1.5 first:mt-0">
              {label ? (
                <>
                  <span className="shrink-0 font-normal text-white/60">{label}</span>
                  <span className="min-w-0">{line.slice(split + 1).trim()}</span>
                </>
              ) : (
                <span className="min-w-0">{line}</span>
              )}
            </span>
          );
        })}
      </span>
    </>
  );
}

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

  const rich = tip.text.includes("\n");

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: tip.left,
        top: tip.top,
        maxWidth: rich ? RICH_WIDTH : MAX_WIDTH,
        transform: `translate(-50%, ${tip.below ? "0" : "-100%"})`,
      }}
      className={cn(
        "pointer-events-none z-[100] rounded-[6px] bg-[var(--text-primary)] text-[11px] font-medium leading-[1.45] tracking-normal text-white",
        rich ? "px-2.5 py-1.5 text-left" : "whitespace-pre-line px-2 py-1",
      )}
    >
      <TipBody text={tip.text} />
    </div>,
    document.body,
  );
}
