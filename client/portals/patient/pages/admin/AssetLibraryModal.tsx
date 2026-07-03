import { useEffect, useRef, useState } from "react";
import { X, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  url: string;
  filename: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function AssetLibraryModal({ onSelect, onClose }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      const res = await fetch("/api/admin/assets");
      const data = await res.json();
      setAssets(data);
    } catch {
      // ignore
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) {
        setAssets(prev => [{ url: data.url, filename: data.filename }, ...prev]);
        setSelected(data.url);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function confirm() {
    if (selected) onSelect(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--arx-borders]">
          <h2 className="text-lg font-semibold text-[--arx-slate]">Asset Library</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-[--arx-borders] flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--arx-primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--arx-primary-dark))] transition-colors disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload Image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <span className="text-sm text-[--arx-body-copy]">{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[--arx-inactive]">
              <ImageIcon size={36} className="mb-2" />
              <p className="text-sm">No assets yet. Upload an image to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map(asset => (
                <button
                  key={asset.url}
                  onClick={() => setSelected(asset.url === selected ? null : asset.url)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all bg-gray-50",
                    selected === asset.url
                      ? "border-[hsl(var(--arx-primary))] ring-2 ring-[hsl(var(--arx-primary))/30]"
                      : "border-transparent hover:border-gray-300"
                  )}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="w-full h-full object-contain p-2"
                  />
                  {selected === asset.url && (
                    <div className="absolute inset-0 bg-[hsl(var(--arx-primary))]/10 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-[hsl(var(--arx-primary))] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[--arx-borders]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[--arx-body-copy] hover:text-[--arx-slate] transition-colors">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!selected}
            className="px-5 py-2 bg-[hsl(var(--arx-primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--arx-primary-dark))] transition-colors disabled:opacity-40"
          >
            Use Selected
          </button>
        </div>
      </div>
    </div>
  );
}
