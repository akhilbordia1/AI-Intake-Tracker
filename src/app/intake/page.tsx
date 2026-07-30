"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ChatComposer, ChatStartScreen } from "@/components/chat/chat-ui";

// ── Start a use case ──
// There is no intake form: describing the idea *is* the intake. This is the chat,
// full screen, and sending hands the idea to the record's guided flow, which asks
// the follow-ups and fills the Ideation stage.

const EXAMPLES = [
  "An assistant that summarises clinical trial protocols for our medical writers",
  "Something that drafts support replies from approved knowledge articles",
  "A tool that extracts fields from supplier invoices for AP review",
];

export default function StartUseCasePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [idea, setIdea] = useState("");

  function start(text: string) {
    const described = text.trim();
    if (!described) return;
    router.push(`/detail?idea=${encodeURIComponent(described)}`);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--shell-canvas)] text-[var(--text-primary)]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border-hairline)] px-4">
        <Link
          href="/"
          data-tip="All use cases"
          aria-label="All use cases"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)]"
        >
          <Sparkles size={15} />
        </Link>
        <span className="px-0.5 text-[15px] font-medium text-[var(--text-primary)]">New use case</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <ChatStartScreen
          size="lg"
          title="What do you want to build?"
          lead="Describe the idea in your own words — the problem, who it's for, and what good looks like. I'll ask the follow-ups and fill in the record as we go."
          starters={EXAMPLES.map((label, index) => ({ id: String(index), label }))}
          onPick={(item) => {
            setIdea(item.label);
            const input = inputRef.current;
            if (input) {
              input.focus();
              requestAnimationFrame(() => input.setSelectionRange(item.label.length, item.label.length));
            }
          }}
        >
          <ChatComposer
            inputRef={inputRef}
            value={idea}
            onChange={setIdea}
            onSend={() => start(idea)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                start(idea);
              }
            }}
            placeholder="Describe the AI use case you have in mind…"
            size="lg"
            padded={false}
          />
          <p className="mt-3 text-center text-[12px] text-[var(--text-muted)]">
            Not ready?{" "}
            <Link href="/" className="font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]">
              Back to the registry
            </Link>
          </p>
        </ChatStartScreen>
      </div>
    </main>
  );
}
