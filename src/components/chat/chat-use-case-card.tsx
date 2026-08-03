"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StageIcon } from "@/components/ui/kit";
import { getAttentionMessage, type UseCaseCard } from "@/data/registry";

// A list answer, as cards — but not the board's card. In a conversation the answer
// is "these two, and what to do about them", so a chat card carries only that: the
// use case, the action, how long it's been waiting. Description, chips and owner
// belong on the board, where you're comparing cards rather than reading a reply.
// Shared by the registry rail and the portfolio rail, so a card answer looks the
// same wherever the assistant gives one.

export function ChatUseCaseCard({ card }: { card: UseCaseCard }) {
  return (
    // Two lines and nothing else: the title, then the record's own facts — id, the
    // action, how long it's waited — as one quiet meta line. The chevron only
    // appears on hover, so a list of these reads as an answer rather than a row of
    // buttons.
    <Link
      href={card.href}
      className="group flex items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[var(--border-input)] hover:bg-[var(--surface-muted)]"
    >
      <StageIcon stage={card.substage} size={14} className="shrink-0 text-[var(--text-muted)]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-[1.35] text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)]">
          {card.title}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] leading-[1.4] text-[var(--text-muted)]">
          <span className="font-mono shrink-0">{card.id}</span>
          <span aria-hidden className="h-2.5 w-px shrink-0 bg-[var(--border-default)]" />
          <span className="min-w-0 truncate font-medium text-[var(--accent-strong)]">{getAttentionMessage(card)}</span>
          {card.pendingFor ? (
            <>
              <span aria-hidden className="h-2.5 w-px shrink-0 bg-[var(--border-default)]" />
              <span className="shrink-0">Waiting {card.pendingFor}</span>
            </>
          ) : null}
        </span>
      </span>
      <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

export function ChatCardList({ cards }: { cards: UseCaseCard[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {cards.map((card) => (
        <ChatUseCaseCard key={card.id} card={card} />
      ))}
    </div>
  );
}
