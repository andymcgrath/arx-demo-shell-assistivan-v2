/** Salesforce-style primitives the CRM pages share. */
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";

export const SF_BLUE = "#0070d2";
export const SF_SECTION_BG = "#f3f3f3";

export function SfLink({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <span className={`cursor-pointer hover:underline ${className}`} style={{ color: SF_BLUE }} onClick={onClick}>
      {children}
    </span>
  );
}

export function FieldRow({ label, value, isLink, onEdit }: { label: string; value?: React.ReactNode; isLink?: boolean; onEdit?: () => void }) {
  return (
    <div className="group relative flex flex-col px-3 py-2 border-b border-[#dddbda] pr-6 min-h-[44px]">
      <span className="text-[11px] text-[#706e6b] mb-0.5 uppercase tracking-wide font-medium leading-tight">{label}</span>
      {isLink ? (
        <SfLink className="text-[13px]">{value}</SfLink>
      ) : (
        <span className="text-[13px] text-[#3e3e3c]">{value || "\u00a0"}</span>
      )}
      {onEdit && (
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          onClick={onEdit}
        >
          <Pencil size={12} className="text-[#706e6b]" />
        </button>
      )}
    </div>
  );
}

/** A benefit section whose header chevron collapses and expands the body. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="border border-[#dddbda] rounded">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${open ? "border-b border-[#dddbda]" : ""}`}
        style={{ background: SF_SECTION_BG }}
      >
        <Chevron size={14} className="text-[#706e6b]" />
        <span className="text-[12px] font-semibold text-[#3e3e3c]">{title}</span>
      </button>
      {open && children}
    </div>
  );
}
