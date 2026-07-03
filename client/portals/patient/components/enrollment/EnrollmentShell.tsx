import { useNavigate } from "@/lib/portalRouter";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface EnrollmentShellProps {
  icon?: ReactNode;
  title: string;
  stepsFilled: number;
  stepsTotal: number;
  children: ReactNode;
}

export default function EnrollmentShell({
  title,
  stepsFilled,
  stepsTotal,
  children,
}: EnrollmentShellProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto px-5 py-3">
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
      <h1 className="text-2xl font-bold mb-4 text-arx-slate">{title}</h1>

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
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
        {children}
      </div>
    </div>
  );
}
