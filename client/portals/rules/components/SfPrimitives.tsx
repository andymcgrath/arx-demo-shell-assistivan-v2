/**
 * SfPrimitives — small Salesforce-Lightning visual primitives for the Rules
 * portal.
 *
 * client/portals/crm/pages/Index.tsx already implements this same visual
 * language (SF_BLUE/SF_BORDER/SF_SECTION_BG, SfButton, SfLink, FieldRow,
 * SectionHeader) — these are deliberately small, self-contained
 * re-implementations of that same look rather than a cross-portal import,
 * per this repo's convention that portals stay self-contained (see
 * README.md). Keep these in sync by eye with crm/pages/Index.tsx's
 * equivalents if that file's Lightning styling ever changes.
 */
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export const SF_BLUE = "#0070d2";
export const SF_BORDER = "#dddbda";
export const SF_SECTION_BG = "#f3f3f3";

export function SfButton({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[13px] text-[#3e3e3c] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors whitespace-nowrap ${className}`}
    >
      {children}
    </button>
  );
}

export function SfPrimaryButton({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[13px] text-white rounded hover:opacity-90 transition-opacity whitespace-nowrap ${className}`}
      style={{ background: SF_BLUE }}
    >
      {children}
    </button>
  );
}

export function SfLink({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <span className={`cursor-pointer hover:underline ${className}`} style={{ color: SF_BLUE }} onClick={onClick}>
      {children}
    </span>
  );
}

/**
 * Inline label/value row -- label in a fixed-width left column, value
 * filling the rest, both on the same line. Pass `value` for a static row, or
 * `children` (e.g. an <SfSelect>) to render an editable row in the same slot
 * -- used by the Profile page's Enrollment Welcome Kit section while in edit
 * mode.
 *
 * This mirrors the recording's actual detail-page layout (confirmed against
 * the Profile/Case/Stage screens): label and value sit side by side, not
 * label-above-value -- see the "4-column layout" feedback that prompted
 * this rewrite (it previously stacked label above value).
 *
 * `break-all` on the value column matters more than it looks: fields like
 * Service Types/Offerings/Rules Of Engagement are long semicolon-joined
 * strings with NO spaces, so the browser has no natural point to wrap on.
 * Without a word-break rule those values render as one unbreakable run that
 * overflows straight past this column's width and visually collides with
 * the column to its right (see the "overlapping layout" feedback). The
 * recording itself wraps these values mid-word (e.g. "Reen" / "rollment"
 * split across two lines) -- `break-all` reproduces that exact behavior
 * rather than the more conservative `break-words`, which would refuse to
 * split "Reenrollment" and overflow anyway since there's no earlier space.
 */
export function FieldRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-[#dddbda] min-h-[42px]">
      <span className="w-[180px] shrink-0 text-[13px] text-[#3e3e3c] leading-snug">{label}</span>
      <div className="flex-1 min-w-0 break-all text-[13px] text-[#3e3e3c] leading-snug">{children ?? (value || " ")}</div>
    </div>
  );
}

/**
 * Two independent field lists rendered side by side (left column fully
 * top-to-bottom, then right column) -- NOT a single grid that interleaves
 * items row-by-row. The recording's Profile/Case/Stage detail pages all use
 * explicit, hand-assigned column placement (e.g. General's left column is
 * Profile Name through Access Pathway while the right column is Quick Start
 * Description through Brand -- not an alternating pattern), so callers pass
 * the exact left/right split rather than one flat list.
 */
export function TwoColumnFields({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <div className="md:border-r border-[#dddbda]">{left}</div>
      <div>{right}</div>
    </div>
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
  rightContent?: ReactNode;
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

export function SfSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[13px] border border-[#0070d2] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0070d2] bg-white text-[#3e3e3c] w-fit"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eef4ff] text-[#0070d2] border border-[#cfe4fb] whitespace-nowrap">
      {children}
    </span>
  );
}
