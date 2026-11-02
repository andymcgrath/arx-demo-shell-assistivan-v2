import { SF_SECTION_BG } from "./SfPrimitives";
import { ChevronDown, ChevronRight } from "lucide-react";

// The CRM page's buttons, signature line, and collapsible section header.
export const FC_BLUE = "var(--crm-primary, #0176d3)";
export const SF_BORDER = "#dddbda";

// ─── Shared SF components ────────────────────────────────────────────────────

export function SfButton({
  children,
  split,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  split?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`flex items-stretch border border-[#dddbda] rounded ${className}`} style={{ borderRadius: 4 }}>
      <button
        onClick={onClick}
        className="px-3 py-1 text-[13px] text-[#3e3e3c] bg-white hover:bg-[#f3f3f3] transition-colors whitespace-nowrap"
        style={{ borderRadius: split ? "4px 0 0 4px" : 4 }}
      >
        {children}
      </button>
      {split && (
        <button
          className="px-2 py-1 bg-white hover:bg-[#f3f3f3] border-l border-[#dddbda] transition-colors"
          style={{ borderRadius: "0 4px 4px 0" }}
        >
          <ChevronDown size={12} className="text-[#3e3e3c]" />
        </button>
      )}
    </div>
  );
}

export function Signature({ name, width = 160 }: { name: string; width?: number }) {
  return (
    <span className="flex flex-col gap-0.5" style={{ display: "inline-flex", flexDirection: "column" }}>
      <span
        style={{
          fontFamily: "Brush Script MT, Segoe Script, cursive",
          fontSize: 22,
          color: "var(--crm-primary-dark, #1a3560)",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
          display: "block",
        }}
      >
        {name}
      </span>
      <span
        style={{
          display: "block",
          width,
          height: 1,
          background: "linear-gradient(to right, color-mix(in srgb, var(--crm-primary-dark, #1a3560) 67%, transparent), transparent)",
          marginTop: 2,
        }}
      />
    </span>
  );
}

export function SectionHeader({
  title,
  collapsed,
  onToggle,
  rightContent,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  rightContent?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 cursor-pointer select-none border-b border-[#dddbda]"
      style={{ background: SF_SECTION_BG, minHeight: 32 }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        {collapsed ? (
          <ChevronRight size={14} className="text-[#706e6b]" />
        ) : (
          <ChevronDown size={14} className="text-[#706e6b]" />
        )}
        <span className="text-[13px] font-semibold text-[#3e3e3c]">{title}</span>
      </div>
      {rightContent}
    </div>
  );
}
