import LogoPicker from "./LogoPicker";
import ColorPalettePicker from "./ColorPalettePicker";

interface ProgramData {
  name: string;
  drugDisplayName: string;
  description: string;
  logo: { colors: string; white: string; requiresFilter?: boolean };
  colors: { primary: string; primaryDark: string; primaryLight: string };
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
        <Field label="Program Name" value={data.name} onChange={v => set("name", v)} />
        <Field label="Drug Display Name" value={data.drugDisplayName} onChange={v => set("drugDisplayName", v)} />
      </div>
      <Field label="Description" value={data.description} onChange={v => set("description", v)} placeholder="e.g. 0.8 mg · 30-day supply" />

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
        <div className="grid grid-cols-3 gap-4">
          <ColorField
            label="Primary"
            hint="Main brand color"
            value={data.colors.primary}
            onChange={v => handleColorChange("primary", v)}
          />
          <ColorField
            label="Primary Dark"
            hint="~15% darker, for hover states"
            value={data.colors.primaryDark}
            onChange={v => handleColorChange("primaryDark", v)}
          />
          <ColorField
            label="Primary Light"
            hint="~50% lighter tint"
            value={data.colors.primaryLight}
            onChange={v => handleColorChange("primaryLight", v)}
          />
        </div>
        <ColorPalettePicker
          onPickColor={(target, hex) => handleColorChange(target, hex)}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--arx-slate]">{label}</label>
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
      <p className="text-xs text-[--arx-inactive]">{hint}</p>
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
