/**
 * Rules Portal — Shell wrapper
 *
 * Recreates a stakeholder-recorded demo of a NEW Salesforce Lightning app
 * ("Product Mgmt") as a portal tab named "Rules" per request — the shell
 * tab label is "Rules" (see DemoShell.tsx's PORTALS_BASE/baseLabels); the
 * Salesforce APP name shown inside this portal's chrome is "Product Mgmt"
 * (see RulesAppShell.tsx's app switcher). The two are intentionally
 * different names for two different things.
 *
 * client/lib/portalRouter.tsx's Routes/Route only do exact string matching
 * — no ":id" dynamic segments, no useParams export (confirmed by reading
 * that file; see its full source). So parameterized pages (profile / rule /
 * action / case / stage detail) are dispatched here by parsing the path
 * manually instead of registering one <Route> per possible id. Every
 * dataset behind these routes is small and finite for this demo (1 profile,
 * 9 rules, 2 cases, 2 stages), so a plain prefix match stays simple and
 * correct without needing to extend the shared router (which every other
 * portal also depends on).
 *
 * This portal's data lives in its own store (client/store/rulesPortalStore.ts)
 * — intentionally independent of demoStore/XState, so ResetToHome here only
 * needs to snap the in-portal URL back to the profile home on a shell-wide
 * reset; it does not reset rulesPortalStore's own data (mirrors how
 * fieldStore/patientStore are never reset by the shell's "Reset All" either).
 */
import { useEffect, useRef } from "react";
import { PortalRouter, usePortalPath, useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import { ToastProvider } from "./components/Toast";
import ProfileDetail from "./pages/ProfileDetail";
import RulesList from "./pages/RulesList";
import RuleDetail from "./pages/RuleDetail";
import ActionDetail from "./pages/ActionDetail";
import CaseDetail from "./pages/CaseDetail";
import StageDetail from "./pages/StageDetail";

function ResetToHome() {
  const navigate = useNavigate();
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);

  useEffect(() => {
    if (resetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = resetNonce;
    navigate("/profile/wegovy");
  }, [resetNonce, navigate]);

  return null;
}

function RulesPortalRoutes() {
  const path = usePortalPath();

  if (path === "/" || path === "/profile/wegovy") return <ProfileDetail />;
  if (path.startsWith("/profile/")) return <ProfileDetail />; // only one profile exists in this demo
  if (path === "/rules") return <RulesList />;
  if (path.startsWith("/rule/")) return <RuleDetail externalId={decodeURIComponent(path.slice("/rule/".length))} />;
  if (path.startsWith("/action/")) return <ActionDetail ruleExternalId={decodeURIComponent(path.slice("/action/".length))} />;
  if (path.startsWith("/case/")) return <CaseDetail caseId={decodeURIComponent(path.slice("/case/".length))} />;
  if (path.startsWith("/stage/")) return <StageDetail stageId={decodeURIComponent(path.slice("/stage/".length))} />;

  return <ProfileDetail />;
}

export default function RulesPortal() {
  return (
    <PortalRouter initialPath="/profile/wegovy">
      <ToastProvider>
        <ResetToHome />
        <RulesPortalRoutes />
      </ToastProvider>
    </PortalRouter>
  );
}
