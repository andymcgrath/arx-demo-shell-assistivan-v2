/**
 * FileDropzone: drag-and-drop or click-to-choose upload for the iAssist screens. It validates type (JPG, PNG, PDF)
 * and size (19MB per batch), and keeps only the file names. Nothing uploads and nothing is stored: the demo has no
 * file service. The parent owns the list of names, so a Back and Next keeps it.
 */
import { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";

const MAX_BYTES = 19 * 1024 * 1024;
const OK_EXT = /\.(jpe?g|png|pdf)$/i;

export default function FileDropzone({
  files,
  onChange,
  label,
  sampleFiles,
}: {
  files: string[];
  onChange: (names: string[]) => void;
  label?: string;
  /** A presenter shortcut: clicking the upload icon attaches these names. It has no visible affordance. */
  sampleFiles?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    const badType = picked.find((f) => !OK_EXT.test(f.name));
    if (badType) return setError(`${badType.name} is not a JPG, PNG, or PDF.`);
    if (picked.reduce((sum, f) => sum + f.size, 0) > MAX_BYTES) return setError("Files must be 19MB or less.");
    setError("");
    onChange([...files, ...picked.map((f) => f.name).filter((n) => !files.includes(n))]);
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-[#1D1D1D]">{label}</p>}
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${over ? "border-[#007178] bg-[#EEF9F9]" : "border-[#D9D9D9]"}`}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => sampleFiles && onChange([...files, ...sampleFiles.filter((n) => !files.includes(n))])}
          className="mx-auto mb-2 block cursor-default focus:outline-none"
        >
          <Upload size={22} className="text-[#999]" />
        </button>
        <p className="text-sm text-[#6F7276]">
          Drag and drop file here, or{" "}
          <button type="button" onClick={() => inputRef.current?.click()} className="text-[#007178] font-semibold hover:underline">
            upload it here
          </button>
        </p>
        <p className="text-xs text-[#999] mt-1">Files must be 19MB or less and in JPG, PNG, or PDF format</p>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      {error && <p className="text-xs text-[#D02B20]">{error}</p>}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((name) => (
            <li key={name} className="flex items-center justify-between gap-2 rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]">
              <span className="flex items-center gap-2 min-w-0"><FileText size={15} className="text-[#007178] flex-shrink-0" /><span className="truncate">{name}</span></span>
              <button type="button" onClick={() => onChange(files.filter((n) => n !== name))} aria-label={`Remove ${name}`} className="text-[#999] hover:text-[#D02B20]"><X size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
