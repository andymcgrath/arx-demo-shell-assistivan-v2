import { ChevronRight, Check } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { daysFromToday } from "@/lib/relativeDate";
const ORDER_NUMBER = "428046573";
const SHIP_DATE = daysFromToday(-1);

const STEPS = [
  { n: 1, label: "Order received", sub: daysFromToday(-4), status: "done" },
  { n: 2, label: "Routing to pharmacy", sub: daysFromToday(-4), status: "done" },
  { n: 3, label: "Preparing medication", sub: daysFromToday(-2), status: "done" },
  { n: 4, label: "In transit", sub: SHIP_DATE, status: "active" },
  { n: 5, label: "Delivered", sub: null, status: "pending" },
] as const;

type StepStatus = "done" | "active" | "pending";

function StepIcon({ n, status }: { n: number; status: StepStatus }) {
  if (status === "done") return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-arx-primary-80">
      <Check className="w-5 h-5 text-white" strokeWidth={3} />
    </div>
  );
  if (status === "active") return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white">
      <span className="text-arx-primary font-bold">{n}</span>
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-base border-2 border-arx-borders text-arx-inactive bg-white">
      {n}
    </div>
  );
}

function StepRow({ step, onClick }: { step: typeof STEPS[number]; onClick?: () => void }) {
  const isActive = step.status === "active";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-colors ${isActive ? "bg-arx-primary" : "bg-white border border-arx-borders"}`}
    >
      <StepIcon n={step.n} status={step.status} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${isActive ? "text-white" : "text-arx-slate"}`}>{step.label}</p>
        {step.sub && <p className={`text-xs mt-0.5 ${isActive ? "text-white/75" : "text-arx-body-copy"}`}>{step.sub}</p>}
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white/70" : "text-arx-borders"}`} />
    </button>
  );
}

export default function OrderShipped() {
  const navigate = useNavigate();
  return (
    <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <p className="text-sm mb-0.5 text-arx-slate">Order <span className="font-bold">#{ORDER_NUMBER}</span></p>
            <p className="text-sm mb-4 text-arx-slate">Shipped on <span className="font-bold">{SHIP_DATE}</span></p>
            <p className="text-sm leading-relaxed text-arx-body-copy">
              Your medication is on its way. Track its progress below. We'll keep this tracker updated until your medication is delivered.
            </p>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-arx-primary inline-block" />
              <h3 className="font-semibold text-sm text-arx-primary">Assistivan delivery status</h3>
            </div>
            <div className="space-y-2">
              {STEPS.map(step => (
                <StepRow key={step.n} step={step} onClick={step.n === 4 ? () => navigate("/medication-delivered") : undefined} />
              ))}
            </div>
          </section>
        </div>
    </main>
  );
}
