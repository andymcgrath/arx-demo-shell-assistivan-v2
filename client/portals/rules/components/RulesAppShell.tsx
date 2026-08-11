/**
 * RulesAppShell — shared Salesforce Lightning chrome for the Rules portal.
 *
 * Recreates the recording's chrome: the dark top bar (hamburger, cloud logo,
 * environment label, search, icon rail) and the app-switcher row (waffle
 * icon + "Product Configuration" app name + tab bar). "Product
 * Configuration" is the Salesforce APP name shown here — distinct from the
 * shell's own "Rules" tab label (DemoShell.tsx), per request. The
 * recording's amber "Salesforce enforces new security requirements" banner
 * was decorative noise unrelated to the demo and has been removed per
 * feedback.
 *
 * Profiles and Rules are real, functional tabs (they navigate within this
 * portal's router). Reports/Dashboards/Error Logs are static — clicking
 * shows a cheap "not available in this demo" toast, per spec.
 */
import type { ReactNode } from "react";
import { useNavigate } from "@/lib/portalRouter";
import {
  Menu,
  Search,
  Star,
  ChevronDown,
  Plus,
  Wrench,
  HelpCircle,
  Settings,
  Bell,
  LayoutGrid,
  Cloud,
} from "lucide-react";
import { useToast } from "./Toast";

const SF_TOPBAR = "#16325c";

type AppTab = "profiles" | "rules" | "reports" | "dashboards" | "errorlogs";

const TABS: { id: AppTab; label: string; to?: string }[] = [
  { id: "profiles", label: "Profiles", to: "/profile/wegovy" },
  { id: "rules", label: "Rules", to: "/rules" },
  { id: "reports", label: "Reports" },
  { id: "dashboards", label: "Dashboards" },
  { id: "errorlogs", label: "Error Logs" },
];

export default function RulesAppShell({
  active,
  children,
}: {
  active: AppTab;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const showToast = useToast();

  return (
    <div className="min-h-full flex flex-col bg-[#f3f2f2]" style={{ fontFamily: "'Salesforce Sans', Arial, sans-serif" }}>
      {/* Dark top bar */}
      <div className="flex items-center gap-3 px-3 h-11 shrink-0" style={{ background: SF_TOPBAR }}>
        <Menu size={18} className="text-white/90 cursor-pointer shrink-0" />
        <Cloud size={20} className="text-white/90 shrink-0" />
        <span className="text-[12px] text-white/70 whitespace-nowrap hidden sm:inline shrink-0">Production</span>
        <div className="flex-1 flex justify-center max-w-lg mx-auto min-w-0">
          <div className="flex items-center gap-2 bg-white/10 rounded px-3 py-1.5 w-full">
            <Search size={13} className="text-white/70 shrink-0" />
            <span className="text-white/60 text-[12px] truncate">Search...</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/80 shrink-0">
          <div className="flex items-center gap-0.5 cursor-pointer" onClick={() => showToast("Not available in this demo")}>
            <Star size={15} />
            <ChevronDown size={11} />
          </div>
          <Plus size={15} className="cursor-pointer" onClick={() => showToast("Not available in this demo")} />
          <Wrench size={15} className="cursor-pointer" onClick={() => showToast("Not available in this demo")} />
          <HelpCircle size={15} className="cursor-pointer" onClick={() => showToast("Not available in this demo")} />
          <Settings size={15} className="cursor-pointer" onClick={() => showToast("Not available in this demo")} />
          <Bell size={15} className="cursor-pointer" onClick={() => showToast("Not available in this demo")} />
          <div className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center text-[10px] font-semibold text-white cursor-pointer shrink-0">
            ZB
          </div>
        </div>
      </div>

      {/* App switcher row */}
      <div className="flex items-stretch bg-white border-b border-[#dddbda] px-3 overflow-x-auto shrink-0" style={{ minHeight: 44 }}>
        <div className="flex items-center gap-2 pr-4 border-r border-[#dddbda] mr-2 shrink-0">
          <LayoutGrid size={16} className="text-[#706e6b] cursor-pointer" onClick={() => showToast("Not available in this demo")} />
          <span className="text-[15px] font-bold text-[#3e3e3c] whitespace-nowrap">Product Configuration</span>
        </div>
        <nav className="flex items-stretch">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => (t.to ? navigate(t.to) : showToast("Not available in this demo"))}
              className={`flex items-center gap-1 px-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                active === t.id
                  ? "border-[#0070d2] text-[#0070d2]"
                  : "border-transparent text-[#3e3e3c] hover:bg-[#f3f3f3]"
              }`}
            >
              {t.label}
              <ChevronDown size={11} className="text-[#706e6b]" />
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
