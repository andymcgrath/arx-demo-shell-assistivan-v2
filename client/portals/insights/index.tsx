/**
 * Analytics Portal — placeholder
 *
 * Distinct from the existing "analytics" portal id (tab label "Workforce").
 * This is a new, empty placeholder tab per request — no workflow data wired
 * up yet. Uses plain Tailwind neutrals rather than a --arx-* scoped brand
 * class, since there's no design system assigned to this tab yet.
 */
import { BarChart3 } from "lucide-react";

export default function InsightsPortal() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-5">
          <BarChart3 className="w-8 h-8 text-slate-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Analytics</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          This portal is a placeholder. Content for the Analytics tab hasn't been built yet.
        </p>
      </div>
    </div>
  );
}
