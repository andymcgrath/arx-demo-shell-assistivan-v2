import { useNavigate } from "@/lib/portalRouter";
import { usePatientCase } from "@/hooks/usePatientCase";
import { Check } from "lucide-react";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

export default function ConfirmDetails() {
  const navigate = useNavigate();
  const { data: patient } = usePatientCase();

  const nameParts = patient.patientName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const formatDate = (dob: string) => {
    const [month, day, year] = dob.split("/");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <main className="flex-grow">
        <EnrollmentShell title="Confirm your details" stepsFilled={1} stepsTotal={3}>
          <div className="space-y-4">
            <FloatingInput label="First name" defaultValue={firstName} />
            <FloatingInput label="Last name" defaultValue={lastName} />
            <FloatingInput label="Birth date" defaultValue={formatDate(patient.patientDob)} />
          </div>

          <div className="mt-8">
            <button
              onClick={() => navigate("/consent")}
              className="w-full bg-arx-primary text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-3 hover:bg-arx-primary-dark transition-colors"
            >
              <span>Confirm</span>
              <Check className="w-5 h-5" />
            </button>
          </div>
        </EnrollmentShell>
    </main>
  );
}

function FloatingInput({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div className="relative border-b border-arx-borders px-1 pt-5 pb-2">
      <span className="absolute top-2 left-1 text-xs text-arx-body-copy">{label}</span>
      <input
        type="text"
        defaultValue={defaultValue}
        className="w-full text-base bg-transparent outline-none text-arx-slate"
      />
    </div>
  );
}
