/**
 * Analytics Portal — Shell wrapper
 * Scoped in .portal-analytics so the dark navy CSS variables apply only here.
 */
import AnalyticsPage from "./pages/Index";

export default function AnalyticsPortal() {
  return (
    <div className="portal-analytics h-full overflow-hidden">
      <AnalyticsPage />
    </div>
  );
}
