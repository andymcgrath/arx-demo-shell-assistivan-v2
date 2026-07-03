import { useRef, useState } from "react";
import { Upload, Link, Library, X } from "lucide-react";
import AssetLibraryModal from "./AssetLibraryModal";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  bgClass?: string;
}

export default function LogoPicker({ label, value, onChange, hint, bgClass = "bg-white" }: Props) {
  const [mode, setMode] = useState<"url" | "upload" | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function applyUrl() {
    if (urlInput.trim()) onChange(urlInput.trim());
    setMode(null);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[--arx-slate]">{label}</label>
      {hint && <p className="text-xs text-[--arx-inactive]">{hint}</p>}

      {/* Preview */}
      <div className={`${bgClass} border border-[--arx-borders] rounded-lg p-4 flex items-center justify-center min-h-[80px]`}>
        {value ? (
          <img src={value} alt={label} className="max-h-12 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-[--arx-inactive]">No logo set</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy] disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button
          onClick={() => setShowLibrary(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy]"
        >
          <Library size={12} />
          Asset Library
        </button>
        <button
          onClick={() => { setUrlInput(value); setMode("url"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors text-[--arx-body-copy]"
        >
          <Link size={12} />
          Paste URL
        </button>
        {value && (
          <button
            onClick={() => onChange("")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {mode === "url" && (
        <div className="flex gap-2 mt-1">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyUrl()}
            placeholder="https://..."
            className="flex-1 text-sm border border-[--arx-borders] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))]"
          />
          <button onClick={applyUrl} className="px-4 py-2 text-sm bg-[hsl(var(--arx-primary))] text-white rounded-lg hover:bg-[hsl(var(--arx-primary-dark))] transition-colors">
            Apply
          </button>
          <button onClick={() => setMode(null)} className="px-3 py-2 text-sm border border-[--arx-borders] rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {showLibrary && (
        <AssetLibraryModal
          onSelect={url => { onChange(url); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
