/**
 * CRM Portal — Shell wrapper
 *
 * PortalRouter provides isolated navigation context without nesting a real
 * Router inside the shell's BrowserRouter (which React Router v6 forbids).
 */
import { useEffect, useRef } from "react";
import { PortalRouter, Routes, Route, useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import Index from "./pages/Index";
import FulfilmentCenter from "./pages/FulfilmentCenter";

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

export default function CrmPortal() {
  return (
    <PortalRouter>
      <ResetToHome />
      <Routes>
        <Route path="/"                  element={<Index />} />
        <Route path="/fulfilment-center" element={<FulfilmentCenter />} />
      </Routes>
    </PortalRouter>
  );
}
