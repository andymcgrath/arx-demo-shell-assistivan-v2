/**
 * IAssistHeader — structural port of CoaHeader (wf3-coassist-v2,
 * client/portals/provider/index.tsx), reskinned with iAssist's teal instead
 * of CoA's Heroic blue. Same layout: search / Add New Patient / provider
 * avatar+name / notifications. onSearchChange is optional — only the
 * dashboard actually filters on it.
 *
 * "Add New Patient" is wired to the case-creation wizard (/new-case/patient)
 * — CoaHeader's own button has no handler yet, so this is additive, not a
 * structural difference.
 */
import { useState } from "react";
import { Search, Plus, Bell } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { IASSIST_TEAL, IASSIST_TEAL_DARK } from "./IAssistSidebar";
import { useCaseWizardStore } from "@/store/caseWizardStore";

// No IAssistLogo here — this header is only ever rendered next to
// IAssistSidebar (Dashboard.tsx), which already shows the logo in its own
// top-left logo bar. Adding it here too duplicated it in the same view.
export default function IAssistHeader({ onSearchChange }: { onSearchChange?: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const resetCaseWizard = useCaseWizardStore((s) => s.resetCaseWizard);

  function startNewCase() {
    // Clear out any in-progress answers from a previous case before
    // launching the wizard fresh.
    resetCaseWizard();
    navigate("/new-case/patient");
  }

  return (
    <header className="relative bg-white border-b border-neutral-300 h-14 flex items-center px-4 sm:px-8 gap-4">
      <Search size={20} className="text-neutral-600 flex-shrink-0" />
      <div className="flex-1 flex flex-col">
        <label htmlFor="iassist-header-search" className="sr-only">
          Search for patient by name or date of birth
        </label>
        <input
          id="iassist-header-search"
          type="text"
          placeholder="Search for patient by name or date of birth"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-600 focus:ring-2 rounded px-1"
          style={{ ["--tw-ring-color" as any]: IASSIST_TEAL }}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSearchChange?.(e.target.value);
          }}
          aria-label="Search patients"
        />
      </div>
      <button
        onClick={startNewCase}
        className="font-semibold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap focus:outline-none rounded px-2 py-1"
        style={{ color: IASSIST_TEAL }}
        onMouseEnter={(e) => (e.currentTarget.style.color = IASSIST_TEAL_DARK)}
        onMouseLeave={(e) => (e.currentTarget.style.color = IASSIST_TEAL)}
        aria-label="Add new patient"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">Add New Patient</span>
        <span className="sm:hidden">Add</span>
      </button>
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <div className="hidden sm:flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs"
            style={{ color: IASSIST_TEAL }}
          >
            SC
          </div>
          <span className="text-sm font-normal">Dr. Sarah Chen</span>
        </div>
        <button
          className="relative focus:outline-none rounded p-1"
          style={{ color: IASSIST_TEAL }}
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
