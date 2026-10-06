import LogoPicker from "./LogoPicker";
import ColorPalettePicker from "./ColorPalettePicker";

interface ProgramData {
  name: string;
  drugDisplayName: string;
  description: string;
  dosageForm: string;
  logo: { colors: string; white: string; requiresFilter?: boolean };
  colors: { primary: string; primaryDark: string; primaryLight: string; primaryWash: string };
}

interface Props {
  data: ProgramData;
  onChange: (data: ProgramData) => void;
}

export default function ProgramSection({ data, onChange }: Props) {
  function set<K extends keyof ProgramData>(key: K, value: ProgramData[K]) {
    onChange({ ...data, [key]: value });
  }

  function handleColorChange(key: keyof ProgramData["colors"], value: string) {
    set("colors", { ...data.colors, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Program Name"
          hint="Internal name for this program — used to label saved brand presets in the admin screen."
          value={data.name}
          onChange={v => set("name", v)}
        />
        <Field
          label="Drug Display Name"
          hint="Patient-facing drug name shown throughout the portal. Falls back to Program Name if left blank."
          value={data.drugDisplayName}
          onChange={v => set("drugDisplayName", v)}
        />
      </div>
      <Field
        label="Description"
        hint="Short medication detail shown near the drug name — e.g. dosage and supply period."
        value={data.description}
        onChange={v => set("description", v)}
        placeholder="e.g. 0.8 mg · 30-day supply"
      />
      <Field
        label="Dosage / Form"
        hint="Strength, form, and route — shown wherever this medication's dosage appears (CRM, Provider, iAssist), not just the Patient Portal."
        value={data.dosageForm}
        onChange={v => set("dosageForm", v)}
        placeholder="e.g. 150 mg/6 mL Injection for IV"
      />

      <div className="grid grid-cols-2 gap-4">
        <LogoPicker
          label="Logo (Colors version)"
          hint="Brand-colored, transparent bg — use on white backgrounds"
          value={data.logo.colors}
          onChange={url => set("logo", { ...data.logo, colors: url })}
        />
        <LogoPicker
          label="Logo (White version)"
          hint="All-white, transparent bg — use on teal/dark backgrounds"
          value={data.logo.white}
          onChange={url => set("logo", { ...data.logo, white: url })}
          bgClass="bg-[hsl(var(--arx-primary))]"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="programRequiresFilter"
          type="checkbox"
          checked={!!data.logo.requiresFilter}
          onChange={e => set("logo", { ...data.logo, requiresFilter: e.target.checked })}
          className="rounded border-[--arx-borders] text-[hsl(var(--arx-primary))]"
        />
        <label htmlFor="programRequiresFilter" className="text-sm text-[--arx-body-copy]">
          Apply brand color filter to colors logo (auto-tints the logo to match your primary color)
        </label>
      </div>

      {/* Color pickers */}
      <div>
        <p className="text-sm font-medium text-[--arx-slate] mb-3">Brand Colors</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorField
            label="Primary"
            hint="Main brand color — buttons, links, active icons."
            value={data.colors.primary}
            onChange={v => handleColorChange("primary", v)}
          />
          <ColorField
            label="Primary Dark"
            hint="~15% darker — hover/pressed state for primary buttons."
            value={data.colors.primaryDark}
            onChange={v => handleColorChange("primaryDark", v)}
          />
          <ColorField
            label="Primary Light"
            hint="Fill behind checkmark icons in trackers (Order Tracker, Medication Delivered). The icon is white, so avoid white or very pale values — the checkmark disappears."
            value={data.colors.primaryLight}
            onChange={v => handleColorChange("primaryLight", v)}
          />
          <ColorField
            label="Primary Wash"
            hint="Very light tint for hover backgrounds and soft section fills. Pale/near-white is fine — nothing white sits on top of it."
            value={data.colors.primaryWash}
            onChange={v => handleColorChange("primaryWash", v)}
          />
        </div>
        <ColorPalettePicker
          onPickColor={(target, hex) => handleColorChange(target, hex)}
        />
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--arx-slate]">{label}</label>
      {hint && <p className="text-xs text-[--arx-inactive]">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-[--arx-borders] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))] bg-white"
      />
    </div>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--arx-slate]">{label}</label>
      {/* Fixed min-height so all four color inputs in the row below line up
          regardless of which hints happen to wrap to more lines (e.g.
          "Primary Light"'s hint is longer than the others, since it now
          explains exactly which app elements it drives, after a brand's
          primaryLight being set to white made every "done" checkmark badge
          in the patient portal render invisible) — see feedback: "fix the
          Brand color alignment". Bumped from 2rem to fit that longer hint
          at this grid's column width without wrapping past the box. */}
      <p className="text-xs text-[--arx-inactive] min-h-[3.5rem]">{hint}</p>
      <div className="flex items-center gap-2 border border-[--arx-borders] rounded-lg px-3 py-2 bg-white">
        <input
          type="color"
          value={value || "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 text-sm focus:outline-none font-mono"
        />
      </div>
    </div>
  );
}
