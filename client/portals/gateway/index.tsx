/**
 * Gateway view. In the web scenario the client owns the CRM and calls AssistRx's services through the Advanced
 * Gateway. This tab shows those two calls: benefit verification (ABV) and prior authorization (APA). It reads the
 * machine and calls nothing. Every value is representative. There is no live gateway.
 */
import { usePersonaState } from "@/engine/WorkflowProvider";
import { usePatientCase } from "@/hooks/usePatientCase";
import { PROGRAM } from "@/portals/patient/config/branding";
import { WEB_BI_MS, WEB_PA_MS } from "@/workflows/coassist/modules/web_handoff";

type CallState = "idle" | "pending" | "ok";

const pill: Record<CallState, string> = {
  idle: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-800",
  ok: "bg-emerald-100 text-emerald-800",
};
const pillText: Record<CallState, string> = { idle: "Not called", pending: "In flight", ok: "200 OK" };

export default function GatewayPortal() {
  const { workflowData: w } = usePersonaState("patient");
  const { data: patient } = usePatientCase();

  const abv: CallState = w.biStatus === "complete" ? "ok" : w.biStatus === "none" ? "idle" : "pending";
  const apa: CallState = w.paStatus === "approved" || w.paStatus === "denied" ? "ok" : w.paStatus === "submitted" ? "pending" : "idle";

  return (
    <div className="min-h-full bg-slate-50 p-6 text-slate-900">
      <h1 className="text-xl font-bold">Advanced Gateway</h1>
      <p className="mb-6 text-sm text-slate-600">
        The client's web page calls these services. AssistRx does not run a hub in this scenario. Representative data, no live calls.
      </p>

      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <CallCard
          title="ABV: automated benefit verification"
          route="POST /v1/benefit-verification"
          state={abv}
          latency={abv === "ok" ? `${(WEB_BI_MS / 1000).toFixed(1)} s` : "pending"}
          request={{ drug: PROGRAM.drugDisplayName, caseId: patient.caseId, prescriberNpi: w.prescriberNpi ?? patient.npi }}
          response={
            abv === "ok"
              ? {
                  pharmacyBenefit: w.pharmacyBenefitStatus,
                  medicalBenefit: w.medicalBenefitStatus,
                  priorAuthRequired: w.paRequired,
                  result: w.biResult,
                }
              : null
          }
        />
        <CallCard
          title="APA: automated prior authorization"
          route="POST /v1/prior-authorization"
          state={apa}
          latency={apa === "ok" ? `${(WEB_PA_MS / 1000).toFixed(1)} s` : "pending"}
          request={apa === "idle" ? null : { drug: PROGRAM.drugDisplayName, caseId: patient.caseId, prescriberNpi: w.prescriberNpi ?? patient.npi, trigger: "ABV result: prior authorization required" }}
          response={apa === "ok" ? { decision: w.paStatus, decidedAt: w.paApprovedAt ?? "n/a" } : null}
        />
      </div>
    </div>
  );
}

function CallCard({ title, route, state, latency, request, response }: {
  title: string;
  route: string;
  state: CallState;
  latency: string;
  request: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pill[state]}`}>{pillText[state]}</span>
      </div>
      <p className="mb-3 font-mono text-[11px] text-slate-500">{route} · {latency}</p>
      <Block label="Request" value={request} />
      <Block label="Response" value={response} />
    </section>
  );
}

function Block({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <pre className="overflow-x-auto rounded bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
        {value ? JSON.stringify(value, null, 2) : "No data yet"}
      </pre>
    </div>
  );
}
