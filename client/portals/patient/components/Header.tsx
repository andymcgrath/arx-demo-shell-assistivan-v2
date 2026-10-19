import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "@/lib/portalRouter";
import { useChatContext } from "@/portals/patient/components/ChatContext";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import { MANUFACTURER, CHATBOT_ICON, PROGRAM } from "@/portals/patient/config/branding";
import { hexToColorFilter } from "@/portals/patient/lib/brandFilter";
import { usePersonaState } from "@/engine/WorkflowProvider";
import type { FlowType } from "@/store/demoStore";
import type { WorkflowData } from "@/engine/types";
import { menuFor, type MenuEntry } from "@/engine/workflow/screens";
import { screenMapFor } from "@/workflows/screenMaps";

/** The menu comes from the workflow's screen list, the same list derivePatientRoute reads. */
function buildNavLinks(flowType: FlowType, data: WorkflowData): MenuEntry[] {
  const screenMap = screenMapFor(flowType);
  if (!screenMap) return [];
  return menuFor(screenMap, flowType, data).map((entry) =>
    "group" in entry ? { ...entry, group: entry.group.replace("{program}", PROGRAM.name) } : entry,
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === "/";
  const { openChat } = useChatContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const navLinks = buildNavLinks(flowType, workflowData);

  function handleNav(path: string) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-arx-borders shadow-sm">
        {/* Row 1: Hamburger + Logo + Chat */}
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-arx-sky/30"
            style={{ color: "#1C1C1C" }}
            aria-label="Open navigation menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <div className="flex-1 flex justify-center">
            <ManufacturerLogo size="header" />
          </div>

          {/* Chat / Technical Help */}
          <button
            className="flex-shrink-0 flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: "#1C1C1C" }}
            aria-label={MANUFACTURER.support.label}
            onClick={openChat}
            onMouseEnter={e => (e.currentTarget.style.color = "#555555")}
            onMouseLeave={e => (e.currentTarget.style.color = "#1C1C1C")}
          >
            <span className="hidden sm:inline text-xs">{MANUFACTURER.support.label}</span>
            <img src={CHATBOT_ICON} alt="" className="w-5 h-5 object-contain" style={{ filter: "brightness(0) opacity(0.8)" }} />
          </button>
        </div>

        {/* Row 2: Safety Nav Links — all pages */}
        <div className="border-t border-arx-borders bg-white">
          <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-center gap-8">
            <a
              href={MANUFACTURER.legal.safetyUrl}
              className="text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{ color: "hsl(var(--arx-link))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--arx-primary-dark))")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--arx-link))")}
            >
              Important Safety Information
            </a>
            <a
              href={MANUFACTURER.legal.prescribingUrl}
              className="text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{ color: "hsl(var(--arx-link))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--arx-primary-dark))")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--arx-link))")}
            >
              Prescribing Information
            </a>
          </div>
        </div>

        {/* Accent strip. Shows only when the brand has an accent color (white otherwise). */}
        <div className="h-[3px] bg-arx-strip" />

        {/* Pendo Placeholder */}
        <div className="hidden" data-pendo-id="header-navigation" title="Pendo: Header Navigation Tracking" />
      </header>

      {/* Slide-down nav drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-arx-slate/30"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer */}
          <nav className="fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-2xl flex flex-col overflow-y-auto border-r border-arx-borders">
            {/* Drawer header */}
            <div className="flex items-center justify-end px-5 py-4 flex-shrink-0 border-b border-arx-borders">
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="text-arx-inactive hover:text-arx-slate transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 px-4 py-4 space-y-5">
              {navLinks.map((entry) => {
                if ("path" in entry) {
                  const isActive = pathname === entry.path;
                  return (
                    <button
                      key={entry.path}
                      onClick={() => handleNav(entry.path)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        backgroundColor: isActive ? "#ADE2E340" : "transparent",
                        color: isActive ? "#007178" : "#414042",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ADE2E320"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                    >
                      {entry.label}
                    </button>
                  );
                }

                return (
                  <div key={entry.group}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-3 text-arx-inactive">
                      {entry.group}
                    </p>
                    <div className="space-y-1">
                      {entry.items.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: isActive ? "#ADE2E340" : "transparent",
                              color: isActive ? "#007178" : "#6F7276",
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ADE2E320"; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer of drawer */}
            <div className="px-5 py-4 border-t border-arx-borders text-[10px] text-white/70">
              {MANUFACTURER.copyright}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
