import { useEffect, useState } from "react";
import { hexToColorFilter } from "@/lib/brandFilter";
import { CheckCircle, AlertCircle, Loader2, Save, Eye, EyeOff } from "lucide-react";
import ManufacturerSection from "./admin/ManufacturerSection";
import ProgramSection from "./admin/ProgramSection";
import BrandingPreview from "./admin/BrandingPreview";

type Tab = "manufacturer" | "program";
type SaveState = "idle" | "saving" | "success" | "error";

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
    logo: { colors: string; white: string; requiresFilter?: boolean };
    colors: { primary: string; primaryDark: string; primaryLight: string };
  };
  chatbotIcon: string;
}

const EMPTY: BrandingData = {
  manufacturer: {
    name: "",
    tagline: "",
    logo: { colors: "", white: "", requiresFilter: false },
    support: { label: "", phone: "" },
    copyright: "",
  },
  program: {
    name: "",
    drugDisplayName: "",
    description: "",
    logo: { colors: "", white: "", requiresFilter: false },
    colors: { primary: "#007178", primaryDark: "#005a5f", primaryLight: "#338D93" },
  },
  chatbotIcon: "",
};

export default function Admin() {
  const [data, setData] = useState<BrandingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("manufacturer");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    fetch("/api/admin/branding")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSaveState("success");
        setTimeout(() => setSaveState("idle"), 3000);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[--arx-background] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[hsl(var(--arx-primary))]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--arx-background]">
      {/* Top bar */}
      <div className="bg-white border-b border-[--arx-borders] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[--arx-slate]">Branding Admin</h1>
          <p className="text-sm text-[--arx-body-copy]">Manage logos, colors, and brand text</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy]"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <SaveButton state={saveState} onClick={handleSave} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Left: form */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white rounded-xl border border-[--arx-borders] mb-6 w-fit">
            <TabBtn active={tab === "manufacturer"} onClick={() => setTab("manufacturer")}>
              Manufacturer
            </TabBtn>
            <TabBtn active={tab === "program"} onClick={() => setTab("program")}>
              Program
            </TabBtn>
          </div>

          <div className="bg-white rounded-xl border border-[--arx-borders] p-6 shadow-sm">
            {tab === "manufacturer" ? (
              <>
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[--arx-slate]">Manufacturer Branding</h2>
                  <p className="text-sm text-[--arx-body-copy] mt-0.5">Shown in the header and footer across all pages</p>
                </div>
                <ManufacturerSection
                  data={data.manufacturer}
                  onChange={m => setData(d => ({ ...d, manufacturer: m }))}
                />
              </>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-[--arx-slate]">Program Branding</h2>
                  <p className="text-sm text-[--arx-body-copy] mt-0.5">Drug name, logo, colors — used throughout workflow pages</p>
                </div>
                <ProgramSection
                  data={data.program}
                  onChange={p => setData(d => ({ ...d, program: p }))}
                />
              </>
            )}
          </div>

          {/* Chatbot icon */}
          <div className="bg-white rounded-xl border border-[--arx-borders] p-6 shadow-sm mt-4">
            <h2 className="text-base font-semibold text-[--arx-slate] mb-1">Chatbot Icon</h2>
            <p className="text-sm text-[--arx-body-copy] mb-4">URL for the floating chat assistant icon. Automatically colored to match the primary brand color.</p>
            <input
              type="url"
              value={data.chatbotIcon}
              onChange={e => setData(d => ({ ...d, chatbotIcon: e.target.value }))}
              placeholder="https://..."
              className="w-full text-sm border border-[--arx-borders] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))] bg-white"
            />
            {data.chatbotIcon && (
              <div className="mt-3 flex items-center gap-6">
                <div className="text-center space-y-1">
                  <p className="text-xs text-[--arx-inactive]">Original</p>
                  <img src={data.chatbotIcon} alt="Chatbot icon" className="h-10 object-contain" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs text-[--arx-inactive]">With brand color</p>
                  <img
                    src={data.chatbotIcon}
                    alt="Chatbot icon (brand color)"
                    className="h-10 object-contain"
                    style={{ filter: hexToColorFilter(data.program.colors.primary) }}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs text-[--arx-inactive]">On dark bg</p>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: data.program.colors.primary }}>
                    <img src={data.chatbotIcon} alt="" className="w-6 h-6 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {saveState === "error" && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} />
              Failed to save. Check server logs.
            </div>
          )}
        </div>

        {/* Right: preview */}
        {showPreview && (
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl border border-[--arx-borders] p-5 shadow-sm">
                <BrandingPreview data={data} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
        active
          ? "bg-[hsl(var(--arx-primary))] text-white shadow-sm"
          : "text-[--arx-body-copy] hover:text-[--arx-slate]"
      }`}
    >
      {children}
    </button>
  );
}

function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
  if (state === "saving") {
    return (
      <button disabled className="flex items-center gap-2 px-5 py-2 bg-[hsl(var(--arx-primary))] text-white text-sm rounded-lg opacity-75">
        <Loader2 size={15} className="animate-spin" />
        Saving…
      </button>
    );
  }
  if (state === "success") {
    return (
      <button disabled className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm rounded-lg">
        <CheckCircle size={15} />
        Saved!
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2 bg-[hsl(var(--arx-primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--arx-primary-dark))] transition-colors"
    >
      <Save size={15} />
      Save Changes
    </button>
  );
}
