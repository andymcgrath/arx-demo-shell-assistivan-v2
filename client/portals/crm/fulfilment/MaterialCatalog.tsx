import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { FC_BLUE } from "../components/SfControls";
import { TREE_DATA } from "./items";
export function MaterialCatalog({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "consent-comms": true,
    "secure-comms": true,
  });

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col h-full">
      <div className="text-[11px] text-[#706e6b] mb-2 font-medium">
        Available Material Items
      </div>

      <div className="flex flex-col text-[13px]">
        {TREE_DATA.map((group) => {
          const isOpen = expanded[group.id];
          return (
            <div key={group.id}>
              <div
                className="flex items-center gap-1 py-1 px-1 cursor-pointer hover:bg-[#f3f2f2] rounded select-none"
                onClick={() => group.children && toggle(group.id)}
              >
                {group.children ? (
                  isOpen ? (
                    <ChevronDown size={13} className="text-[#706e6b] shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-[#706e6b] shrink-0" />
                  )
                ) : (
                  <ChevronRight size={13} className="text-[#706e6b] shrink-0" />
                )}
                <span className="text-[#3e3e3c]">{group.label}</span>
              </div>

              {isOpen && group.children && (
                <div className="pl-4">
                  {group.children.map((child) => {
                    const isSelected = selectedId === child.id;
                    return (
                      <div
                        key={child.id}
                        className="flex flex-col py-1 px-2 cursor-pointer truncate rounded-sm"
                        style={{
                          borderLeft: isSelected ? "3px solid var(--crm-primary, #0176d3)" : "3px solid transparent",
                          background: isSelected ? "var(--crm-primary-30, #eaf4ff)" : undefined,
                        }}
                        onClick={() => onSelect(child.id)}
                        title={`${child.label} (${child.sublabel})`}
                      >
                        <span
                          className="text-[12px] truncate"
                          style={{ color: isSelected ? FC_BLUE : "#3e3e3c" }}
                        >
                          {child.label}{" "}
                          <span
                            className="text-[11px]"
                            style={{ color: isSelected ? FC_BLUE : "#706e6b" }}
                          >
                            ({child.sublabel})
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Column 2: Item Details ──────────────────────────────────────────────────
