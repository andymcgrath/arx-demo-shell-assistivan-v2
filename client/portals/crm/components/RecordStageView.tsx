import { FieldRow, Section, SF_SECTION_BG } from "./SfPrimitives";
import type { RecordContent, RecordNote } from "../stages/records";

/** One shell for a resolved stage's record view. What it says comes from `stages/records.ts`. */

const TONE = {
  denied: {
    badge: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
    pill: { background: "#fee2e2", color: "#dc2626" },
    circle: "#dc2626",
  },
  approved: {
    badge: "linear-gradient(135deg, #2e844a 0%, #1a4d2a 100%)",
    pill: { background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" },
    circle: "#2e844a",
  },
};

const NOTE: Record<RecordNote["tone"], { border: string; background: string; text: string }> = {
  warning: { border: "#F59E0B", background: "#FEF3C7", text: "#92400E" },
  success: { border: "#2e844a", background: "var(--crm-primary-30, #e8f4ef)", text: "#1a4d2a" },
  info: { border: "var(--crm-primary, #0176d3)", background: "var(--crm-primary-30, #eef4ff)", text: "var(--crm-primary-dark, #014486)" },
};

export function RecordStageView({ content }: { content: RecordContent }) {
  const tone = TONE[content.tone];
  const note = content.note && NOTE[content.note.tone];
  return (
    <div>
      <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
        <div className="text-[11px] text-[#706e6b] mb-0.5">{content.kicker}</div>
        <div className="flex items-center justify-between py-2 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
              style={{ width: 36, height: 36, background: tone.badge }}
            >
              {content.mark}
            </div>
            <h1 className="text-[20px] font-bold text-[#3e3e3c]">{content.id}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] font-semibold px-3 py-1 rounded" style={tone.pill}>
              {content.pill}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-0 overflow-hidden">
        <div className="flex-1 min-w-0 p-4 space-y-4">
          {content.sections.map((section) => (
            <Section key={section.title} title={section.title}>
              <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                <div>
                  {section.left.map((r) => (
                    <FieldRow key={r.label} label={r.label} value={r.value} isLink={r.isLink} />
                  ))}
                </div>
                <div>
                  {section.right.map((r) => (
                    <FieldRow key={r.label} label={r.label} value={r.value} isLink={r.isLink} />
                  ))}
                </div>
              </div>
            </Section>
          ))}
          {content.note && note && (
            <div className="border-l-4 p-4 rounded" style={{ borderColor: note.border, background: note.background }}>
              <p className="text-[13px] font-semibold mb-2" style={{ color: note.text }}>{content.note.title}</p>
              <p className="text-[12px]" style={{ color: note.text }}>{content.note.body}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
          <div className="border border-[#dddbda] rounded">
            <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <span className="text-[12px] font-semibold text-[#3e3e3c]">{content.rail.title}</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: tone.circle }}>
                  {content.icon}
                </div>
                <div>
                  <div className="text-[11px] text-[#706e6b]">Status</div>
                  <div className="text-[13px] font-semibold text-[#3e3e3c]">{content.rail.status}</div>
                </div>
              </div>
              {content.rail.rows.map((r) => (
                <div key={r.label}>
                  <div className="text-[11px] text-[#706e6b] mb-1">{r.label}</div>
                  <div className="text-[13px] text-[#3e3e3c]">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
