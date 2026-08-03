"use client";

import { Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AppShell, RailHeader } from "@/components/app-shell";
import { ChatComposer, ChatStartScreen } from "@/components/chat/chat-ui";

// ── Start a use case ──
// There is no intake form: describing the idea *is* the intake. This is the chat,
// full screen, and sending hands the idea to the record's guided flow, which asks
// the follow-ups and fills the Ideation stage.

// A suggestion is a nudge, not the sentence: the pill names the idea in three
// words, and picking it drops the full opening line into the composer for the user
// to finish. Full sentences as pills wrapped to three lines and read as prose you
// were meant to study rather than tap.
const EXAMPLES = [
  { label: "Protocol summariser", draft: "An assistant that summarises clinical trial protocols for our medical writers" },
  { label: "Support reply drafter", draft: "Something that drafts support replies from approved knowledge articles" },
  { label: "Invoice field extraction", draft: "A tool that extracts fields from supplier invoices for AP review" },
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
    // Literally the shell in its expanded-rail state, so the frame, the gutters and
    // the header's place in the row are the same code as the registry's full-width
    // chat — not a page that resembles it. Collapse and restore both put the
    // conversation back in the side panel on the registry, because that is what
    // this chat is when it isn't full width.
    <AppShell
      railExpanded
      railHeader={
        <RailHeader expanded onToggleExpand={() => router.push("/")} onToggleCollapse={() => router.push("/")} onNewChat={() => setIdea("")} />
      }
      rail={
        <ChatStartScreen
          size="lg"
          title="What do you want to build?"
          lead="Describe the idea in your own words — the problem, who it's for, and what good looks like. I'll ask the follow-ups and fill in the record as we go."
          // Same pill as the stage chats: the glyph is what marks a suggestion as
          // something to tap rather than a tag to read.
          starters={EXAMPLES.map((example, index) => ({ id: String(index), ...example, icon: <Lightbulb size={13} /> }))}
          onPick={(item) => {
            setIdea(item.draft);
            const input = inputRef.current;
            if (input) {
              input.focus();
              requestAnimationFrame(() => input.setSelectionRange(item.draft.length, item.draft.length));
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
        </ChatStartScreen>
      }
    >
      {null}
    </AppShell>
  );
}
