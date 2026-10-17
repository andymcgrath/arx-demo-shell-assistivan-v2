/**
 * Client Portal — Shell wrapper
 *
 * A duplicate of the CRM portal (see client/portals/crm/index.tsx), with one
 * addition: the ".portal-client" wrapper class below, which scopes this
 * portal's --arx-primary* CSS variables the same way ".portal-patient" does
 * for the Patient Portal (see client/global.css). "./branding" is a
 * side-effect-only import — it has no exports this file uses — that injects
 * TG Therapeutics' colors into those variables at module load; see that
 * file's header comment for why this portal is always TG Therapeutics
 * specifically, rather than following the demo's live "active brand."
 *
 * PortalRouter provides isolated navigation context without nesting a real
 * Router inside the shell's BrowserRouter (which React Router v6 forbids).
 */
import "./branding";
import { useEffect, useRef } from "react";
import { PortalRouter, Routes, Route, useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import Index from "./pages/Index";
import FulfilmentCenter from "./pages/FulfilmentCenter";
import BrandCallout from "./components/BrandCallout";

/**
 * PortalRouter's path is local component state with no memory of the outer
 * workflow reset — the CRM tab being "active" doesn't mean this router's
 * internal path goes back to "/" on its own. Force it home on every reset,
 * the same way the patient portal's StateDrivenNav does.
 */
function ResetToHome() {
  const navigate = useNavigate();
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);

  useEffect(() => {
    if (resetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = resetNonce;
    navigate("/");
  }, [resetNonce, navigate]);

  return null;
}

export default function ClientPortal() {
  return (
    <div className="portal-client h-full">
      {/* Sibling of the routed content (not a child of it), and first in
       * the DOM, so its sticky-top positioning resolves against the same
       * scroll container DemoShell's Panel gives this whole portal and it
       * sticks above the case content beneath it. */}
      <BrandCallout />
      <PortalRouter>
        <ResetToHome />
        <Routes>
          <Route path="/"                  element={<Index />} />
          <Route path="/fulfilment-center" element={<FulfilmentCenter />} />
        </Routes>
      </PortalRouter>
    </div>
  );
}
