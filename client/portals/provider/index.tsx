import { useState, useEffect, useRef } from "react";
import { usePatientStore } from "@/store/patientStore";
import { useDemoStore } from "@/store/demoStore";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Bell, ChevronDown } from "lucide-react";
import { SAMPLE_PATIENTS, type PatientStatus } from "@/store/samplePatients";
import type { WorkflowData } from "@/engine/types";
// Cross-portal import — CoAssist's logo/brand config lives with the patient
// portal (client/portals/patient/config/branding.ts). @patient/* is Vite's
// explicit cross-portal alias (see vite.config.ts), separate from the
// portal-local @/ alias, so this reaches the patient portal's file without
// touching anything in WF1's code path.
import ManufacturerLogo from "@patient/components/brand/ManufacturerLogo";
import "./styles.css";

type Step = "email" | "login" | "pa-questions" | "pa-submitted" | "income-verify" | "income-submitted" | "coa-dashboard" | "coa-rx" | "coa-sent";

// ── SVG icons ─────────────────────────────────────────────────────────────────

function CheckedCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill="#007178" />
    </svg>
  );
}

function UncheckedCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 0.75C12.0051 0.75 15.25 3.99486 15.25 8C15.25 12.0051 12.0051 15.25 8 15.25C3.99486 15.25 0.75 12.0051 0.75 8C0.75 3.99486 3.99486 0.75 8 0.75Z" stroke="#6F7276" strokeWidth="1.5" />
    </svg>
  );
}

function RadioCheckedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M0 8C0 3.58125 3.58125 0 8 0C12.4187 0 16 3.58125 16 8C16 12.4187 12.4187 16 8 16C3.58125 16 0 12.4187 0 8ZM8 11C9.65625 11 11 9.65625 11 8C11 6.31563 9.65625 5 8 5C6.31563 5 5 6.31563 5 8C5 9.65625 6.31563 11 8 11Z" fill="#007178" />
    </svg>
  );
}

function RadioUncheckedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M8 14.4C11.5346 14.4 14.4 11.5346 14.4 8C14.4 4.46538 11.5346 1.6 8 1.6C4.46538 1.6 1.6 4.46538 1.6 8C1.6 11.5346 4.46538 14.4 8 14.4ZM8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16Z" fill="#6F7276" />
    </svg>
  );
}

function AssistRxLogo() {
  return (
    <div className="provider-portal-wordmark">
      <span className="provider-portal-wordmark__title">Provider Portal</span>
    </div>
  );
}

// ── Portal branding helper ────────────────────────────────────────────────────

function isBrandedFlow(flowType: string): boolean {
  return flowType.includes("iAssist");
}

// ── Brand Sidebar (for PA workflows and iAssist) ──────────────────────────────

function BrandSidebar({ isBranded }: { isBranded: boolean }) {
  if (isBranded) {
    return (
      <aside className="provider-sidebar provider-sidebar--branded">
        <div className="provider-sidebar__logo">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F85024768bb364ddda8d2365469c3ce76?format=webp&width=800&height=1200"
            alt="iAssist Logo"
            className="h-8 w-auto"
          />
        </div>
        <div className="provider-sidebar__illustration">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/a4826c434ed1dd6a529572eafddc92418cee2e88?width=928"
            alt="iAssist illustration"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="provider-sidebar">
      <div className="provider-sidebar__logo">
        <AssistRxLogo />
      </div>
      <div className="provider-sidebar__illustration">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/a4826c434ed1dd6a529572eafddc92418cee2e88?width=928"
          alt="Provider Portal illustration"
        />
      </div>
    </aside>
  );
}

// ── PA info summary ───────────────────────────────────────────────────────────

function PaSummaryTable({ isSubmitted = false }: { isSubmitted?: boolean } = {}) {
  const patientName = usePatientStore((s) => s.patientName);
  const patientDob = usePatientStore((s) => s.patientDob);
  const drugName = usePatientStore((s) => s.drugName);
  const payer = usePatientStore((s) => s.payer);

  const paInfoItems = [
    { label: "MEDICATION",          value: `${drugName} • NDC: 72266-0180-30`,   done: true },
    { label: "MEDICATION DETAILS",  value: "18 mg · 30-day supply",                            done: true },
    { label: "PATIENT",             value: `${patientName} • ${patientDob}`,                         done: true },
    { label: "PRESCRIBER",          value: "Sarah Chen, MD",                                   done: true },
    { label: "INSURANCE",           value: payer,                  done: true },
    { label: "PRIOR AUTHORIZATION", value: isSubmitted ? "Submitted" : "Electronic Questions Found", done: isSubmitted },
  ];

  return (
    <div className="pa-summary-table">
      {paInfoItems.map((item) => (
        <div key={item.label} className="pa-summary-row">
          <div className="pa-summary-row__label">
            {item.done ? <CheckedCircleIcon /> : <UncheckedCircleIcon />}
            <span className="pa-summary-label-text">{item.label}</span>
          </div>
          <p className="pa-summary-row__value">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Radio question ────────────────────────────────────────────────────────────

function RadioQuestion({
  question,
  value,
  onChange,
}: {
  question: string;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="pa-question">
      <p className="pa-question__text">{question}</p>
      <div className="pa-question__options">
        <label className="pa-radio-option">
          <button
            type="button"
            onClick={() => onChange("yes")}
            className="pa-radio-btn"
            aria-pressed={value === "yes"}
          >
            {value === "yes" ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
          </button>
          <span className="pa-radio-label">Yes</span>
        </label>
        <label className="pa-radio-option">
          <button
            type="button"
            onClick={() => onChange("no")}
            className="pa-radio-btn"
            aria-pressed={value === "no"}
          >
            {value === "no" ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
          </button>
          <span className="pa-radio-label">No</span>
        </label>
      </div>
    </div>
  );
}

// ── Email step ────────────────────────────────────────────────────────────────

function EmailStep({ onClickLink }: { onClickLink: () => void }) {
  return (
    <main className="provider-content">
      <div className="email-container">
        <div className="email-client">
          <div className="email-header">
            <div className="email-header__meta">
              <p className="email-meta__label">From:</p>
              <p className="email-meta__value">no-reply@assistrx.com</p>
            </div>
            <div className="email-header__meta">
              <p className="email-meta__label">Sent:</p>
              <p className="email-meta__value">Thursday, May 21, 2026 1:23 PM</p>
            </div>
            <div className="email-header__meta">
              <p className="email-meta__label">To:</p>
              <p className="email-meta__value">Sarah Chen, MD</p>
            </div>
            <div className="email-header__meta">
              <p className="email-meta__label">Subject:</p>
              <p className="email-meta__value">Action Required - Prior Authorization Submittal</p>
            </div>
          </div>

          <div className="email-body">
            <div className="email-logo">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F3a7a98e156014cee98b701ac84c6fa2c?format=webp&width=800&height=1200"
                alt="AssistRx Logo"
                style={{ maxWidth: "200px", height: "auto", marginBottom: "8px" }}
              />
            </div>

            <div className="email-content">
              <p className="email-greeting">Dear Dr. Chen,</p>

              <p className="email-paragraph">
                AssistRx has received your request to process a prior authorization for one of your patients. The patient's insurer requires a prior authorization (PA) submitted by their healthcare provider.
              </p>

              <p className="email-paragraph">
                An electronic PA request form has been automated and prepared for you by AssistRx. To complete and submit the PA follow these simple steps:
              </p>

              <ol className="email-list">
                <li className="email-list-item">
                  Click <a href="#" className="email-link" onClick={(e) => { e.preventDefault(); onClickLink(); }}>HERE</a> to be redirected to our PA request form, powered by AssistRx.
                </li>
                <li className="email-list-item">
                  Input your NPI and follow the instructions on the form to complete the submission.
                </li>
              </ol>

              <p className="email-note">
                *Your NPI is required to protect against fraudulent activity and to ensure only active prescribers can submit PAs.
              </p>

              <p className="email-paragraph email-paragraph--highlight">
                This link expires on 05/29/2026.
              </p>

              <p className="email-paragraph">
                If you are having any issues with this process or need to request a new link, please contact AssistRx at 1-866-424-6935.
              </p>
            </div>
          </div>

          <div className="email-footer">
            If you'd like to unsubscribe and stop receiving these emails <a href="#" className="email-footer-link">click here</a>.
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Step 1: Login ─────────────────────────────────────────────────────────────

function LoginStep({ onSubmit }: { onSubmit: () => void }) {
  const [npi, setNpi] = useState("");
  const [pin, setPin] = useState("");

  const canSubmit = npi.trim().length > 0 && pin.trim().length > 0;

  const fillDemoValues = () => {
    setNpi("3299879499");
    setPin("05367975");
  };

  return (
    <main className="provider-content">
      <p className="pa-eyebrow">PRIOR AUTHORIZATION</p>
      <h1 className="pa-login-heading">Verify<br />&amp; Complete</h1>
      <p className="pa-login-description">
        A request has been made for your office to complete a prior authorization form for one of your patients.
      </p>
      <p className="pa-login-description">
        Please enter your provider NPI and the associated security PIN to access and complete this request
      </p>

      <div className="pa-fields">
        <div className="pa-field">
          <button
            type="button"
            onClick={fillDemoValues}
            className="pa-field__label"
          >
            NPI
          </button>
          <input
            type="text"
            value={npi}
            onChange={(e) => setNpi(e.target.value)}
            className="pa-field__input"
            placeholder=""
          />
          <div className={`pa-field__underline ${npi ? "pa-field__underline--active" : ""}`} />
        </div>

        <div className="pa-field">
          <label className="pa-field__label">PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="pa-field__input"
            placeholder=""
          />
          <div className={`pa-field__underline ${pin ? "pa-field__underline--active" : ""}`} />
        </div>
      </div>

      <div className="pa-action-row">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="pa-btn-primary"
        >
          Submit
        </button>
      </div>
    </main>
  );
}

// ── Step 2: PA Review (first question) ────────────────────────────────────────

function PaReviewStep({ onNext }: { onNext: () => void }) {
  const [q1, setQ1] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Electronic Prior Authorization</p>
      <PaSummaryTable />

      <div className="pa-questions-section">
        <RadioQuestion
          question="Does the patient have a confirmed diagnosis of Idiopathic Pulmonary Fibrosis (IPF)?"
          value={q1}
          onChange={setQ1}
        />

        <div className="pa-comments-field">
          <label className="pa-comments-label">Comments:</label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="pa-comments-input"
          />
          <div className="pa-field__underline" />
        </div>
      </div>

      <div className="pa-action-row">
        <button onClick={onNext} className="pa-btn-secondary">
          Save
        </button>
      </div>
    </main>
  );
}

// ── Step 3: PA Questions (multi-question with nav) ────────────────────────────

function PaQuestionsStep({ onBack, onCancel, onNext }: { onBack: () => void; onCancel: () => void; onNext: () => void }) {
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [q3, setQ3] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const dispatch = useWorkflowDispatch();

  function handleNext() {
    dispatch('SUBMIT_PA', { source: 'provider_portal', comments, portal: 'provider' });
    onNext();
  }

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Electronic Prior Authorization</p>
      <PaSummaryTable />

      <div className="pa-questions-section">
        <RadioQuestion
          question="Does the patient have a confirmed diagnosis of obesity or chronic weight management condition?"
          value={q1}
          onChange={setQ1}
        />
        <RadioQuestion
          question="Has the patient tried and failed therapy with other weight loss medications or lifestyle modifications?"
          value={q2}
          onChange={setQ2}
        />
        <RadioQuestion
          question="Is the patient's current BMI ≥ 30 kg/m² or ≥ 27 kg/m² with weight-related complications?"
          value={q3}
          onChange={setQ3}
        />

        <div className="pa-comments-field">
          <label className="pa-comments-label">Comments:</label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="pa-comments-input"
          />
        </div>

      </div>

      <div className="pa-nav-row">
        <button onClick={onCancel} className="pa-btn-tertiary">Cancel</button>
        <div className="pa-nav-actions">
          <button onClick={onBack} className="pa-btn-secondary">Back</button>
          <button onClick={handleNext} className="pa-btn-primary">Next</button>
        </div>
      </div>
    </main>
  );
}

// ── Step 4: PA Submitted confirmation ───────────────────────────────────────

function PaSubmittedStep({ onDone }: { onDone: () => void }) {
  const dispatch = useWorkflowDispatch();

  const handleDone = () => {
    dispatch('COMPLETE_PROVIDER_PA', { portal: 'provider' });
    onDone();
  };

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Electronic Prior Authorization</p>
      <PaSummaryTable isSubmitted={true} />

      <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
        <svg width="64" height="64" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
          <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill="#007178" />
        </svg>
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1C1C1C" }}>
          PA Submitted
        </h2>
        <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 32 }}>
          The prior authorization has been submitted successfully. The patient will be notified once a decision is made.
        </p>
        <button onClick={handleDone} className="pa-btn-secondary">Done</button>
      </div>
    </main>
  );
}

// ── Income verification step ──────────────────────────────────────────────────

function IncomeVerifyStep({ onBack, onCancel, onNext }: { onBack: () => void; onCancel: () => void; onNext: () => void }) {
  const dispatch = useWorkflowDispatch();
  const patientName = usePatientStore((s) => s.patientName);

  function handleSubmit() {
    dispatch('VERIFY_INCOME', { portal: 'provider' });
    onNext();
  }

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Income Verification — CoA Direct to Patient</p>
      <PaSummaryTable />

      <div className="pa-questions-section">
        <p style={{ fontSize: 13, color: "#3e3e3c", marginBottom: 16 }}>
          Confirm that <strong>{patientName}</strong> meets income eligibility requirements for the Jascayd free drug program. The program covers patients whose household income qualifies them for assistance.
        </p>

        <div className="pa-question">
          <p className="pa-question__text">Has the patient's household income been verified as eligible for the CoA program?</p>
          <div className="pa-question__options">
            <label className="pa-radio-option">
              <button type="button" className="pa-radio-btn" aria-pressed="true" style={{ cursor: "default" }}>
                <RadioCheckedIcon />
              </button>
              <span className="pa-radio-label">Yes — Patient confirmed eligible</span>
            </label>
          </div>
        </div>

        <div className="pa-comments-field" style={{ marginTop: 16 }}>
          <label className="pa-comments-label">Clinical notes (optional):</label>
          <input type="text" className="pa-comments-input" placeholder="e.g. Income documentation reviewed" />
          <div className="pa-field__underline" />
        </div>
      </div>

      <div className="pa-nav-row">
        <button onClick={onCancel} className="pa-btn-tertiary">Cancel</button>
        <div className="pa-nav-actions">
          <button onClick={onBack} className="pa-btn-secondary">Back</button>
          <button onClick={handleSubmit} className="pa-btn-primary">Submit Verification</button>
        </div>
      </div>
    </main>
  );
}

// ── CoAssist Dashboard (WF3 start/end screen) ────────────────────────────────
//
// Replaces the old bare "Search Patient" screen. Same teal dashboard pattern
// as IAssistDashboard below (that one's WF4-only — left untouched here, this
// is a separate component so WF4 can't be affected by anything in this file).
// The search box filters the visible Patients table directly rather than a
// dropdown overlay, since the point here is "type until only the patient you
// want remains, then click their row" — matching the fact that only one row
// (Keanu Reeves) is actually wired to real patient data via usePersonaState.
//
// Only patients with an active Rx show up by default — Keanu starts with
// none (CoaRxForm is what creates his eRx), so he's hidden from the default
// view but still findable by name/DOB search. Once ENROLL fires (eRx sent),
// his real workflow state — not static demo data like everyone else's row —
// drives his status, and he moves to the top of the default list.

function deriveKeanuStatus(workflowData: WorkflowData): PatientStatus | null {
  if (workflowData.enrollmentStatus === "none") return null;

  if (workflowData.pharmacyStatus === "delivered") {
    return { label: "Delivered", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] };
  }
  if (workflowData.pharmacyStatus === "shipped" ||
      workflowData.pharmacyStatus === "processing" ||
      workflowData.pharmacyStatus === "ready") {
    return { label: "Dispensing", color: "warning", dots: ["completed", "completed", "completed", "completed", "pending", "disabled"] };
  }
  if (workflowData.paStatus === "approved") {
    return { label: "PA Approved", color: "success", dots: ["completed", "completed", "completed", "completed", "pending", "disabled"] };
  }
  // Denial → cash-pay is kept in the state machine for demo flexibility, but
  // CoA_DTP's live flow always approves (see coaDtp.ts / CRM Index.tsx), so
  // this is unreachable today.
  if (workflowData.paStatus === "denied") {
    return { label: "PA Denied", color: "error", dots: ["completed", "completed", "completed", "attention", "disabled", "disabled"] };
  }
  if (workflowData.paStatus === "submitted") {
    return { label: "PA Submitted", color: "warning", dots: ["completed", "completed", "completed", "pending", "disabled", "disabled"] };
  }
  // BI came back needing a PA, but the provider hasn't started it yet —
  // clicking this row in CoaDashboard takes the HCP straight into PA
  // questions (no email/login hop, unlike WF1).
  if (workflowData.biStatus === "complete") {
    return { label: "PA Required", color: "warning", dots: ["completed", "completed", "pending", "disabled", "disabled", "disabled"] };
  }
  return { label: "Enrolled", color: "warning", dots: ["completed", "pending", "disabled", "disabled", "disabled", "disabled"] };
}

function StatusDots({ dots }: { dots: PatientStatus["dots"] }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-neutral-300 rounded-full bg-white w-fit">
      {dots.map((d, i) => (
        <StatusDot key={i} color={d} />
      ))}
    </div>
  );
}

function CoaDashboard({ onSelect }: { onSelect: (patientId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const { workflowData } = usePersonaState("provider");
  const keanuStatus = deriveKeanuStatus(workflowData);

  // Keanu is the only roster entry backed by real state — everyone else is
  // static demo data. Overlay his live status/active-Rx flag onto his row.
  const patients = SAMPLE_PATIENTS.map((p) =>
    p.id === "keanu-reeves" && keanuStatus
      ? { ...p, hasActiveRx: true, status: keanuStatus }
      : p
  );

  const query = searchQuery.trim().toLowerCase();
  const visiblePatients = query
    ? patients.filter((p) => p.name.toLowerCase().includes(query) || p.dob.includes(query))
    : patients.filter((p) => p.hasActiveRx);

  // Once Keanu has an active Rx, he surfaces at the top of the list.
  const sortedPatients = [...visiblePatients].sort((a, b) =>
    a.id === "keanu-reeves" ? -1 : b.id === "keanu-reeves" ? 1 : 0
  );

  return (
    <div className="coa-dashboard min-h-screen bg-neutral-100 flex">
      {/* Sidebar */}
      <div className="hidden sm:flex w-[354px] bg-teal-600 text-white flex-col py-6 px-6">
        <div className="flex items-center gap-3 mb-12">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fd4102262e0444fd382b915ea166760c5"
            alt="CoAssist Logo"
            className="h-8 w-auto"
          />
        </div>

        <div className="bg-teal-700 rounded-lg p-5 mb-6">
          <h3 className="font-bold text-lg mb-2">CoA Direct to Patient</h3>
          <p className="text-sm font-semibold text-teal-100">
            Search for a patient below to start or resume their CoAssist enrollment.
          </p>
        </div>

        <div className="bg-teal-800 rounded-lg p-6 flex-1">
          <h3 className="font-bold text-lg text-white mb-6">To-Do List</h3>
          <p className="text-teal-200 text-sm font-semibold text-center opacity-70">This feature is coming soon.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="relative bg-white border-b border-neutral-300 h-14 flex items-center px-4 sm:px-8 gap-4">
          <Search size={20} className="text-neutral-600 flex-shrink-0" />
          <div className="flex-1 flex flex-col">
            <label htmlFor="coa-search-input" className="sr-only">
              Search for patient by name or date of birth
            </label>
            <input
              id="coa-search-input"
              type="text"
              placeholder="Search for patient by name or date of birth"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-600 focus:ring-2 focus:ring-teal-600 focus:ring-inset rounded px-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search patients"
            />
          </div>
          <button
            className="text-teal-600 font-semibold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded px-2 py-1"
            aria-label="Add new patient"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add New Patient</span>
            <span className="sm:hidden">Add</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-teal-600 font-bold text-xs">
                SC
              </div>
              <span className="text-sm font-normal">Dr. Sarah Chen</span>
            </div>
            <button
              className="relative text-teal-600 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded p-1"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-100">
          <h2 className="text-xl font-normal text-neutral-800 mb-4">Patients</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="text-left p-4 font-bold text-neutral-600 text-sm">Patient</th>
                  <th className="text-left p-4 font-bold text-neutral-600 text-sm">Medication</th>
                  <th className="text-left p-4 font-bold text-neutral-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => onSelect(patient.id)}
                    className="border-b border-neutral-300 last:border-b-0 hover:bg-teal-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-bold text-sm text-neutral-800">{patient.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">DOB {patient.dob}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-neutral-800">{patient.medication}</p>
                    </td>
                    <td className="p-4">
                      {patient.status ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusDots dots={patient.status.dots} />
                          <StatusBadge status={patient.status.label} color={patient.status.color} />
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">No Rx yet</p>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedPatients.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-sm text-neutral-500">
                      No patients found for "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COA eRx Form ────────────────────────────────────────────────────────────

// "Most common" pins the top of the list; everything else is alphabetical
// below a divider. Names reuse the ones already established elsewhere in
// this demo (CRM/iAssist medication cards) where they exist.
const MEDICATION_MOST_COMMON = ["Assistivan", "Assistimab", "Ramoni", "Voloxivan"];
const MEDICATION_OTHERS = ["Aficamten", "Assistivox", "Kelvara", "Nolrivex", "Zylodine"];

function MedicationOption({
  med,
  selected,
  onSelect,
}: {
  med: string;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(med)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: selected ? 700 : 400,
        color: selected ? "#007178" : "#1C1C1C",
        background: selected ? "#EEF9F9" : "transparent",
        border: "none",
        cursor: "pointer",
      }}
      onMouseOver={(e) => {
        if (!selected) e.currentTarget.style.background = "#F5F5F5";
      }}
      onMouseOut={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      {med}
    </button>
  );
}

function MedicationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const select = (med: string) => {
    onChange(med);
    setOpen(false);
  };

  return (
    <div className="pa-field" style={{ marginBottom: 24, position: "relative" }}>
      <label className="pa-field__label">Medication Order</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
        }}
        className="pa-field__input"
        style={{
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="pa-field__underline pa-field__underline--active" />

      {open && (
        <div
          role="listbox"
          aria-label="Select medication"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            maxHeight: 300,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6F7276", textTransform: "uppercase", padding: "10px 16px 4px", margin: 0 }}>
            Most Common
          </p>
          {MEDICATION_MOST_COMMON.map((med) => (
            <MedicationOption key={med} med={med} selected={med === value} onSelect={select} />
          ))}

          <hr style={{ border: "none", borderTop: "1px solid #E0E0E0", margin: "8px 0" }} />

          {MEDICATION_OTHERS.map((med) => (
            <MedicationOption key={med} med={med} selected={med === value} onSelect={select} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoaRxForm({ onSend }: { onSend: () => void }) {
  const [dosage, setDosage] = useState("0.5 mg");
  const [refills, setRefills] = useState("3");
  // Local to this screen on purpose — not written back to usePatientStore.
  // That store is the single active patient identity shared by every flow
  // (including WF1), so changing it here could bleed a WF3-only choice into
  // other flows. The confirmation screen still shows the seeded drug name.
  const [medication, setMedication] = useState(usePatientStore.getState().drugName);
  const patientName = usePatientStore((s) => s.patientName);
  const patientDob = usePatientStore((s) => s.patientDob);
  const npi = usePatientStore((s) => s.npi);
  const payer = usePatientStore((s) => s.payer);

  return (
    <main className="provider-content provider-content--pa">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <ManufacturerLogo variant="colors" className="h-7 w-auto" />
        <p className="pa-section-title" style={{ margin: 0 }}>COA Direct to Patient — ePrescription</p>
      </div>

      {/* Compact context line — replaces the old checklist + boxed read-only
          fields, which just repeated the same handful of facts that never
          change on this screen. */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#1C1C1C", margin: "0 0 4px 0" }}>
          {patientName} <span style={{ fontWeight: 400, color: "#6F7276" }}>· {patientDob}</span>
        </p>
        <p style={{ fontSize: 13, color: "#6F7276", margin: 0 }}>
          Provider: Sarah Chen, MD · NPI {npi}
        </p>
        <p style={{ fontSize: 13, color: "#6F7276", margin: "4px 0 0 0" }}>
          Insurance: {payer}
        </p>
      </div>

      <div className="pa-questions-section">
        <MedicationSelect value={medication} onChange={setMedication} />

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px", marginBottom: 24 }}>
            <p className="pa-question__text">Dosage</p>
            <div className="pa-question__options">
              {["0.5 mg", "1.0 mg", "2.4 mg"].map((d) => (
                <label key={d} className="pa-radio-option">
                  <button
                    type="button"
                    onClick={() => setDosage(d)}
                    className="pa-radio-btn"
                    aria-pressed={dosage === d}
                  >
                    {dosage === d ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
                  </button>
                  <span className="pa-radio-label">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ flex: "1 1 160px", marginBottom: 24 }}>
            <label className="pa-field__label">Number of Refills</label>
            <select
              value={refills}
              onChange={(e) => setRefills(e.target.value)}
              className="pa-field__input"
              style={{ cursor: "pointer" }}
            >
              <option value="0">0</option>
              <option value="3">3</option>
              <option value="6">6</option>
              <option value="11">11</option>
            </select>
            <div className="pa-field__underline" />
          </div>
        </div>
      </div>

      <div className="pa-action-row">
        <button onClick={onSend} className="pa-btn-primary">Send eRx</button>
      </div>
    </main>
  );
}

// ── COA Sent Confirmation ────────────────────────────────────────────────────

function CoaSentConfirmation({ onReturnToDashboard }: { onReturnToDashboard: () => void }) {
  const patientName = usePatientStore((s) => s.patientName);
  const drugName = usePatientStore((s) => s.drugName);

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">COA Direct to Patient — Confirmation</p>

      <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
        <svg width="64" height="64" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
          <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill="#007178" />
        </svg>
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1C1C1C" }}>
          eRx sent successfully
        </h2>
        <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 16 }}>
          The patient will receive a consent text shortly
        </p>
        <div style={{ backgroundColor: "#F5F5F5", padding: 16, borderRadius: 8, textAlign: "left", marginTop: 24 }}>
          <p style={{ fontSize: 12, color: "#6F7276", margin: "0 0 8px 0" }}>Patient: <strong>{patientName}</strong></p>
          <p style={{ fontSize: 12, color: "#6F7276", margin: "0 0 8px 0" }}>Medication: <strong>{drugName}</strong></p>
        </div>
      </div>

      <div className="pa-action-row">
        <button onClick={onReturnToDashboard} className="pa-btn-primary">
          Return to Dashboard
        </button>
      </div>
    </main>
  );
}

// ── iAssist Dashboard (branded dashboard experience) ──────────────────────────

interface PatientRow {
  id: string;
  name: string;
  dob: string;
  address: string;
  medication: string;
  status: string;
  statusColor: "success" | "warning" | "error";
}

interface RenewalItem {
  id: string;
  patient: string;
  reach: string;
  date: number;
  month: string;
}

const PATIENTS: PatientRow[] = [
  {
    id: "1",
    name: "Laura Olson",
    dob: "DOB 04/10/1950",
    address: "8753 Carlton Dr. Orlando, FL 50000",
    medication: "Assistivan",
    status: "PA Questions",
    statusColor: "warning",
  },
  {
    id: "2",
    name: "Bob Smith",
    dob: "DOB 04/10/1950",
    address: "2200 North Creek Pwky Orlando, FL 50000",
    medication: "Assistimab",
    status: "Finish Draft",
    statusColor: "warning",
  },
  {
    id: "3",
    name: "Jerry Hermiston",
    dob: "DOB 04/10/1950",
    address: "756 Meredith Dr. Orlando, FL 50000",
    medication: "Ramoni",
    status: "PA Denied",
    statusColor: "error",
  },
  {
    id: "4",
    name: "Edward Sanders",
    dob: "DOB 04/10/1950",
    address: "4905 100th St. Orlando, FL 50000",
    medication: "Assistimab",
    status: "Finish Draft",
    statusColor: "warning",
  },
  {
    id: "5",
    name: "Anna Lee",
    dob: "DOB 04/10/1950",
    address: "56 Turnip Ave. #776 Orlando, FL 50000",
    medication: "Ramoni",
    status: "Complete",
    statusColor: "success",
  },
  {
    id: "6",
    name: "Eric Herr",
    dob: "DOB 04/10/1950",
    address: "348 Dominion Circle Orlando, FL 50000",
    medication: "Assistivan",
    status: "Complete",
    statusColor: "success",
  },
  {
    id: "7",
    name: "Katherine Johnson",
    dob: "DOB 04/10/1950",
    address: "690 Northwest Blvd. #90 Orlando, FL 50000",
    medication: "Assistivan",
    status: "Complete",
    statusColor: "success",
  },
  {
    id: "8",
    name: "Donna Rossman",
    dob: "DOB 04/10/1950",
    address: "80012 Mulberry Ave. #1009 Orlando, FL 50000",
    medication: "Assistimab",
    status: "Complete",
    statusColor: "success",
  },
];

const RENEWALS: RenewalItem[] = [
  { id: "1", patient: "Teri Hatcher", reach: "Reauth: Volixivan", date: 28, month: "APR" },
  { id: "2", patient: "Dennis Johnson", reach: "Reauth: Assistimab", date: 29, month: "APR" },
  { id: "3", patient: "Mitch Gruemmer", reach: "Reauth: Assistimab", date: 2, month: "MAY" },
  { id: "4", patient: "Betty White", reach: "Reauth: Ramoni", date: 10, month: "MAY" },
  { id: "5", patient: "Nancy Blank", reach: "Reauth: Ramoni", date: 12, month: "MAY" },
  { id: "6", patient: "Steve Brown", reach: "Reauth: Ramoni", date: 13, month: "MAY" },
  { id: "7", patient: "Sherrie Park", reach: "Reauth: Ramoni", date: 14, month: "MAY" },
];

const MEDICATIONS = [
  { name: "Assistivan", action: "Start" },
  { name: "Assistimab", action: "Start" },
  { name: "Assistivox", action: "Start" },
];

function StatusDot({ color }: { color: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full"
      style={{
        backgroundColor:
          color === "completed" ? "#035257" : color === "pending" ? "#9EC4C7" : color === "attention" ? "#D8693A" : "#C4C4C4",
      }}
    />
  );
}

function StatusBar() {
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-neutral-300 rounded-full bg-white w-fit">
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: "success" | "warning" | "error" }) {
  const bgColor = color === "success" ? "bg-neutral-100" : color === "warning" ? "bg-orange-100" : "bg-red-100";
  const textColor = color === "success" ? "text-neutral-600" : color === "warning" ? "text-orange-800" : "text-red-600";

  return <div className={`px-3 py-1 rounded text-xs font-semibold ${bgColor} ${textColor}`}>{status}</div>;
}

function IAssistDashboard() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const searchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchQuery]);

  return (
    <div className="iassist-portal min-h-screen bg-neutral-100 flex">
      {/* Sidebar */}
      <div className="hidden sm:flex w-[354px] bg-teal-600 text-white flex-col py-6 px-6">
        <div className="flex items-center gap-3 mb-12">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F85024768bb364ddda8d2365469c3ce76?format=webp&width=800&height=1200"
            alt="iAssist Logo"
            className="h-8 w-auto"
          />
        </div>

        {/* High Five Card */}
        <div className="bg-teal-700 rounded-lg p-5 mb-6">
          <h3 className="font-bold text-lg mb-2">High five!</h3>
          <p className="text-sm font-semibold text-teal-100 mb-4">
            You've helped 10 patients get started on therapy this week.
          </p>
          <div className="w-20 h-20 bg-teal-500 rounded-full opacity-75" />
        </div>

        {/* To-Do List */}
        <div className="bg-teal-800 rounded-lg p-6 flex-1">
          <h3 className="font-bold text-lg text-white mb-6">To-Do List</h3>
          <p className="text-teal-200 text-sm font-semibold text-center opacity-70">This feature is coming soon.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="relative bg-white border-b border-neutral-300 h-14 flex items-center px-4 sm:px-8 gap-4">
          <Search size={20} className="text-neutral-600 flex-shrink-0" />
          <div className="flex-1 flex flex-col">
            <label htmlFor="search-input" className="sr-only">
              Search for patient or medication
            </label>
            <input
              id="search-input"
              ref={searchInputRef}
              type="text"
              placeholder="Search for patient or medication"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-600 focus:ring-2 focus:ring-teal-600 focus:ring-inset rounded px-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              aria-label="Search patients and medications"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? "search-results" : undefined}
              aria-autocomplete="list"
              onKeyDown={(e) => {
                if (!searchQuery) {
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
                  return;
                }

                const patientResults = PATIENTS.filter(
                  (p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.medication.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const medResults = MEDICATIONS.filter((m) =>
                  m.name.toLowerCase().includes(searchQuery.toLowerCase())
                );

                const allResults = [
                  ...medResults.map((m) => ({ type: "med" as const, data: m })),
                  ...patientResults.map((p) => ({ type: "patient" as const, data: p })),
                ];

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSearchOpen(true);
                  setSelectedResultIndex((prev) =>
                    prev < allResults.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSearchOpen(true);
                  setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (selectedResultIndex >= 0 && selectedResultIndex < allResults.length) {
                    const selected = allResults[selectedResultIndex];
                    const displayText =
                      selected.type === "med" ? selected.data.name : selected.data.name;
                    setSearchQuery(displayText);
                    setSearchOpen(false);
                    setSelectedResultIndex(-1);
                  }
                } else if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSelectedResultIndex(-1);
                }
              }}
              onBlur={() => {
                if (searchBlurTimeoutRef.current) {
                  clearTimeout(searchBlurTimeoutRef.current);
                }
                searchBlurTimeoutRef.current = setTimeout(() => {
                  setSearchOpen(false);
                  setSelectedResultIndex(-1);
                }, 200);
              }}
            />
          </div>
          <button
            className="text-teal-600 font-semibold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded px-2 py-1"
            aria-label="Add new patient"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add New Patient</span>
            <span className="sm:hidden">Add</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-teal-600 font-bold text-xs">
                SC
              </div>
              <span className="text-sm font-normal">Dr. Sarah Chen</span>
            </div>
            <button
              className="relative text-teal-600 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded p-1"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span
                className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Medications Column */}
            <div>
              <h2 className="text-xl font-normal text-neutral-800 mb-4">Medications</h2>
              <div className="space-y-3">
                {MEDICATIONS.map((med) => (
                  <div key={med.name} className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="font-bold text-lg text-teal-600 mb-3">{med.name}</h3>
                    <button className="bg-teal-600 text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-teal-700">
                      {med.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Patients Column */}
            <div className="col-span-1 sm:col-span-2">
              <h2 className="text-xl font-normal text-neutral-800 mb-4">Patients</h2>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-300">
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Patient</th>
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Address</th>
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Medication</th>
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PATIENTS.map((patient) => (
                      <tr key={patient.id} className="border-b border-neutral-300 hover:bg-neutral-50">
                        <td className="p-4">
                          <p className="font-bold text-sm text-neutral-800">{patient.name}</p>
                          <p className="text-xs text-neutral-500 mt-1">{patient.dob}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-bold text-neutral-800">{patient.address}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-bold text-neutral-800">{patient.medication}</p>
                        </td>
                        <td className="p-4 flex items-center gap-2">
                          <StatusBar />
                          <StatusBadge status={patient.status} color={patient.statusColor} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
                <p>View All Patients</p>
                <div className="flex items-center gap-2">
                  <span>1-8 of 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-normal text-neutral-800 mb-4">Upcoming Renewals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RENEWALS.map((renewal) => (
                <div key={renewal.id} className="border border-neutral-300 rounded p-4 hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-600 text-white rounded px-3 py-2 text-center min-w-12">
                      <p className="font-bold text-sm">{renewal.date}</p>
                      <p className="text-xs font-bold">{renewal.month}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-800">{renewal.patient}</p>
                      <p className="text-xs text-neutral-500">{renewal.reach}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      {searchOpen && searchQuery && (
        <div
          id="search-results"
          className="fixed top-14 left-0 right-0 sm:left-[354px] bg-white border border-neutral-300 border-t-0 shadow-lg max-h-96 overflow-auto z-50"
          role="listbox"
          aria-label="Search results"
        >
          <div>
            {(() => {
              const patientResults = PATIENTS.filter(
                (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.medication.toLowerCase().includes(searchQuery.toLowerCase())
              );
              const medResults = MEDICATIONS.filter((m) =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (patientResults.length === 0 && medResults.length === 0) {
                return (
                  <div className="p-4 text-center">
                    <p className="text-sm text-neutral-500">No results found for "{searchQuery}"</p>
                  </div>
                );
              }

              let resultIndex = 0;

              return (
                <>
                  {medResults.length > 0 && (
                    <div role="group" aria-labelledby="med-group-label">
                      <div id="med-group-label" className="text-xs font-bold text-neutral-600 px-4 py-3 bg-neutral-50 border-b border-neutral-200 sticky top-0">
                        Medications
                      </div>
                      {medResults.map((med) => {
                        const isSelected = resultIndex === selectedResultIndex;
                        resultIndex++;
                        return (
                          <div
                            key={med.name}
                            role="option"
                            aria-selected={isSelected}
                            className={`px-4 py-3 cursor-pointer border-b border-neutral-200 last:border-b-0 transition-colors ${
                              isSelected ? "bg-teal-50 ring-2 ring-inset ring-teal-600" : "hover:bg-neutral-100"
                            }`}
                            onClick={() => {
                              setSearchQuery(med.name);
                              setSearchOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <p className="font-semibold text-sm text-neutral-800">{med.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {patientResults.length > 0 && (
                    <div role="group" aria-labelledby="patient-group-label">
                      <div id="patient-group-label" className="text-xs font-bold text-neutral-600 px-4 py-3 bg-neutral-50 border-b border-neutral-200 sticky top-0">
                        Patients
                      </div>
                      {patientResults.map((patient) => {
                        const isSelected = resultIndex === selectedResultIndex;
                        resultIndex++;
                        return (
                          <div
                            key={patient.id}
                            role="option"
                            aria-selected={isSelected}
                            className={`px-4 py-3 cursor-pointer border-b border-neutral-200 last:border-b-0 transition-colors ${
                              isSelected ? "bg-teal-50 ring-2 ring-inset ring-teal-600" : "hover:bg-neutral-100"
                            }`}
                            onClick={() => {
                              setSearchQuery(patient.name);
                              setSearchOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <p className="font-semibold text-sm text-neutral-800">{patient.name}</p>
                            <p className="text-xs text-neutral-500">{patient.medication}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Portal Component ─────────────────────────────────────────────────────

export default function ProviderPortal() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('provider');
  const [step, setStep] = useState<Step>(() =>
    useDemoStore.getState().flowType === 'CoA_DTP' ? 'coa-dashboard' : 'email'
  );
  const dispatch = useWorkflowDispatch();
  const flowType = workflowData.flowType;
  const providerPACompleted = workflowData.providerPACompleted;
  const paStatus = workflowData.paStatus;
  const patientName = usePatientStore((s) => s.patientName);
  const isBranded = isBrandedFlow(flowType);
  const isCoA = flowType === "CoA_DTP";
  const biStatus = workflowData.biStatus;

  const storeFlowType = useDemoStore((s) => s.flowType);

  useEffect(() => {
    if (storeFlowType !== 'CoA_DTP') {
      return;
    }
    // CoA_DTP has no more provider-side steps after sending the eRx — return
    // to the dashboard (WF3's start/end screen) once BI completes.
    // biStatus complete is the reliable signal — paStatus may update too fast.
    // (Previously this set 'email', the Fax flow's login screen — a leftover
    // that doesn't exist in the CoA_DTP flow at all.)
    if (biStatus === 'complete' && step === 'coa-sent') {
      setStep('coa-dashboard');
    }
  }, [storeFlowType, biStatus, step]);

  // `step` is local UI state with no memory of the outer workflow reset —
  // it only ever advances forward via the handlers below, so a reset that
  // clears workflowData would otherwise leave this portal stuck mid-flow
  // (e.g. on "pa-questions") with none of its own state to match. Force it
  // back to this flow's starting step on every reset.
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);

  useEffect(() => {
    if (resetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = resetNonce;
    setStep(storeFlowType === 'CoA_DTP' ? 'coa-dashboard' : 'email');
  }, [resetNonce, storeFlowType]);

  if (isBranded) {
    return <IAssistDashboard />;
  }

  // Show dashboard when PA is completed
  if (providerPACompleted) {
    const isCompletedCoA = flowType === "CoA_DTP";

    // Derive primary submission type and status based on flow type
    const getPrimarySubmissionData = () => {
      if (isCompletedCoA) {
        return {
          rxName: "Assistivan eRx",
          status: "Sent",
          statusColor: "#D1E7F5",
          statusTextColor: "#0555B0",
        };
      }
      return {
        rxName: "Assistivan Prior Authorization",
        status: paStatus === "approved" ? "Approved" : "Pending",
        statusColor: paStatus === "approved" ? "#D1E7F5" : "#FEF3C7",
        statusTextColor: paStatus === "approved" ? "#0555B0" : "#92400E",
      };
    };

    const primaryData = getPrimarySubmissionData();

    // Sample patients for dashboard (keeping Keanu at top)
    const samplePatients = [
      {
        name: patientName,
        rxName: primaryData.rxName,
        timestamp: "Submitted Today",
        status: primaryData.status,
        statusColor: primaryData.statusColor,
        statusTextColor: primaryData.statusTextColor,
      },
      {
        name: "Sarah Mitchell",
        rxName: "Assistimab Prior Authorization",
        timestamp: "Submitted Yesterday",
        status: "Approved",
        statusColor: "#D1E7F5",
        statusTextColor: "#0555B0",
      },
      {
        name: "James Chen",
        rxName: "Ramoni Prior Authorization",
        timestamp: "Submitted 2 days ago",
        status: "Pending",
        statusColor: "#FEF3C7",
        statusTextColor: "#92400E",
      },
      {
        name: "Maria Garcia",
        rxName: "Assistivan Income Verification",
        timestamp: "Submitted 3 days ago",
        status: "Verified",
        statusColor: "#D1E7F5",
        statusTextColor: "#0555B0",
      },
      {
        name: "David Chen",
        rxName: "Assistimab Prior Authorization",
        timestamp: "Submitted 4 days ago",
        status: "Denied",
        statusColor: "#FEE2E2",
        statusTextColor: "#B91C1C",
      },
    ];

    return (
      <div className="provider-portal">
        <BrandSidebar isBranded={isBranded} />
        <main className="provider-content">
          <div style={{ padding: "40px 20px", maxWidth: 1000, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C1C1C", marginBottom: 8 }}>
              Provider Portal
            </h1>
            <p style={{ fontSize: 14, color: "#6F7276", marginBottom: 32 }}>
              Workflow — Prior Authorization
            </p>

            <div style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)"
            }}>
              <div style={{
                padding: "24px 24px",
                borderBottom: "1px solid #E5E7EB"
              }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1C1C1C",
                  margin: 0
                }}>
                  Recent Submissions
                </h3>
              </div>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Authorization Type</th>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Patient</th>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Submitted</th>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samplePatients.map((patient, idx) => (
                    <tr key={idx} style={{
                      borderBottom: idx < samplePatients.length - 1 ? "1px solid #E5E7EB" : "none",
                      transition: "background-color 0.2s",
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#F5F7FA" : "#F0F4F8";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
                    }}>
                      <td style={{ padding: "16px 24px", color: "#1C1C1C", fontWeight: 500 }}>
                        {patient.rxName}
                      </td>
                      <td style={{ padding: "16px 24px", color: "#1C1C1C", fontWeight: 500 }}>
                        {patient.name}
                      </td>
                      <td style={{ padding: "16px 24px", color: "#6F7276", fontSize: 13 }}>
                        {patient.timestamp}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <span style={{
                          display: "inline-block",
                          backgroundColor: patient.statusColor,
                          color: patient.statusTextColor,
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="provider-portal">
      {step !== "email" && step !== "coa-dashboard" && step !== "coa-rx" && step !== "coa-sent" && <BrandSidebar isBranded={isBranded} />}
      {step === "coa-dashboard" && (
        <CoaDashboard onSelect={(patientId) => {
          if (patientId !== "keanu-reeves") {
            setStep("coa-rx");
            return;
          }
          if (workflowData.enrollmentStatus === "none") {
            // No eRx yet — start one.
            setStep("coa-rx");
          } else if (workflowData.biStatus === "complete" && workflowData.paStatus === "none") {
            // "PA Required" — HCP starts PA submission straight from the
            // dashboard (no email/login hop, unlike WF1).
            setStep("pa-questions");
          }
          // Otherwise (PA submitted/approved, dispensing, delivered) —
          // nothing to do yet, stay on the dashboard.
        }} />
      )}
      {step === "coa-rx" && (
        <CoaRxForm onSend={() => {
          dispatch('ENROLL', { portal: 'provider' });
          setStep("coa-sent");
        }} />
      )}
      {step === "coa-sent" && (
        <CoaSentConfirmation onReturnToDashboard={() => setStep("coa-dashboard")} />
      )}
      {step === "email" && (
        <EmailStep onClickLink={() => setStep("login")} />
      )}
      {step === "login" && (
        <LoginStep onSubmit={() => setStep("pa-questions")} />
      )}
      {step === "pa-questions" && (
        <PaQuestionsStep
          onBack={() => setStep(isCoA ? "coa-dashboard" : "login")}
          onCancel={() => setStep(isCoA ? "coa-dashboard" : "login")}
          onNext={() => setStep("pa-submitted")}
        />
      )}
      {step === "pa-submitted" && <PaSubmittedStep onDone={() => {
        if (isCoA) {
          // Back to the dashboard — Keanu's row now shows "PA Submitted".
          setStep("coa-dashboard");
        }
      }} />}
      {step === "income-verify" && (
        <IncomeVerifyStep onBack={() => setStep("login")} onCancel={() => setStep("login")} onNext={() => setStep("income-submitted")} />
      )}
      {step === "income-submitted" && (
        <main className="provider-content provider-content--pa">
          <p className="pa-section-title">Income Verification — CoA Direct to Patient</p>
          <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
            <CheckedCircleIcon />
            <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1C1C1C" }}>
              Income Verified
            </h2>
            <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 32 }}>
              The patient's eligibility has been confirmed. The patient portal will be updated and the free drug shipment process can begin.
            </p>
            <button onClick={() => { dispatch('COMPLETE_PROVIDER_PA', { portal: 'provider' }); setStep("login"); }} className="pa-btn-secondary">Done</button>
          </div>
        </main>
      )}
    </div>
  );
}
