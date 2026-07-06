"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, NotebookPen, Paperclip, Sparkles } from "lucide-react";

import { useClickOutside } from "@/lib/use-click-outside";

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

const templateDrafts: Record<string, Partial<IntakeForm>> = {
  "Support assistant": aiDraft,
  "Document processing": {
    idea: templatePrompts["Document processing"],
    useCaseName: "Document Processing Reviewer",
    oneLineDescription: "Extracts key fields from operational documents and prepares review summaries.",
    businessProblem: "Teams manually read incoming documents and copy important details into review workflows.",
    desiredOutcome: "Reviewers receive structured summaries and extracted fields before they approve or route work.",
    expectedImpact: "Reduce manual document handling time and improve review consistency.",
    targetUsers: "Operations reviewers and document intake teams",
    department: "Finance",
    functionArea: "Accounts Payable",
    team: "AP Operations",
    country: "United States",
    businessSponsor: "Aarav Mehta",
    goLiveDate: "2026-10-01",
  },
  "Knowledge retrieval": {
    idea: templatePrompts["Knowledge retrieval"],
    useCaseName: "Policy Knowledge Retrieval Assistant",
    oneLineDescription: "Answers employee questions using approved internal policy and knowledge content.",
    businessProblem: "Employees spend time searching across policy pages and asking support teams repeat questions.",
    desiredOutcome: "Employees receive grounded answers quickly, with links back to approved source material.",
    expectedImpact: "Improve self-service resolution and reduce repeat internal support questions.",
    targetUsers: "Employees and shared services teams",
    department: "HR",
    functionArea: "People Services",
    team: "HR Shared Services",
    country: "Global / multi-country",
    businessSponsor: "Lina Martin",
    goLiveDate: "2026-09-30",
  },
  "Workflow automation": {
    idea: templatePrompts["Workflow automation"],
    useCaseName: "Workflow Exception Coordinator",
    oneLineDescription: "Monitors repeatable workflows, drafts next steps, and routes exceptions to owners.",
    businessProblem: "Workflow owners manually track status, chase missing inputs, and identify exceptions late.",
    desiredOutcome: "Routine next steps are drafted automatically while exceptions are routed to accountable owners.",
    expectedImpact: "Reduce coordination overhead and improve cycle time for repeatable processes.",
    targetUsers: "Process owners and operations teams",
    department: "IT",
    functionArea: "Platform",
    team: "AI CoE",
    country: "India",
    businessSponsor: "Ravi Shah",
    goLiveDate: "2026-11-15",
  },
};

const templates = Object.keys(templatePrompts);
const departments = ["Customer Operations", "Finance", "HR", "Legal", "Commercial", "IT", "Supply Chain"];
const functions = ["Support", "Accounts Payable", "People Services", "Compliance", "Sales", "Platform"];
const teams = ["Tier 1 Support", "AP Operations", "HR Shared Services", "Legal Ops", "Field Sales", "AI CoE"];
const countries = ["United States", "United Kingdom", "India", "Germany", "Singapore", "Global / multi-country"];
const sponsors = ["Mira Kapoor", "Aarav Mehta", "Lina Martin", "Ravi Shah", "Elena Weber"];

export default function IntakePage() {
  const router = useRouter();
  const [form, setForm] = useState<IntakeForm>(emptyForm);
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  function updateField(key: keyof IntakeForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyTemplate(template: string) {
    setForm((current) => ({ ...current, ...templateDrafts[template], template }));
    setMode("manual");
  }

  function generateDraft() {
    setForm((current) => ({ ...current, ...aiDraft, idea: current.idea || aiDraft.idea || "" }));
    setMode("manual");
  }

  function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/detail");
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#faf9f6] text-[var(--text-primary)]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="pointer-events-none absolute left-0 top-0 z-20 flex h-14 items-center bg-transparent px-7">
          <Link
            href="/"
            className="pointer-events-auto inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#e7e5e4] bg-white px-3 text-[12px] font-medium text-[var(--text-body)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb] hover:text-[#0c5f7a]"
            >
              <ArrowLeft size={14} />
            Back
            </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-10 [scrollbar-gutter:stable]">
          <div className="mx-auto w-full max-w-[760px] pt-20">
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0e7090]">
                Viatris Internal
              </div>
              <h1 className="mt-3 font-display text-[42px] leading-[1.05] text-[var(--text-primary)]">
                Create New AI Use Case
              </h1>
            </div>

            {mode === "ai" ? (
              <>
                <section className="mt-8 rounded-[10px] border border-[#e7e5e4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                  <textarea
                    value={form.idea}
                    onChange={(event) => updateField("idea", event.target.value)}
                    rows={5}
                    placeholder="Describe the AI agent you want to create..."
                    className="block min-h-[158px] w-full resize-none rounded-t-[10px] border-0 bg-transparent px-5 py-5 text-[15px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />

                  <div className="flex items-center justify-between gap-3 px-3 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileInput onChange={(value) => updateField("attachment", value)} />
                      {form.attachment ? (
                        <span className="truncate text-[12px] text-[var(--text-label)]">{form.attachment}</span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={generateDraft}
                      className="inline-flex h-9 w-[124px] shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#0e7090] px-3 text-[12px] font-medium text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-[#0c5f7a]"
                    >
                      Draft form
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </section>

                <div className="mt-4">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {templates.map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] border border-[#e7e5e4] bg-white px-3 text-[11px] font-medium text-[var(--text-label)] transition hover:border-[#8fc0cf] hover:text-[#0c5f7a]"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="my-9 flex items-center justify-center gap-3">
                  <span className="text-[12px] text-[var(--text-muted)]">Or start blank</span>
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#c5e2ea] bg-white px-3 text-[12px] font-medium text-[#0c5f7a] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb]"
                  >
                    <NotebookPen size={14} />
                    Create manually
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setMode("ai")}
                  className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#c5e2ea] bg-white px-3 text-[12px] font-medium text-[#0c5f7a] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb]"
                >
                  <Sparkles size={14} />
                  Create with AI
                </button>
              </div>
            )}

            {mode === "manual" ? (
              <form
                onSubmit={submitIntake}
                className="mt-7 rounded-[10px] border border-[#e7e5e4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
              >
                <div className="border-b border-[#f0efed] px-5 py-4">
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">Initial submission form</div>
                </div>

              <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
                <Field label="Use case name">
                  <TextInput
                    value={form.useCaseName}
                    onChange={(value) => updateField("useCaseName", value)}
                    placeholder="Support Ticket Response Agent"
                  />
                </Field>
                <Field label="One-line description">
                  <TextInput
                    value={form.oneLineDescription}
                    onChange={(value) => updateField("oneLineDescription", value)}
                    placeholder="Short summary of the use case"
                  />
                </Field>
                <Field label="Business problem" className="md:col-span-2">
                  <TextArea
                    value={form.businessProblem}
                    onChange={(value) => updateField("businessProblem", value)}
                    placeholder="What problem does this solve?"
                  />
                </Field>
                <Field label="Desired outcome" className="md:col-span-2">
                  <TextArea
                    value={form.desiredOutcome}
                    onChange={(value) => updateField("desiredOutcome", value)}
                    placeholder="What should be true after this is live?"
                  />
                </Field>
                <Field label="Expected impact / value" hint="Formal KPIs are locked at GTAC" className="md:col-span-2">
                  <TextInput
                    value={form.expectedImpact}
                    onChange={(value) => updateField("expectedImpact", value)}
                    placeholder="Hours saved, faster turnaround, improved consistency..."
                  />
                </Field>
                <Field label="Target users" className="md:col-span-2">
                  <TextInput
                    value={form.targetUsers}
                    onChange={(value) => updateField("targetUsers", value)}
                    placeholder="Customer support agents, team leads..."
                  />
                </Field>
                <Field label="Department">
                  <SelectField
                    value={form.department}
                    placeholder="Select department"
                    options={departments}
                    onChange={(value) => updateField("department", value)}
                  />
                </Field>
                <Field label="Function">
                  <SelectField
                    value={form.functionArea}
                    placeholder="Select function"
                    options={functions}
                    onChange={(value) => updateField("functionArea", value)}
                  />
                </Field>
                <Field label="Team">
                  <SelectField
                    value={form.team}
                    placeholder="Select team"
                    options={teams}
                    onChange={(value) => updateField("team", value)}
                  />
                </Field>
                <Field label="Country">
                  <SelectField
                    value={form.country}
                    placeholder="Select country"
                    options={countries}
                    onChange={(value) => updateField("country", value)}
                  />
                </Field>
                <Field label="Business sponsor">
                  <SelectField
                    value={form.businessSponsor}
                    placeholder="Select sponsor"
                    options={sponsors}
                    onChange={(value) => updateField("businessSponsor", value)}
                  />
                </Field>
                <Field label="Target go-live date">
                  <input
                    type="date"
                    value={form.goLiveDate}
                    onChange={(event) => updateField("goLiveDate", event.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#f0efed] px-5 py-4">
                <Link
                  href="/"
                  className="inline-flex h-9 items-center rounded-[8px] border border-[#e7e5e4] bg-white px-3.5 text-[13px] font-medium text-[var(--text-body)] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb] hover:text-[#0c5f7a]"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#0e7090] px-3.5 text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-[#0c5f7a]"
                >
                  Submit Use Case
                  <ArrowRight size={14} />
                </button>
              </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={["block min-w-0", className].join(" ")}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12px] font-medium text-[var(--text-primary)]">{label}</span>
      </div>
      {children}
      {hint ? <div className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">{hint}</div> : null}
    </label>
  );
}

const inputClassName =
  "h-9 w-full rounded-[8px] border border-[#e7e5e4] bg-white px-3 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#8fc0cf] focus:ring-2 focus:ring-[#e8f4f8]";

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={inputClassName}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      placeholder={placeholder}
      className="min-h-[92px] w-full resize-none rounded-[8px] border border-[#e7e5e4] bg-white px-3 py-2.5 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#8fc0cf] focus:ring-2 focus:ring-[#e8f4f8]"
    />
  );
}

function SelectField({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          inputClassName,
          "flex items-center justify-between gap-3 text-left",
          value ? "" : "text-[var(--text-muted)]",
        ].join(" ")}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          size={14}
          className={["shrink-0 text-[var(--text-muted)] transition", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-10 z-20 max-h-[220px] overflow-y-auto rounded-[8px] border border-[#e7e5e4] bg-white p-1 shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={[
                "block h-8 w-full rounded-[6px] px-2.5 text-left text-[12px] font-medium transition",
                value === option
                  ? "bg-[#e8f4f8] text-[#0c5f7a]"
                  : "text-[var(--text-body)] hover:bg-[#faf9f6] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FileInput({ onChange }: { onChange: (value: string) => void }) {
  return (
    <div>
      <input
        id="intake-attachment"
        type="file"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0]?.name ?? "")}
      />
      <label
        htmlFor="intake-attachment"
        aria-label="Attach document"
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[8px] border border-[#e7e5e4] bg-white text-[var(--text-label)] transition hover:border-[#8fc0cf] hover:bg-[#f4fafb] hover:text-[#0c5f7a]"
      >
        <Paperclip size={14} />
      </label>
    </div>
  );
}
