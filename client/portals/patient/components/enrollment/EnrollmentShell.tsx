import { useNavigate } from "@/lib/portalRouter";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface EnrollmentShellProps {
  icon?: ReactNode;
  title: string;
  stepsFilled: number;
  stepsTotal: number;
  children: ReactNode;
  /**
   * Renders a wider, desktop-appropriate layout instead of the default
   * phone-width card. Used by WF5 (PrES_PAP), which renders as a plain web
   * page (see DemoShell's Panel component) rather than inside the iPhone
   * mockup every other flow uses. Defaults to false so all existing
   * mobile-flow screens are unaffected.
   */
  wide?: boolean;
}

export default function EnrollmentShell({
  title,
  stepsFilled,
  stepsTotal,
  children,
  wide = false,
}: EnrollmentShellProps) {
  const navigate = useNavigate();

  return (
    <div className={`mx-auto px-5 ${wide ? "max-w-3xl py-10" : "max-w-lg py-3"}`}>
      {/* Back button */}
      <div className="flex items-center mb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-arx-sky/40 flex items-center justify-center hover:bg-arx-primary hover:text-white transition-colors text-arx-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <h1 className={`font-bold mb-4 text-arx-slate ${wide ? "text-3xl" : "text-2xl"}`}>{title}</h1>

      {/* Progress bar */}
      <div className="flex gap-2 mb-5">
        {Array.from({ length: stepsTotal }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < stepsFilled ? "bg-arx-primary" : "bg-arx-borders"
            }`}
          />
        ))}
      </div>

      {/* Card wrapper */}
      <div className={`bg-white rounded-2xl shadow-sm border border-arx-borders ${wide ? "p-10" : "p-5"}`}>
        {children}
      </div>
    </div>
  );
}
