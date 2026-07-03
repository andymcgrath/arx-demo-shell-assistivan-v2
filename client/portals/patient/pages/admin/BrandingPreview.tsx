import { Phone } from "lucide-react";

interface BrandingData {
  manufacturer: {
    name: string;
    tagline: string;
    logo: { colors: string; white: string; requiresFilter: boolean };
    support: { label: string; phone: string };
    copyright: string;
  };
  program: {
    name: string;
    drugDisplayName: string;
    description: string;
    logo: { colors: string; white: string };
    colors: { primary: string; primaryDark: string; primaryLight: string };
  };
  chatbotIcon: string;
}

interface Props {
  data: BrandingData;
}

export default function BrandingPreview({ data }: Props) {
  const { manufacturer: m, program: p } = data;

  const headerStyle = {
    background: p.colors.primary || "#007178",
  };

  const buttonStyle = {
    borderColor: "rgba(255,255,255,0.6)",
    color: "white",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[--arx-slate] uppercase tracking-wide">Live Preview</h3>

      {/* Header preview */}
      <div className="rounded-xl overflow-hidden border border-[--arx-borders] shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between" style={headerStyle}>
          {m.logo.white ? (
            <img src={m.logo.white} alt={m.name} className="h-8 object-contain" />
          ) : (
            <span className="text-white font-bold text-sm">{m.name}</span>
          )}
          <button
            className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs transition-colors"
            style={buttonStyle}
          >
            <Phone size={12} />
            {m.support.label}
          </button>
        </div>
      </div>

      {/* Home card preview */}
      <div className="rounded-xl overflow-hidden border border-[--arx-borders] shadow-sm bg-[--arx-background]">
        <div className="p-4 bg-white">
          <div className="flex items-center gap-3 mb-3">
            {p.logo.colors ? (
              <img src={p.logo.colors} alt={p.name} className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-24 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">Program Logo</div>
            )}
          </div>
          <h4 className="font-semibold text-[--arx-slate] text-sm">Welcome to {p.drugDisplayName || p.name}</h4>
          <p className="text-xs text-[--arx-body-copy] mt-0.5">{p.description}</p>
        </div>
        <div className="px-4 py-2 border-t border-[--arx-borders]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-medium" style={{ background: p.colors.primary || "#007178" }}>
            Get Started
          </div>
        </div>
      </div>

      {/* Footer preview */}
      <div className="rounded-xl overflow-hidden border border-[--arx-borders] shadow-sm">
        <div className="px-4 py-3 flex flex-col items-center gap-2" style={headerStyle}>
          {m.logo.white ? (
            <img src={m.logo.white} alt={m.name} className="h-6 object-contain" />
          ) : (
            <span className="text-white font-bold text-xs">{m.name}</span>
          )}
          <p className="text-white/70 text-xs text-center">{m.copyright}</p>
        </div>
      </div>

      {/* Color swatches */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-[--arx-slate]">Brand Colors</p>
        <div className="flex gap-2">
          <ColorSwatch label="Primary" color={p.colors.primary} />
          <ColorSwatch label="Dark" color={p.colors.primaryDark} />
          <ColorSwatch label="Light" color={p.colors.primaryLight} />
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md border border-[--arx-borders] shadow-sm" style={{ background: color || "#ccc" }} />
      <div>
        <p className="text-xs font-medium text-[--arx-slate] leading-none">{label}</p>
        <p className="text-xs text-[--arx-inactive]">{color || "—"}</p>
      </div>
    </div>
  );
}
