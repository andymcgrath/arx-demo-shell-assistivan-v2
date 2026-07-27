/**
 * Typed e-signature field — WF5's (PrES_PAP) replacement for the SMS/OTP
 * identity checks WF1/WF2/WF4 use. Ported from arx-pes-prototype-omniplan's
 * SignatureInput, restyled with this shell's arx-* design tokens.
 */
export default function SignatureField({
  label,
  value,
  onChange,
  placeholder = "Type your full name",
  disclaimer,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disclaimer?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-arx-slate">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-arx-borders rounded-lg px-4 py-3 text-sm text-arx-slate placeholder:text-arx-inactive focus:outline-none focus:ring-2 focus:ring-arx-primary/30 focus:border-arx-primary transition-colors"
      />
      <div className="w-full border border-dashed border-arx-borders rounded-lg bg-arx-neutral-100 min-h-[52px] flex items-center px-4 py-2 overflow-hidden">
        {value ? (
          <span className="italic text-base text-arx-slate" style={{ fontFamily: "cursive" }}>{value}</span>
        ) : (
          <span className="text-xs italic text-arx-inactive">Signature preview</span>
        )}
      </div>
      {disclaimer && (
        <p className="text-xs text-arx-inactive leading-relaxed">{disclaimer}</p>
      )}
    </div>
  );
}
