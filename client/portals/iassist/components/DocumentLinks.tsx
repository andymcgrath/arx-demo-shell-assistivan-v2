/**
 * DocumentLinks: file names that open a sample PDF in a viewer, and a download-all helper. The files are
 * representative samples in public/. Nothing uploads.
 */
import { useState } from "react";
import { X } from "lucide-react";
import type { SubmissionDocument } from "../data/submissionStatus";

/** Starts a download for each file, a moment apart so the browser accepts all of them. */
export function downloadAll(docs: SubmissionDocument[]) {
  docs.forEach((d, i) =>
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = d.file;
      a.download = d.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 300),
  );
}

export default function DocumentLinks({ docs, empty = "No upload", onClick }: { docs: SubmissionDocument[]; empty?: string; onClick?: (e: React.MouseEvent) => void }) {
  const [open, setOpen] = useState<SubmissionDocument | null>(null);
  if (!docs.length) return <>{empty}</>;

  return (
    <>
      {docs.map((d, i) => (
        <span key={d.name}>
          <button
            type="button"
            onClick={(e) => { onClick?.(e); e.stopPropagation(); setOpen(d); }}
            className="text-[#007178] hover:underline"
          >
            {d.name}
          </button>
          {i < docs.length - 1 && ", "}
        </span>
      ))}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => { e.stopPropagation(); setOpen(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col" style={{ height: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E8] bg-[#F8F8F8]">
              <span className="text-sm font-semibold text-[#1D1D1D]">{open.name}</span>
              <div className="flex items-center gap-3">
                <a href={open.file} download={open.name} className="text-xs font-semibold text-[#007178] border border-[#007178] rounded-full px-3 py-1 hover:bg-[#EEF9F9]">Download</a>
                <button onClick={() => setOpen(null)} aria-label="Close" className="text-[#6F7276] hover:text-[#1D1D1D]"><X size={18} /></button>
              </div>
            </div>
            <object data={open.file} type="application/pdf" className="flex-1 w-full">
              <p className="p-6 text-sm text-[#6F7276]">The preview is not available. Use Download to open the file.</p>
            </object>
          </div>
        </div>
      )}
    </>
  );
}
