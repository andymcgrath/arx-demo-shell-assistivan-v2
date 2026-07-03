import { useState } from "react";
import { ChevronRight, ArrowRight } from "lucide-react";
import ProgramLogo from "@/components/brand/ProgramLogo";
import { PROGRAM } from "@/config/branding";

interface Prescription {
  name: string;
  status: string;
}

const prescriptions: Prescription[] = [
  {
    name: PROGRAM.name,
    status: "Prescription received",
  },
];

export default function PrescriptionsSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-arx-primary inline-block" />
          <span className="font-bold text-arx-slate text-base">Prescriptions</span>
        </div>
        <button className="flex items-center gap-1 text-sm font-semibold text-arx-primary hover:text-arx-primary-80 transition-colors">
          View all
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Prescription cards */}
      <div className="space-y-2">
        {prescriptions.map((rx, index) => (
          <button
            key={rx.name}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="w-full flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors border-2 border-arx-primary text-arx-primary bg-transparent hover:bg-arx-primary hover:text-white"
          >
            {/* Logo switches to white on hover */}
            <ProgramLogo
              variant={hoveredIndex === index ? "white" : "colors"}
              className="h-8 w-auto max-w-[160px] object-contain flex-shrink-0"
            />
            <div className="flex-1 text-left">
              <p className={`text-xs transition-colors ${hoveredIndex === index ? "text-white" : "text-arx-slate"}`}>{rx.status}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-arx-slate" />
          </button>
        ))}
      </div>
    </div>
  );
}
