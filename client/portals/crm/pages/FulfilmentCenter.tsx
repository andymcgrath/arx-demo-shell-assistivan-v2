import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/lib/portalRouter";
import { ChevronRight, ChevronDown, CheckCircle2, ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import { usePatientCase } from "../hooks/usePatientCase";
import { useEnrollPatient } from "../hooks/useEnrollPatient";
import { useSendPapUpdate } from "@/hooks/useSendPapUpdate";
import { usePersonaState } from "@/engine/WorkflowProvider";
import type { WorkflowData } from "@/engine/types";

const CASE_ID = "demo";
const FC_BLUE = "#0176d3";

// ─── Tree Node Types ────────────────────────────────────────────────────────

type TreeItem = {
  id: string;
  label: string;
  sublabel?: string;
};

type TreeGroup = {
  id: string;
  label: string;
  expanded?: boolean;
  children?: TreeItem[];
};

const TREE_DATA: TreeGroup[] = [
  { id: "material-items", label: "Material Items" },
  { id: "email", label: "Email" },
  {
    id: "secure-comms",
    label: "Secure Communications",
    expanded: true,
    children: [
      { id: "pap-application-update", label: "Application Update", sublabel: "PAP_Application_Update" },
    ],
  },
  {
    id: "consent-comms",
    label: "Consent Communications",
    expanded: true,
    children: [
      { id: "unsuccessful-contact", label: "Unsuccessful Contact", sublabel: "Unsuccessful_Contact" },
      { id: "electronic-consent", label: "Electronic Consent", sublabel: "ElectronicConsent" },
      { id: "consent-revocation", label: "Consent Revocation", sublabel: "Consent_Revocation" },
      { id: "consent-recap-reminder", label: "Consent Re-capture Reminder", sublabel: "Consent_Recap_Reminder" },
      { id: "consent-recap-confirm", label: "Consent Re-capture Confirmation", sublabel: "Consent_Recap_Confirma…" },
    ],
  },
];

// ─── Material metadata ──────────────────────────────────────────────────────
// One entry per wired catalog item (id must match a TREE_DATA leaf above).
// ItemDetails/OrderDetails read this instead of hardcoding "Electronic
// Consent" so a second real item (Application Update) renders correctly.

type MaterialMeta = {
  title: string;
  typeLabel: string;
  subtypeLabel: string;
  description: string;
  checks: string[];
};

const MATERIAL_META: Record<string, MaterialMeta> = {
  "electronic-consent": {
    title: "Communication Consent",
    typeLabel: "CommunicationConsent",
    subtypeLabel: "ElectronicConsent",
    description: "Communication Consent Capture",
    checks: [
      "Patient has valid mobile phone number",
      "Patient communication consent status is pending capture",
    ],
  },
  "pap-application-update": {
    title: "Application Update",
    typeLabel: "SecureCommunication",
    subtypeLabel: "PAP_Application_Update",
    description: "PAP Application Status Notification",
    checks: [
      "Benefits Investigation complete — no coverage found",
      "Patient has valid mobile phone number",
    ],
  },
};

/**
 * Whether the selected catalog item is ready to add to the order.
 * "electronic-consent" keys off the pre-enrollment consent record
 * (unchanged); "pap-application-update" keys off BI having just come back
 * no_insurance for a WF2 (Fax_PAP_Audit) patient who hasn't been texted yet
 * — see WorkflowEngine.ts's Fax_PAP_Audit routing branch.
 */
function canAddItem(selectedId: string, consentStatus: string, workflowData: WorkflowData): boolean {
  if (selectedId === "pap-application-update") {
    return (
      workflowData.flowType === "Fax_PAP_Audit" &&
      workflowData.biStatus === "complete" &&
      workflowData.biResult === "no_insurance" &&
      !workflowData.papSmsSent
    );
  }
  if (selectedId === "electronic-consent") {
    return consentStatus === "pending";
  }
  return false;
}

function buildMessageText(selectedId: string, isPapFlow: boolean): string {
  if (selectedId === "pap-application-update") {
    return `There's an update on your Assistivan Patient Assistance Program application. Tap to continue:\n\nhttps://go.iassist/pap-update\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`;
  }
  return isPapFlow
    ? `Welcome! You've been referred to the Assistivan Patient Assistance Program. Complete next step here:\n\nhttps://go.iassist/g6w9\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`
    : `Welcome! Your prescription is ready to process. Complete next step here:\n\nhttps://go.iassist/g6w9\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`;
}

// ─── Small reusable components ──────────────────────────────────────────────

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-[#706e6b] uppercase tracking-wider font-medium mb-2">
      {children}
    </div>
  );
}

function CheckRow({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div
        className="shrink-0 mt-0.5"
        style={{
          transition: "opacity 0.4s ease, transform 0.4s ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.4)",
        }}
      >
        <CheckCircle2
          size={18}
          style={{ color: "#2e844a", fill: "#2e844a", stroke: "white" }}
        />
      </div>
      <span
        className="text-[13px]"
        style={{
          transition: "color 0.3s ease",
          color: visible ? "#3e3e3c" : "#aaabac",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ─── Column 1: Material Catalog ─────────────────────────────────────────────

function MaterialCatalog({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "consent-comms": true,
    "secure-comms": true,
  });

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col h-full">
      <div className="text-[11px] text-[#706e6b] mb-2 font-medium">
        Available Material Items
      </div>

      <div className="flex flex-col text-[13px]">
        {TREE_DATA.map((group) => {
          const isOpen = expanded[group.id];
          return (
            <div key={group.id}>
              <div
                className="flex items-center gap-1 py-1 px-1 cursor-pointer hover:bg-[#f3f2f2] rounded select-none"
                onClick={() => group.children && toggle(group.id)}
              >
                {group.children ? (
                  isOpen ? (
                    <ChevronDown size={13} className="text-[#706e6b] shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-[#706e6b] shrink-0" />
                  )
                ) : (
                  <ChevronRight size={13} className="text-[#706e6b] shrink-0" />
                )}
                <span className="text-[#3e3e3c]">{group.label}</span>
              </div>

              {isOpen && group.children && (
                <div className="pl-4">
                  {group.children.map((child) => {
                    const isSelected = selectedId === child.id;
                    return (
                      <div
                        key={child.id}
                        className="flex flex-col py-1 px-2 cursor-pointer truncate rounded-sm"
                        style={{
                          borderLeft: isSelected ? "3px solid #0176d3" : "3px solid transparent",
                          background: isSelected ? "#eaf4ff" : undefined,
                        }}
                        onClick={() => onSelect(child.id)}
                        title={`${child.label} (${child.sublabel})`}
                      >
                        <span
                          className="text-[12px] truncate"
                          style={{ color: isSelected ? "#0176d3" : "#3e3e3c" }}
                        >
                          {child.label}{" "}
                          <span
                            className="text-[11px]"
                            style={{ color: isSelected ? "#0176d3" : "#706e6b" }}
                          >
                            ({child.sublabel})
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Column 2: Item Details ──────────────────────────────────────────────────

function ItemDetails({
  meta,
  itemReady,
  checksVisible,
  validating,
  orderAdded,
  onAddToOrder,
}: {
  meta: MaterialMeta;
  itemReady: boolean;
  checksVisible: 0 | 1 | 2;
  validating: boolean;
  orderAdded: boolean;
  onAddToOrder: () => void;
}) {
  const canAdd = itemReady && !orderAdded && !validating;

  return (
    <div className="flex flex-col h-full">
      <PanelLabel>Item Details</PanelLabel>

      <h2 className="text-[16px] font-bold text-[#3e3e3c] mb-0.5">
        {meta.title}
      </h2>
      <div className="text-[12px] text-[#706e6b] mb-0.5">{meta.typeLabel}</div>
      <div className="text-[12px] text-[#706e6b] mb-3">{meta.description}</div>

      <hr className="border-[#dddbda] mb-3" />

      {meta.checks.map((check, i) => (
        <CheckRow key={check} text={check} visible={checksVisible >= i + 1} />
      ))}

      <hr className="border-[#dddbda] mt-3 mb-4" />

      <div className="flex justify-center">
        <button
          onClick={onAddToOrder}
          disabled={!canAdd}
          className="flex items-center gap-2 px-5 py-1.5 text-[13px] font-medium rounded text-white"
          style={{
            background: !canAdd ? "#aaabac" : FC_BLUE,
            cursor: !canAdd ? "not-allowed" : "pointer",
            transition: "background 0.3s ease",
          }}
        >
          {validating && <Loader2 size={13} className="animate-spin" />}
          {orderAdded ? "Added to Order" : "Add to Order"}
        </button>
      </div>
    </div>
  );
}

// ─── Column 3: Order Details ─────────────────────────────────────────────────

function OrderDetails({
  meta,
  orderAdded,
  patientName,
  phone,
  email,
  contactMethod,
  messageText,
}: {
  meta: MaterialMeta;
  orderAdded: boolean;
  patientName: string;
  phone: string;
  email: string;
  contactMethod: "phone" | "email";
  messageText: string;
}) {
  if (!orderAdded) {
    return (
      <div className="flex flex-col h-full">
        <PanelLabel>Order Details</PanelLabel>
        <div className="flex items-center justify-center flex-1">
          <span className="text-[12px] text-[#706e6b]">No items added to order yet.</span>
        </div>
      </div>
    );
  }

  const isPhone = contactMethod === "phone";
  const destination = isPhone ? phone : email;

  return (
    <div className="flex flex-col h-full">
      <PanelLabel>Order Details</PanelLabel>

      {/* Order line item */}
      <div
        className="border border-[#dddbda] rounded p-3 mb-4"
        style={{ background: "#f9f9f9" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold text-[#3e3e3c]">{meta.title}</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded font-medium"
            style={{ background: "#e8f4ef", color: "#2e844a" }}
          >
            Ready
          </span>
        </div>
        <div className="text-[12px] text-[#706e6b]">{meta.typeLabel} · {meta.subtypeLabel}</div>
        <div className="text-[12px] text-[#706e6b] mt-1">
          Via: <span className="font-medium text-[#3e3e3c]">{isPhone ? "SMS" : "Email"}</span> → {destination}
        </div>
      </div>

      {/* Message preview */}
      <div className="text-[11px] text-[#706e6b] uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
        <MessageSquare size={12} />
        Message Preview
      </div>
      <div
        className="rounded-lg p-3 text-[13px] leading-relaxed whitespace-pre-wrap relative"
        style={{
          background: "#e8f4ff",
          color: "#1a1a2e",
          border: "1px solid #c7dffa",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {messageText}
        {/* Bubble tail */}
        <div
          className="absolute -bottom-2 left-4 w-0 h-0"
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid #e8f4ff",
          }}
        />
      </div>

      <div className="mt-3 text-[11px] text-[#706e6b]">
        Sending to: <span className="font-medium text-[#3e3e3c]">{destination}</span>
      </div>
    </div>
  );
}

// ─── Column 4: Account Information ───────────────────────────────────────────

function AccountInformation({
  patientName,
  phone,
  email,
  contactMethod,
  onContactMethodChange,
  orderAdded,
  onPlaceOrder,
  isPlacing,
  orderPlaced,
}: {
  patientName: string;
  phone: string;
  email: string;
  contactMethod: "phone" | "email";
  onContactMethodChange: (v: "phone" | "email") => void;
  orderAdded: boolean;
  onPlaceOrder: () => void;
  isPlacing: boolean;
  orderPlaced: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <PanelLabel>Account Information</PanelLabel>

      <div className="text-[15px] font-bold text-[#3e3e3c] mb-3">{patientName}</div>

      <div className="text-[12px] text-[#c23934] font-medium mb-1">
        * Contact Method
      </div>

      {/* Radio: Phone */}
      <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
        <input
          type="radio"
          name="contactMethod"
          value="phone"
          checked={contactMethod === "phone"}
          onChange={() => onContactMethodChange("phone")}
          className="accent-[#0176d3] w-3.5 h-3.5 cursor-pointer"
          disabled={orderAdded}
        />
        <span className="text-[13px] text-[#3e3e3c]">{phone}</span>
        <span
          className="text-[11px] px-1.5 py-0.5 rounded"
          style={{ background: "#e8f0fe", color: FC_BLUE, fontWeight: 500 }}
        >
          MOBILE
        </span>
      </label>

      {/* Radio: Email */}
      <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
        <input
          type="radio"
          name="contactMethod"
          value="email"
          checked={contactMethod === "email"}
          onChange={() => onContactMethodChange("email")}
          className="accent-[#0176d3] w-3.5 h-3.5 cursor-pointer"
          disabled={orderAdded}
        />
        <span className="text-[13px] text-[#3e3e3c] truncate">{email}</span>
        <span
          className="text-[11px] px-1.5 py-0.5 rounded shrink-0"
          style={{ background: "#e8f0fe", color: FC_BLUE, fontWeight: 500 }}
        >
          EMAIL
        </span>
      </label>

      <div className="mt-3 flex flex-col gap-0.5">
        <a
          href={`mailto:${email}`}
          className="text-[13px] hover:underline truncate"
          style={{ color: FC_BLUE }}
        >
          {email}
        </a>
        <span className="text-[13px]" style={{ color: FC_BLUE }}>
          {phone}
        </span>
      </div>

      {/* Place Order button — shown after Add to Order */}
      {orderAdded && (
        <div className="mt-4 pt-4 border-t border-[#dddbda]">
          <button
            onClick={onPlaceOrder}
            disabled={isPlacing || orderPlaced}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold rounded text-white transition-colors"
            style={{
              background: orderPlaced ? "#2e844a" : isPlacing ? "#0056a3" : FC_BLUE,
              cursor: isPlacing || orderPlaced ? "not-allowed" : "pointer",
              border: "none",
            }}
          >
            {isPlacing && <Loader2 size={13} className="animate-spin" />}
            {orderPlaced ? (
              <>
                <CheckCircle2 size={14} style={{ stroke: "white" }} />
                Order Placed
              </>
            ) : (
              <>
                <Send size={13} />
                Place Order
              </>
            )}
          </button>
          {!orderPlaced && (
            <p className="text-[11px] text-[#706e6b] mt-1.5 text-center">
              Sends consent request to patient
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FulfilmentCenter() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('crm');

  // Default straight to Application Update when that's what actually needs
  // sending (BI just came back no_insurance for a WF2 patient) — saves the
  // agent a click when arriving here from the BI detail view's CTA.
  const [selectedItem, setSelectedItem] = useState(() =>
    canAddItem("pap-application-update", "pending", workflowData)
      ? "pap-application-update"
      : "electronic-consent"
  );
  const [contactMethod, setContactMethod] = useState<"phone" | "email">("phone");
  const [checksVisible, setChecksVisible] = useState<0 | 1 | 2>(0);
  const [validating, setValidating] = useState(false);
  const [orderAdded, setOrderAdded] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const { data: patientCase, isLoading: caseLoading } = usePatientCase(CASE_ID);
  const enrollMutation = useEnrollPatient();
  const papUpdateMutation = useSendPapUpdate();
  const isPapFlow = workflowData.flowType === "Fax_PAP_Audit";
  const isPapUpdateItem = selectedItem === "pap-application-update";
  const activeMutation = isPapUpdateItem ? papUpdateMutation : enrollMutation;

  // Auto-navigate back to record once the patient completes onboarding.
  // Only fires on a pending→confirmed transition observed *during this
  // page visit* — guarded by a mount-time ref so opening the Fulfillment
  // Center later in the flow (e.g. to send the Application Update, after
  // consent was already confirmed earlier) doesn't immediately bounce the
  // agent back out.
  const consentAlreadyConfirmedOnMount = useRef(workflowData.consentStatus === 'confirmed');
  useEffect(() => {
    if (!consentAlreadyConfirmedOnMount.current && workflowData.consentStatus === 'confirmed') {
      navigate('/');
    }
  }, [workflowData.consentStatus, navigate]);

  useEffect(() => {
    if (orderPlaced && !activeMutation.isPending) {
      toast.success("Message sent successfully");
    }
  }, [orderPlaced, activeMutation.isPending]);

  // Reset per-item progress when the agent switches catalog selection, so
  // an in-progress or completed order on one item doesn't bleed into another.
  useEffect(() => {
    setChecksVisible(0);
    setValidating(false);
    setOrderAdded(false);
    setOrderPlaced(false);
  }, [selectedItem]);

  const handleAddToOrder = () => {
    setValidating(true);
    setTimeout(() => setChecksVisible(1), 600);
    setTimeout(() => setChecksVisible(2), 1300);
    setTimeout(() => {
      setValidating(false);
      setOrderAdded(true);
    }, 1900);
  };

  const handlePlaceOrder = () => {
    activeMutation.mutate({ caseId: CASE_ID, contactMethod });
    setOrderPlaced(true);
  };

  const consentStatus = patientCase?.consentStatus ?? "pending";
  const meta = MATERIAL_META[selectedItem] ?? MATERIAL_META["electronic-consent"];
  const itemReady = canAddItem(selectedItem, consentStatus, workflowData);
  const messageText = buildMessageText(selectedItem, isPapFlow);

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13 }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-center relative border-b border-[#dddbda] py-2 px-4"
        style={{ minHeight: 40 }}
      >
        <Link
          to="/"
          className="absolute left-4 flex items-center gap-1 text-[12px] hover:underline"
          style={{ color: FC_BLUE }}
        >
          <ArrowLeft size={13} />
          Back to Record
        </Link>
        <span className="text-[14px] font-semibold text-[#3e3e3c]">
          Fulfilment Center
        </span>
      </div>

      {/* Sub-header: Material Catalog tab */}
      <div className="border-b border-[#dddbda] px-4 flex items-end" style={{ minHeight: 36 }}>
        <div
          className="text-[13px] font-semibold text-[#0176d3] pb-2 mr-4"
          style={{ borderBottom: "2px solid #0176d3" }}
        >
          Material Catalog
        </div>
      </div>

      {/* 4-column body */}
      <div className="flex flex-1" style={{ minHeight: 380 }}>

        {/* Col 1 — Material Catalog (~21%) */}
        <div
          className="border-r border-[#dddbda] p-3 overflow-y-auto"
          style={{ flexBasis: "21%", minWidth: 180 }}
        >
          <MaterialCatalog selectedId={selectedItem} onSelect={setSelectedItem} />
        </div>

        {/* Col 2 — Item Details (~25%) */}
        <div
          className="border-r border-[#dddbda] p-4 overflow-y-auto"
          style={{ flexBasis: "25%", minWidth: 200 }}
        >
          {caseLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-[#706e6b]" />
            </div>
          ) : (
            <ItemDetails
              meta={meta}
              itemReady={itemReady}
              checksVisible={checksVisible}
              validating={validating}
              orderAdded={orderAdded}
              onAddToOrder={handleAddToOrder}
            />
          )}
        </div>

        {/* Col 3 — Order Details (~33%) */}
        <div
          className="border-r border-[#dddbda] p-4 overflow-y-auto"
          style={{ flexBasis: "33%", minWidth: 220 }}
        >
          {caseLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-[#706e6b]" />
            </div>
          ) : (
            <OrderDetails
              meta={meta}
              orderAdded={orderAdded}
              patientName={patientCase?.patientName ?? ""}
              phone={patientCase?.phone ?? ""}
              email={patientCase?.email ?? ""}
              contactMethod={contactMethod}
              messageText={messageText}
            />
          )}
        </div>

        {/* Col 4 — Account Information (~21%) */}
        <div
          className="p-4 overflow-y-auto"
          style={{ flexBasis: "21%", minWidth: 180 }}
        >
          {caseLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-[#706e6b]" />
            </div>
          ) : (
            <AccountInformation
              patientName={patientCase?.patientName ?? ""}
              phone={patientCase?.phone ?? ""}
              email={patientCase?.email ?? ""}
              contactMethod={contactMethod}
              onContactMethodChange={setContactMethod}
              orderAdded={orderAdded}
              onPlaceOrder={handlePlaceOrder}
              isPlacing={activeMutation.isPending}
              orderPlaced={orderPlaced}
            />
          )}
        </div>
      </div>
    </div>
  );
}
