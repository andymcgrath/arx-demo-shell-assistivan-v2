import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { hexToColorFilter } from "@/lib/brandFilter";
import { usePatientStore } from "@/store/patientStore";
import { CheckCircle, AlertCircle, Loader2, Save, Eye, EyeOff, FolderOpen, Trash2, FilePlus2, ArrowLeft } from "lucide-react";
import ManufacturerSection from "./admin/ManufacturerSection";
import ProgramSection from "./admin/ProgramSection";
import BrandingPreview from "./admin/BrandingPreview";
import LogoPicker from "./admin/LogoPicker";
import EducationVideoSection, { EducationVideoData } from "./admin/EducationVideoSection";

type Tab = "manufacturer" | "program";
type SaveState = "idle" | "saving" | "success" | "error";
type PromoteState = "idle" | "promoting" | "success" | "error";
interface BrandListItem {
  slug: string;
  presetName: string;
}

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
    dosageForm: string;
    logo: { colors: string; white: string; requiresFilter?: boolean };
    colors: { primary: string; primaryDark: string; primaryLight: string; primaryWash: string };
    educationVideo: EducationVideoData;
  };
  chatbotIcon: string;
  favicon: string;
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
    dosageForm: "",
    logo: { colors: "", white: "", requiresFilter: false },
    colors: { primary: "#007178", primaryDark: "#005a5f", primaryLight: "#338D93", primaryWash: "#B1D5D8" },
    educationVideo: { title: "", description: "", thumbnail: "", embedUrl: "" },
  },
  chatbotIcon: "",
  favicon: "",
};

/** Backfills fields that older saved presets / active-brand.json snapshots
 * may not have (e.g. `favicon` didn't exist before this admin update), so
 * the rest of this page can always assume a complete BrandingData shape. */
function normalize(raw: any): BrandingData {
  return {
    ...EMPTY,
    ...raw,
    manufacturer: { ...EMPTY.manufacturer, ...raw?.manufacturer },
    program: {
      ...EMPTY.program,
      ...raw?.program,
      colors: { ...EMPTY.program.colors, ...raw?.program?.colors },
      educationVideo: { ...EMPTY.program.educationVideo, ...raw?.program?.educationVideo },
    },
    chatbotIcon: raw?.chatbotIcon ?? "",
    favicon: raw?.favicon ?? "",
  };
}

export default function Admin() {
  const navigate = useNavigate();
  const [data, setData] = useState<BrandingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("manufacturer");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showPreview, setShowPreview] = useState(true);
  const [presetName, setPresetName] = useState("");
  const [brands, setBrands] = useState<BrandListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [promoteState, setPromoteState] = useState<PromoteState>("idle");
  const [promoteError, setPromoteError] = useState("");
  const [promoteTargets, setPromoteTargets] = useState<{ name: string; url: string }[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");

  // Independent of the main init() below — an empty/failed result just
  // means PROMOTE_TARGETS isn't set here, which falls back to the legacy
  // single-destination flow (no dropdown, handlePromote omits `target`).
  useEffect(() => {
    fetch("/.netlify/functions/admin-promote-targets")
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list)) setPromoteTargets(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [brandingData, brandListRaw] = await Promise.all([
          fetch("/.netlify/functions/admin-branding").then(r => r.json()),
          fetch("/.netlify/functions/admin-brands").then(r => r.json()),
        ]);
        if (cancelled) return;

        // A failed request (500, wrong route, etc.) resolves to an error
        // object like { error: "..." } rather than an array — guard so
        // that doesn't crash the whole page, and surface it in the
        // console since the UI has no other way to show a list-load
        // failure right now.
        const brandList: BrandListItem[] = Array.isArray(brandListRaw) ? brandListRaw : [];
        if (!Array.isArray(brandListRaw)) {
          console.error("[Admin] admin-brands did not return an array:", brandListRaw);
        }

        const normalized = normalize(brandingData);
        setData(normalized);
        setBrands(brandList);

        // "Preset name" should reflect the name of whichever saved brand is
        // actually active right now — not a guess derived from the program
        // name. Check each saved preset for an exact match against what's
        // currently live; if one matches, select it in the dropdown and show
        // its real preset name. If nothing matches (e.g. active-brand.json
        // has been hand-edited since it was last saved as a preset), leave
        // both blank — there genuinely is no "currently selected brand".
        for (const b of brandList as BrandListItem[]) {
          try {
            const preset = await fetch(`/.netlify/functions/admin-brand-detail/${b.slug}`).then(r => r.json());
            if (cancelled) return;
            if (JSON.stringify(normalize(preset.data)) === JSON.stringify(normalized)) {
              setSelectedSlug(b.slug);
              setPresetName(preset.presetName);
              break;
            }
          } catch {
            // Skip unreadable presets — not fatal to the match search.
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  function refreshBrandList() {
    fetch("/.netlify/functions/admin-brands")
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list)) setBrands(list);
        else console.error("[Admin] admin-brands did not return an array:", list);
      })
      .catch(() => {});
  }

  async function handleLoadBrand(slug: string) {
    setSelectedSlug(slug);
    if (!slug) return;
    try {
      const res = await fetch(`/.netlify/functions/admin-brand-detail/${slug}`);
      if (!res.ok) throw new Error("Failed to load brand");
      const preset = await res.json();
      setData(normalize(preset.data));
      setPresetName(preset.presetName);
      setSaveState("idle");
    } catch {
      setSaveState("error");
    }
  }

  /** Clears the form to a blank entry so a new brand can be filled in from
   * scratch, instead of always starting from whatever was last loaded. */
  function handleNewBrand() {
    if (!window.confirm("Start a new blank brand? Unsaved changes to the current one will be lost (the live site is unaffected until you hit Save).")) {
      return;
    }
    setData(EMPTY);
    setSelectedSlug("");
    setPresetName("");
    setSaveState("idle");
  }

  async function handleDeleteBrand() {
    if (!selectedSlug) return;
    const brand = brands.find(b => b.slug === selectedSlug);
    const label = brand?.presetName ?? selectedSlug;
    if (!window.confirm(`Delete the saved brand "${label}"? This can't be undone. The live site is unaffected either way.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/.netlify/functions/admin-brand-detail/${selectedSlug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      setSelectedSlug("");
      refreshBrandList();
    } catch {
      setSaveState("error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const res = await fetch("/.netlify/functions/admin-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, presetName }),
      });
      const result = await res.json();
      if (result.success) {
        // The medication name (and now dosage/form) are the pieces of
        // branding shared with every other portal (CRM, Provider, iAssist)
        // via usePatientStore — but that store is persisted to
        // sessionStorage, so without this the cached previous brand's
        // values would keep shadowing the new brand everywhere outside the
        // Patient Portal until someone hit "Reset Everything."
        const newDrugName = data.program.drugDisplayName || data.program.name;
        if (newDrugName) {
          usePatientStore.setState({ drugName: newDrugName });
        }
        usePatientStore.setState({ dosageForm: data.program.dosageForm ?? "" });
        setSaveState("success");
        refreshBrandList();
        setTimeout(() => setSaveState("idle"), 3000);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  /** Uploaded files live in Blobs now, addressed by /uploads/<filename> —
   * promoting a brand has to carry those bytes along too, or the brand
   * JSON would land on prod pointing at images prod has never seen. Only
   * /uploads/* references need this; external URLs (CDN-hosted logos,
   * like the bundled Assistivan default) are already reachable from
   * anywhere and don't need copying. */
  async function collectUploadAssets(d: BrandingData) {
    const urls = new Set<string>();
    const maybeAdd = (u?: string) => {
      if (u && u.startsWith("/uploads/")) urls.add(u);
    };
    maybeAdd(d.manufacturer.logo.colors);
    maybeAdd(d.manufacturer.logo.white);
    maybeAdd(d.program.logo.colors);
    maybeAdd(d.program.logo.white);
    maybeAdd(d.chatbotIcon);
    maybeAdd(d.favicon);
    maybeAdd(d.program.educationVideo.thumbnail);

    return Promise.all(
      Array.from(urls).map(async url => {
        const res = await fetch(url);
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        return { filename: url.replace("/uploads/", ""), dataUrl, contentType: blob.type };
      }),
    );
  }

  /** Pushes the currently-saved brand to production. Doesn't touch this
   * environment's data at all — it's a one-way copy, dev/local stays
   * exactly as it was. Requires either PROMOTE_TARGETS or PROD_SITE_URL +
   * PROMOTE_SECRET to be set here (see /api/admin/promote); if they're
   * missing, the button just reports that clearly instead of pretending to
   * succeed. When PROMOTE_TARGETS is set, a destination must be chosen
   * from the dropdown first. */
  async function handlePromote() {
    if (promoteTargets.length > 0 && !selectedTarget) {
      setPromoteError("Choose a destination first.");
      setPromoteState("error");
      return;
    }
    setPromoteState("promoting");
    setPromoteError("");
    try {
      const assets = await collectUploadAssets(data);
      const res = await fetch("/.netlify/functions/admin-promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: data,
          presetName: presetName || undefined,
          assets,
          target: selectedTarget || undefined,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setPromoteState("success");
        setTimeout(() => setPromoteState("idle"), 3000);
      } else {
        setPromoteError(result.error ?? "Failed to promote");
        setPromoteState("error");
      }
    } catch {
      setPromoteError("Failed to promote");
      setPromoteState("error");
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              // /admin is a real top-level route (see App.tsx) reachable
              // either from DemoShell's "Branding" button or a direct/
              // bookmarked URL — history.length > 1 tells those apart.
              // Coming from DemoShell, back() returns to whichever portal
              // was actually showing; landing here with no prior entry
              // (a fresh tab/bookmark) falls back to the demo's default
              // route instead of leaving the user stuck or exiting the app.
              if (window.history.length > 1) navigate(-1);
              else navigate("/hub");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy] flex-shrink-0"
            aria-label="Back to demo"
          >
            <ArrowLeft size={15} />
            Back to Demo
          </button>
          <div>
            <h1 className="text-xl font-bold text-[--arx-slate]">Branding Admin</h1>
            <p className="text-sm text-[--arx-body-copy]">Manage logos, colors, and brand text</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy]"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          {promoteTargets.length > 0 && (
            <select
              value={selectedTarget}
              onChange={e => setSelectedTarget(e.target.value)}
              className="px-3 py-2 text-sm border border-[--arx-borders] rounded-lg text-[--arx-body-copy] bg-white"
              aria-label="Promote destination"
            >
              <option value="">Choose destination…</option>
              {promoteTargets.map(t => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <PromoteButton
            state={promoteState}
            onClick={handlePromote}
            disabled={promoteTargets.length > 0 && !selectedTarget}
          />
          <SaveButton state={saveState} onClick={handleSave} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Left: form */}
        <div className="flex-1 min-w-0">
          {/* Brand presets */}
          <div className="bg-white rounded-xl border border-[--arx-borders] p-4 shadow-sm mb-6 flex items-center gap-4">
            <FolderOpen size={16} className="text-[--arx-inactive] flex-shrink-0" />
            <div className="flex-1 flex items-center gap-3">
              <label className="text-sm text-[--arx-body-copy] whitespace-nowrap">Load brand</label>
              <select
                value={selectedSlug}
                onChange={e => handleLoadBrand(e.target.value)}
                className="text-sm border border-[--arx-borders] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))] bg-white"
              >
                <option value="">Select a saved brand…</option>
                {brands.map(b => (
                  <option key={b.slug} value={b.slug}>{b.presetName}</option>
                ))}
              </select>
              <button
                onClick={handleDeleteBrand}
                disabled={!selectedSlug || deleting}
                title="Delete saved brand"
                aria-label="Delete saved brand"
                className="flex items-center justify-center w-8 h-8 flex-shrink-0 border border-[--arx-borders] rounded-lg text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
              <button
                onClick={handleNewBrand}
                title="Start a new blank brand"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy] whitespace-nowrap flex-shrink-0"
              >
                <FilePlus2 size={14} />
                New Brand
              </button>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <label className="text-sm text-[--arx-body-copy] whitespace-nowrap">Preset name</label>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder={selectedSlug ? "e.g. Boehringer" : "No brand selected — type a name to save as new"}
                className="flex-1 text-sm border border-[--arx-borders] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))] bg-white"
              />
            </div>
          </div>

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
                  onChange={p => setData(d => ({ ...d, program: { ...p, educationVideo: d.program.educationVideo } }))}
                />
              </>
            )}
          </div>

          {/* Favicon */}
          <div className="bg-white rounded-xl border border-[--arx-borders] p-6 shadow-sm mt-4">
            <h2 className="text-base font-semibold text-[--arx-slate] mb-4">Favicon</h2>
            <LogoPicker
              label="Favicon"
              hint="Small icon shown in the browser tab. Square images work best (e.g. 32×32 or 64×64)."
              value={data.favicon}
              onChange={url => setData(d => ({ ...d, favicon: url }))}
            />
          </div>

          {/* Chatbot icon */}
          <div className="bg-white rounded-xl border border-[--arx-borders] p-6 shadow-sm mt-4">
            <h2 className="text-base font-semibold text-[--arx-slate] mb-4">Chatbot Icon</h2>
            <LogoPicker
              label="Chatbot Icon"
              hint="Icon for the floating chat assistant. Automatically colored to match the primary brand color wherever it's shown."
              value={data.chatbotIcon}
              onChange={url => setData(d => ({ ...d, chatbotIcon: url }))}
            />
            {data.chatbotIcon && (
              <div className="mt-3 flex items-center gap-6">
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

          {/* Education video */}
          <div className="bg-white rounded-xl border border-[--arx-borders] p-6 shadow-sm mt-4">
            <h2 className="text-base font-semibold text-[--arx-slate] mb-1">Education Video</h2>
            <p className="text-sm text-[--arx-body-copy] mb-4">
              Optional resource card on the patient portal's Delivered page. Leave the Video Embed URL blank to hide it.
            </p>
            <EducationVideoSection
              data={data.program.educationVideo}
              onChange={v => setData(d => ({ ...d, program: { ...d.program, educationVideo: v } }))}
            />
          </div>

          {saveState === "error" && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} />
              Failed to save. Check server logs.
            </div>
          )}

          {promoteState === "error" && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} />
              {promoteError || "Failed to promote to production."}
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

function PromoteButton({
  state,
  onClick,
  disabled,
}: {
  state: PromoteState;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (state === "promoting") {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 border border-[--arx-borders] text-[--arx-body-copy] text-sm rounded-lg opacity-75">
        <Loader2 size={15} className="animate-spin" />
        Promoting…
      </button>
    );
  }
  if (state === "success") {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 text-sm rounded-lg">
        <CheckCircle size={15} />
        Promoted!
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? "Choose a destination first"
          : "Push this brand to production — doesn't change what's live here in dev"
      }
      className={`flex items-center gap-2 px-4 py-2 border border-[--arx-borders] text-sm rounded-lg transition-colors text-[--arx-body-copy] ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
      }`}
    >
      Promote to Prod
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
