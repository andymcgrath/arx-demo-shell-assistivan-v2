/**
 * CRM Portal — Shell wrapper
 *
 * PortalRouter provides isolated navigation context without nesting a real
 * Router inside the shell's BrowserRouter (which React Router v6 forbids).
 */
import { PortalRouter, Routes, Route } from "@/lib/portalRouter";
import Index from "./pages/Index";
import FulfilmentCenter from "./pages/FulfilmentCenter";

export default function CrmPortal() {
  return (
    <PortalRouter>
      <Routes>
        <Route path="/"                  element={<Index />} />
        <Route path="/fulfilment-center" element={<FulfilmentCenter />} />
      </Routes>
    </PortalRouter>
  );
}
