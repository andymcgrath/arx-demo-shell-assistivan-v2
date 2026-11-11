/** Small form pieces for the HCP enrollment page. Plain controls on brand tokens. */
import type { ReactNode } from "react";

export const inputCls = "w-full rounded-md border border-arx-borders bg-white px-3 py-2 text-sm text-arx-neutral-800 outline-none focus:border-arx-primary";
export const primaryBtn = "inline-flex items-center justify-center gap-2 rounded-full bg-arx-action px-6 py-2.5 text-sm font-semibold text-arx-on-action disabled:opacity-40";
export const ghostBtn = "inline-flex items-center justify-center rounded-full border border-arx-borders bg-white px-6 py-2.5 text-sm font-semibold text-arx-neutral-800";

export function Field({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold text-arx-neutral-800">
        {label}
        {required && <span className="text-arx-errors">*</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ label, value, onChange, required, className, placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string; placeholder?: string }) {
  return (
    <Field label={label} required={required} className={className}>
      <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function Check({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-xs text-arx-neutral-800">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Radio({ name, label, checked, onChange }: { name: string; label: ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-arx-neutral-800">
      <input type="radio" name={name} className="mt-1" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-3 text-base font-bold text-arx-primary">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-arx-primary text-xs text-arx-on-primary">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
