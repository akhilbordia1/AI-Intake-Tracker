"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Markdown } from "@/components/document-record/markdown";

// ── A written document, in a dialog ──
// The product's surface for anything the agent *writes* rather than shows: a risk
// summary, a portfolio digest. The content is always one Markdown string, so the
// copy can come from a model or an .md file and this shell never changes.
// A native <dialog>, so Escape, the backdrop and focus containment come for free
// rather than as three more effects.

export function MarkdownModal({
  open,
  onClose,
  title,
  subtitle,
  source,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // A small tracked-caps line under the title: what the document is about.
  subtitle?: string;
  source: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop hits the dialog element itself; a click inside lands
      // on a child, so this closes on the backdrop without a second listener.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
      className="m-auto max-h-[82vh] w-[min(620px,calc(100vw-32px))] overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-0 text-[var(--text-primary)] backdrop:bg-[rgba(12,10,9,0.38)]"
    >
      <div className="flex max-h-[82vh] flex-col">
        <header className="flex shrink-0 items-start gap-2 border-b border-[var(--border-hairline)] px-6 pb-3.5 pt-4">
          <span className="min-w-0 flex-1">
            <h2 className="font-display text-[18px] leading-tight">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11px] uppercase tracking-[0.07em] text-[var(--text-muted)]">{subtitle}</p> : null}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={15} />
          </button>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-4">
          <Markdown source={source} />
        </div>
      </div>
    </dialog>
  );
}
