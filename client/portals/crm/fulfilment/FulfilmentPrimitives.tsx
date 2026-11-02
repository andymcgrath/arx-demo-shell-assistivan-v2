import { CheckCircle2 } from "lucide-react";
export function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-[#706e6b] uppercase tracking-wider font-medium mb-2">
      {children}
    </div>
  );
}

export function CheckRow({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div
        className="shrink-0 mt-0.5"
        style={{
          transition: "opacity 0.4s ease, transform 0.4s ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.4)",
        }}
      >
        <CheckCircle2
          size={18}
          style={{ color: "#2e844a", fill: "#2e844a", stroke: "white" }}
        />
      </div>
      <span
        className="text-[13px]"
        style={{
          transition: "color 0.3s ease",
          color: visible ? "#3e3e3c" : "#aaabac",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ─── Column 1: Material Catalog ─────────────────────────────────────────────
