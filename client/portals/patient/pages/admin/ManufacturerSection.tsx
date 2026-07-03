import LogoPicker from "./LogoPicker";

interface ManufacturerData {
  name: string;
  tagline: string;
  logo: { colors: string; white: string; requiresFilter: boolean };
  support: { label: string; phone: string };
  copyright: string;
}

interface Props {
  data: ManufacturerData;
  onChange: (data: ManufacturerData) => void;
}

export default function ManufacturerSection({ data, onChange }: Props) {
  function set<K extends keyof ManufacturerData>(key: K, value: ManufacturerData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Platform Name" value={data.name} onChange={v => set("name", v)} />
        <Field label="Tagline" value={data.tagline} onChange={v => set("tagline", v)} />
      </div>

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
          id="requiresFilter"
          type="checkbox"
          checked={data.logo.requiresFilter}
          onChange={e => set("logo", { ...data.logo, requiresFilter: e.target.checked })}
          className="rounded border-[--arx-borders] text-[hsl(var(--arx-primary))]"
        />
        <label htmlFor="requiresFilter" className="text-sm text-[--arx-body-copy]">
          Apply CSS filter to colors logo (temporary fix while proper asset is pending)
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Support Button Label" value={data.support.label} onChange={v => set("support", { ...data.support, label: v })} />
        <Field label="Support Phone" value={data.support.phone} onChange={v => set("support", { ...data.support, phone: v })} />
      </div>

      <Field label="Copyright" value={data.copyright} onChange={v => set("copyright", v)} />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--arx-slate]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-[--arx-borders] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))] bg-white"
      />
    </div>
  );
}
