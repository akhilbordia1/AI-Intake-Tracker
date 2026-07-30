"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { ChatComposer, ChatStarters } from "@/components/chat/chat-ui";

import {
  CompletionMeter,
  DateField,
  SaveStatus,
  SearchableSelect,
  SmartText,
  SmartTextarea,
  useSaveStatus,
} from "@/components/forms/fields";

type IntakeForm = {
  idea: string;
  attachment: string;
  template: string;
  useCaseName: string;
  oneLineDescription: string;
  businessProblem: string;
  desiredOutcome: string;
  expectedImpact: string;
  targetUsers: string;
  department: string;
  functionArea: string;
  team: string;
  country: string;
  businessSponsor: string;
  goLiveDate: string;
};

const emptyForm: IntakeForm = {
  idea: "",
  attachment: "",
  template: "",
  useCaseName: "",
  oneLineDescription: "",
  businessProblem: "",
  desiredOutcome: "",
  expectedImpact: "",
  targetUsers: "",
  department: "",
  functionArea: "",
  team: "",
  country: "",
  businessSponsor: "",
  goLiveDate: "",
};

const aiDraft: Partial<IntakeForm> = {
  idea:
    "We want an AI assistant that reviews incoming customer support tickets, drafts responses using approved knowledge articles, and keeps a human agent in control before anything is sent.",
  template: "Support assistant",
  useCaseName: "Support Ticket Response Agent",
  oneLineDescription: "Drafts support ticket responses for human review using approved knowledge content.",
  businessProblem:
    "Support teams spend significant time rewriting common responses and checking policy language before replying to customers.",
  desiredOutcome:
    "Agents receive high-quality draft responses faster while retaining final approval before customer communication.",
  expectedImpact: "Reduce response preparation time and improve consistency.",
  targetUsers: "Customer support agents and team leads",
  department: "Customer Operations",
  functionArea: "Support",
  team: "Tier 1 Support",
  country: "United States",
  businessSponsor: "Mira Kapoor",
  goLiveDate: "2026-09-15",
};

const templatePrompts: Record<string, string> = {
  "Support assistant":
    "We want an AI assistant that reviews incoming customer support tickets, drafts responses using approved knowledge articles, and keeps a human agent in control before anything is sent.",
  "Document processing":
    "We need an AI workflow that reads incoming operational documents, extracts important fields, and prepares a review summary for the responsible team.",
  "Knowledge retrieval":
    "We want employees to ask questions and receive answers grounded only in approved internal policy and knowledge base content.",
  "Workflow automation":
    "We want AI to monitor a repeatable workflow, draft next steps, and route exceptions to a human owner.",
};

const templates = Object.keys(templatePrompts);
const departments = ["Customer Operations", "Finance", "HR", "Legal", "Commercial", "IT", "Supply Chain"];
const functions = ["Support", "Accounts Payable", "People Services", "Compliance", "Sales", "Platform"];
const teams = ["Tier 1 Support", "AP Operations", "HR Shared Services", "Legal Ops", "Field Sales", "AI CoE"];
const countries = ["United States", "United Kingdom", "India", "Germany", "Singapore", "Global / multi-country"];
const sponsors = ["Mira Kapoor", "Aarav Mehta", "Lina Martin", "Ravi Shah", "Elena Weber"];

const REQUIRED_FIELDS: (keyof IntakeForm)[] = [
  "useCaseName",
  "oneLineDescription",
  "businessProblem",
  "desiredOutcome",
  "department",
  "functionArea",
  "businessSponsor",
  "goLiveDate",
];

type IntakeErrors = Partial<Record<keyof IntakeForm, string>>;

// useSearchParams needs a boundary for the page to stay prerenderable.
export default function IntakePage() {
  return (
    <Suspense fallback={null}>
      <IntakeFlow />
    </Suspense>
  );
}

function IntakeFlow() {
  const router = useRouter();
  // An idea described in the registry rail arrives here as ?idea= — the user
  // shouldn't have to type it twice.
  const carriedIdea = useSearchParams().get("idea");
  const [form, setForm] = useState<IntakeForm>(() => (carriedIdea ? { ...emptyForm, idea: carriedIdea } : emptyForm));
  const [mode] = useState<"ai" | "manual">("ai");
  const [errors, setErrors] = useState<IntakeErrors>({});
  const saveState = useSaveStatus(JSON.stringify(form));

  const doneCount = REQUIRED_FIELDS.filter((key) => form[key].trim()).length;
  const hasErrors = Object.values(errors).some(Boolean);

  function updateField(key: keyof IntakeForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  // AI-assist: fill one field with its context draft.
  function suggest(key: keyof IntakeForm) {
    const value = aiDraft[key];
    if (value) updateField(key, value);
  }

  // A template tag drops its prompt into the describe box — the user can edit or
  // send it, rather than jumping straight to the draft form.
  function applyTemplate(template: string) {
    setForm((current) => ({ ...current, idea: templatePrompts[template], template }));
    setErrors({});
  }

  function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: IntakeErrors = {};
    REQUIRED_FIELDS.forEach((key) => {
      if (!form[key].trim()) nextErrors[key] = "Required";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    router.push("/detail?from=create");
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[var(--shell-canvas)] text-[var(--text-primary)]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="pointer-events-none absolute left-0 top-0 z-20 flex h-14 items-center bg-transparent px-5">
          <Link
            href="/"
            aria-label="Back to home"
            title="Back to home"
            className="pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[var(--text-label)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={17} />
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 py-16 [scrollbar-gutter:stable]">
          <div className="mx-auto my-auto w-full max-w-[760px]">
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                Viatris Internal
              </div>
              <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-[var(--text-primary)]">
                Create New AI Use Case
              </h1>
            </div>

            {mode === "ai" ? (
              <>
                {/* Same composer as the record's chat — one input shape sitewide. */}
                <div className="mt-8">
                  <ChatComposer
                    value={form.idea}
                    onChange={(value) => updateField("idea", value)}
                    onSend={() => router.push("/detail?from=create")}
                    placeholder="Describe the AI agent you want to create…"
                    size="lg"
                    padded={false}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && form.idea.trim()) {
                        event.preventDefault();
                        router.push("/detail?from=create");
                      }
                    }}
                  />
                </div>

                {/* Templates as chat starters — same chips as the stage openers. */}
                <div className="mt-4">
                  <ChatStarters
                    align="center"
                    padded={false}
                    items={templates.map((template) => ({ id: template, label: template, icon: <Sparkles size={13} /> }))}
                    onPick={(item) => applyTemplate(item.id)}
                  />
                </div>
              </>
            ) : null}

            {mode === "manual" ? (
              <form
                onSubmit={submitIntake}
                noValidate
                className="mt-7 rounded-[10px] border border-[var(--border-default)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[var(--border-hairline)] px-5 py-4">
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">Initial submission form</div>
                  <div className="flex items-center gap-4">
                    <SaveStatus state={saveState} />
                    <CompletionMeter done={doneCount} total={REQUIRED_FIELDS.length} className="w-[180px]" />
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
                  <SmartText
                    label="Use case name"
                    required
                    value={form.useCaseName}
                    onChange={(value) => updateField("useCaseName", value)}
                    onSuggest={() => suggest("useCaseName")}
                    error={errors.useCaseName}
                    placeholder="Support Ticket Response Agent"
                  />
                  <SmartText
                    label="One-line description"
                    required
                    value={form.oneLineDescription}
                    onChange={(value) => updateField("oneLineDescription", value)}
                    onSuggest={() => suggest("oneLineDescription")}
                    error={errors.oneLineDescription}
                    placeholder="Short summary of the use case"
                  />
                  <div className="md:col-span-2">
                    <SmartTextarea
                      label="Business problem"
                      required
                      maxLength={400}
                      value={form.businessProblem}
                      onChange={(value) => updateField("businessProblem", value)}
                      onSuggest={() => suggest("businessProblem")}
                      error={errors.businessProblem}
                      placeholder="What problem does this solve?"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SmartTextarea
                      label="Desired outcome"
                      required
                      maxLength={400}
                      value={form.desiredOutcome}
                      onChange={(value) => updateField("desiredOutcome", value)}
                      onSuggest={() => suggest("desiredOutcome")}
                      error={errors.desiredOutcome}
                      placeholder="What should be true after this is live?"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SmartText
                      label="Expected impact / value"
                      hint="Formal KPIs are locked at GTAC"
                      value={form.expectedImpact}
                      onChange={(value) => updateField("expectedImpact", value)}
                      onSuggest={() => suggest("expectedImpact")}
                      placeholder="Hours saved, faster turnaround, improved consistency..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SmartText
                      label="Target users"
                      value={form.targetUsers}
                      onChange={(value) => updateField("targetUsers", value)}
                      onSuggest={() => suggest("targetUsers")}
                      placeholder="Customer support agents, team leads..."
                    />
                  </div>
                  <SearchableSelect
                    label="Department"
                    required
                    value={form.department}
                    options={departments}
                    onChange={(value) => updateField("department", value)}
                    error={errors.department}
                    placeholder="Select department"
                  />
                  <SearchableSelect
                    label="Function"
                    required
                    value={form.functionArea}
                    options={functions}
                    onChange={(value) => updateField("functionArea", value)}
                    error={errors.functionArea}
                    placeholder="Select function"
                  />
                  <SearchableSelect
                    label="Team"
                    value={form.team}
                    options={teams}
                    onChange={(value) => updateField("team", value)}
                    placeholder="Select team"
                  />
                  <SearchableSelect
                    label="Country"
                    value={form.country}
                    options={countries}
                    onChange={(value) => updateField("country", value)}
                    placeholder="Select country"
                  />
                  <SearchableSelect
                    label="Business sponsor"
                    required
                    value={form.businessSponsor}
                    options={sponsors}
                    onChange={(value) => updateField("businessSponsor", value)}
                    error={errors.businessSponsor}
                    placeholder="Select sponsor"
                  />
                  <DateField
                    label="Target go-live date"
                    required
                    value={form.goLiveDate}
                    onChange={(value) => updateField("goLiveDate", value)}
                    error={errors.goLiveDate}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[var(--border-hairline)] px-5 py-4">
                  <span className="text-[11px] text-[var(--risk-high-fg)]">
                    {hasErrors ? "Fill the required fields to submit." : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/"
                      className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-default)] bg-white px-3.5 text-[13px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--accent-strong)]"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-[var(--accent-strong)]"
                    >
                      Submit Use Case
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
