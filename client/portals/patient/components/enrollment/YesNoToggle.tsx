/**
 * Small Yes/No selector shared by WF5's (PrES_PAP) new consent/attestation
 * screens — ported from arx-pes-prototype-omniplan's RadioOption pattern,
 * but styled with this shell's existing arx-* design tokens instead of the
 * prototype's own pax-* branding, per the "match demo shell's design
 * system" decision for WF5.
 */
export default function YesNoToggle({
  value,
  onChange,
  name,
}: {
  value: "Yes" | "No" | null;
  onChange: (value: "Yes" | "No") => void;
  name: string;
}) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label={name}>
      {(["Yes", "No"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className="flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors"
          style={{
            borderColor: value === opt ? "hsl(var(--arx-primary))" : "#e5e5e5",
            backgroundColor: value === opt ? "hsl(var(--arx-sky) / 0.25)" : "white",
            color: value === opt ? "hsl(var(--arx-primary))" : "#414042",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
