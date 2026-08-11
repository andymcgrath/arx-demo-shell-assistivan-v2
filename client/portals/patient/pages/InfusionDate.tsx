import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { CalendarDays, Check } from "lucide-react";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

// iAssist_PAP (WF5) only — this is WF5's replacement for DeliveryDate.tsx.
// WF5 dispenses "Keanu to facility" rather than shipping through a
// pharmacy (see crm/pages/Index.tsx's SITES_OF_CARE/officeDispenseOptions),
// so there's no address/payment beat here — just a date for the infusion
// appointment itself. Selecting one dispatches PATIENT_SELECTS_INFUSION_DATE
// (workflows/iAssistPap.ts), which MPX "captures" (cosmetic) and reflects
// into iAssist's dashboard as "Infusion Scheduled" (see Dashboard.tsx).

function isUnavailable(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 1 || day === 6) return true;
  const m = d.getMonth(), dt = d.getDate();
  return [[0,1],[6,4],[11,25],[11,24]].some(([hm,hd]) => m === hm && dt === hd);
}

function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  for (let i = 1; i <= 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!isUnavailable(d)) dates.push(d);
  }
  return dates;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function InfusionDate() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const available = getAvailableDates();
  const [selected, setSelected] = useState<Date | null>(available[0] ?? null);
  const [open, setOpen] = useState(false);

  function handleSave() {
    if (!selected) return;
    dispatch("PATIENT_SELECTS_INFUSION_DATE", { portal: "patient", date: selected.toISOString() });
    navigate("/appointment-confirmation");
  }

  return (
    <main className="flex-grow">
        <EnrollmentShell
          icon={<CalendarDays className="w-7 h-7" />}
          title="Please select an infusion date from the available dates below"
          stepsFilled={2}
          stepsTotal={2}
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-arx-body-copy">
              Your infusion appointment must be scheduled within the next 28 days. Appointments are unavailable on weekends, Mondays and certain holidays.
            </p>

            <div className="relative">
              <label className="block text-[10px] font-semibold mb-1.5 px-1 text-arx-body-copy">
                Requested Infusion Date
              </label>
              <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium text-left bg-white text-arx-slate transition-colors"
                style={{ border: `1.5px solid ${open ? "#007178" : "#E0E0E0"}` }}
              >
                <span>{selected ? formatDate(selected) : "Select a date"}</span>
                <CalendarDays className="w-5 h-5 flex-shrink-0 text-arx-primary" />
              </button>

              {open && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg overflow-auto z-20 border border-arx-borders" style={{ maxHeight: "220px" }}>
                  {available.map((d, i) => {
                    const isSelected = selected?.toDateString() === d.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelected(d); setOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${isSelected ? "bg-arx-sky text-arx-primary font-semibold" : "text-arx-slate hover:bg-arx-background"} ${i < available.length - 1 ? "border-b border-arx-borders" : ""}`}
                      >
                        {formatDate(d)}
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={!selected}
              className={`w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors ${selected ? "bg-arx-primary text-white hover:bg-arx-primary-dark" : "bg-arx-borders text-arx-inactive cursor-not-allowed"}`}
            >
              <span>Save</span>
              <Check className="w-5 h-5" />
            </button>
          </div>
        </EnrollmentShell>
    </main>
  );
}
