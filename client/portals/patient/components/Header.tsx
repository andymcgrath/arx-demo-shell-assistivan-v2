import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "@/lib/portalRouter";
import { useChatContext } from "@/components/ChatContext";
import ManufacturerLogo from "@/components/brand/ManufacturerLogo";
import { MANUFACTURER, CHATBOT_ICON, PROGRAM } from "@/config/branding";
import { hexToColorFilter } from "@/lib/brandFilter";
import { usePersonaState } from "@/engine/WorkflowProvider";
import type { FlowType } from "@/store/demoStore";

type NavEntry =
  | { label: string; path: string }
  | { group: string; items: { label: string; path: string }[] };

const ORDER_ITEMS = [
  { label: "Delivery Address",     path: "/delivery-address" },
  { label: "Delivery Date",        path: "/delivery-date" },
  { label: "Payment",              path: "/delivery-payment" },
  { label: "Order Confirmation",   path: "/delivery-confirmation" },
  { label: "Order Tracker",        path: "/order-tracker" },
  { label: "Order Shipped / In Transit", path: "/order-shipped" },
  { label: "Medication Delivered", path: "/medication-delivered" },
];

function buildNavLinks(flowType: FlowType): NavEntry[] {
  if (flowType === "Fax_PAP_Audit") {
    return [
      { label: "Home", path: "/" },
      {
        group: "Enrollment Flow",
        items: [
          { label: "Phone Verification",   path: "/phone-verification" },
          { label: "Confirm Details",      path: "/confirm-details" },
          { label: "Consent",             path: "/consent" },
          { label: "Signature",           path: "/signature" },
          { label: "Income Verification", path: "/income-qualification" },
          { label: "Enrollment Complete", path: "/enrollment-complete" },
        ],
      },
      {
        group: `${PROGRAM.name} PAP Program Order`,
        items: ORDER_ITEMS,
      },
    ];
  }

  if (flowType === "CoA_DTP") {
    // Mirrors coaDtp.ts's actual state chain (see WorkflowEngine's isCoA
    // routing) rather than the generic enrollment steps other flows use —
    // this flow's onboarding is SMS + OTP + Consent only, no Signature or
    // Income Qualification screens exist for it.
    return [
      { label: "Home", path: "/" },
      {
        group: "Enrollment",
        items: [
          { label: "SMS Verification",         path: "/sms-message" },
          { label: "OTP Verification",         path: "/otp-verification" },
          { label: "Confirm Details & Consent", path: "/confirm-details" },
          { label: "Enrollment Complete",      path: "/enrollment-complete" },
        ],
      },
      {
        group: "Prior Authorization Approved",
        items: [
          { label: "PA Approved — SMS",  path: "/pa-approved-sms" },
          { label: "PA Approved — OTP",  path: "/pa-approved-otp" },
          { label: "Benefit Pricing",    path: "/benefit-pricing" },
        ],
      },
      {
        group: `${PROGRAM.name} CoA Direct-to-Patient Order`,
        items: [
          { label: "Delivery Address",   path: "/delivery-address" },
          { label: "Delivery Date",      path: "/delivery-date" },
          { label: "Order Tracker",      path: "/order-tracker" },
          { label: "Order Shipped / In Transit", path: "/order-shipped" },
          { label: "Medication Delivered", path: "/medication-delivered" },
        ],
      },
    ];
  }

  // Fax_QS_PA_Approved
  if (flowType === "Fax_QS_PA_Approved") {
    return [
      { label: "Home", path: "/" },
      {
        group: "Enrollment Flow",
        items: [
          { label: "Phone Verification", path: "/phone-verification" },
          { label: "Confirm Details",    path: "/confirm-details" },
          { label: "Consent",           path: "/consent" },
          { label: "Signature",         path: "/signature" },
          { label: "Upload Insurance",  path: "/upload-insurance" },
          { label: "Enrollment Complete", path: "/enrollment-complete" },
        ],
      },
      {
        group: "PA Journey",
        items: [
          { label: "PA Submitted",       path: "/pa-status" },
          { label: "PA Denied / Appeal", path: "/pa-denied" },
          { label: "PA Approved",        path: "/pa-approved" },
        ],
      },
      {
        group: `${PROGRAM.name} Order Flow`,
        items: [
          { label: "Delivery Address",   path: "/delivery-address" },
          { label: "Delivery Date",      path: "/delivery-date" },
          { label: "Order Confirmation", path: "/delivery-confirmation" },
          { label: "Order Tracker",      path: "/order-tracker" },
          { label: "Order Shipped",      path: "/order-shipped" },
          { label: "Medication Delivered", path: "/medication-delivered" },
        ],
      },
    ];
  }

  // Default (other workflows)
  return [
    { label: "Home", path: "/" },
    {
      group: "Enrollment Flow",
      items: [
        { label: "Phone Verification", path: "/phone-verification" },
        { label: "Confirm Details",    path: "/confirm-details" },
        { label: "Consent",           path: "/consent" },
        { label: "Signature",         path: "/signature" },
        { label: "Upload Insurance",  path: "/upload-insurance" },
        { label: "Enrollment Complete", path: "/enrollment-complete" },
      ],
    },
    {
      group: "PA Journey",
      items: [
        { label: "PA Submitted",       path: "/pa-status" },
        { label: "PA Denied / Appeal", path: "/pa-denied" },
        { label: "PA Approved",        path: "/pa-approved" },
        { label: "Copay Enrollment",   path: "/copay-enroll" },
      ],
    },
    {
      group: `${PROGRAM.name} Order Flow`,
      items: [
        { label: "Delivery Address",   path: "/delivery-address" },
        { label: "Delivery Date",      path: "/delivery-date" },
        { label: "Payment",            path: "/delivery-payment" },
        { label: "Order Confirmation", path: "/delivery-confirmation" },
        { label: "Order Tracker",      path: "/order-tracker" },
        { label: "Order Shipped",      path: "/order-shipped" },
        { label: "Medication Delivered", path: "/medication-delivered" },
      ],
    },
  ];
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === "/";
  const { openChat } = useChatContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const navLinks = buildNavLinks(flowType);

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
            <ManufacturerLogo className="h-10 w-auto max-w-[180px] object-contain" />
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
              style={{ color: "hsl(var(--arx-primary))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--arx-primary-dark))")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--arx-primary))")}
            >
              Important Safety Information
            </a>
            <a
              href={MANUFACTURER.legal.prescribingUrl}
              className="text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{ color: "hsl(var(--arx-primary))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--arx-primary-dark))")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--arx-primary))")}
            >
              Prescribing Information
            </a>
          </div>
        </div>

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
