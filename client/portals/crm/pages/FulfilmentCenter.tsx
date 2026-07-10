import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/lib/portalRouter";
import { ChevronRight, ChevronDown, CheckCircle2, ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import { usePatientCase } from "../hooks/usePatientCase";
import { useEnrollPatient } from "../hooks/useEnrollPatient";
import { usePersonaState } from "@/engine/WorkflowProvider";

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
  { id: "secure-comms", label: "Secure Communications" },
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
  consentStatus,
  checksVisible,
  validating,
  orderAdded,
  onAddToOrder,
}: {
  consentStatus: string;
  checksVisible: 0 | 1 | 2;
  validating: boolean;
  orderAdded: boolean;
  onAddToOrder: () => void;
}) {
  const canAdd = consentStatus === "pending" && !orderAdded && !validating;

  return (
    <div className="flex flex-col h-full">
      <PanelLabel>Item Details</PanelLabel>

      <h2 className="text-[16px] font-bold text-[#3e3e3c] mb-0.5">
        Communication Consent
      </h2>
      <div className="text-[12px] text-[#706e6b] mb-0.5">CommunicationConsent</div>
      <div className="text-[12px] text-[#706e6b] mb-3">Communication Consent Capture</div>

      <hr className="border-[#dddbda] mb-3" />

      <CheckRow text="Patient has valid mobile phone number" visible={checksVisible >= 1} />
      <CheckRow text="Patient communication consent status is pending capture" visible={checksVisible >= 2} />

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
  orderAdded,
  patientName,
  phone,
  email,
  contactMethod,
  isPapFlow,
}: {
  orderAdded: boolean;
  patientName: string;
  phone: string;
  email: string;
  contactMethod: "phone" | "email";
  isPapFlow: boolean;
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
  const messageText = isPapFlow
    ? `Welcome! You've been referred to the Assistivan Patient Assistance Program. Complete next step here:\n\nhttps://go.iassist/g6w9\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`
    : `Welcome! Your prescription is ready to process. Complete next step here:\n\nhttps://go.iassist/g6w9\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`;

  return (
    <div className="flex flex-col h-full">
      <PanelLabel>Order Details</PanelLabel>

      {/* Order line item */}
      <div
        className="border border-[#dddbda] rounded p-3 mb-4"
        style={{ background: "#f9f9f9" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold text-[#3e3e3c]">Electronic Consent</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded font-medium"
            style={{ background: "#e8f4ef", color: "#2e844a" }}
          >
            Ready
          </span>
        </div>
        <div className="text-[12px] text-[#706e6b]">CommunicationConsent · ElectronicConsent</div>
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

  const [selectedItem, setSelectedItem] = useState("electronic-consent");
  const [contactMethod, setContactMethod] = useState<"phone" | "email">("phone");
  const [checksVisible, setChecksVisible] = useState<0 | 1 | 2>(0);
  const [validating, setValidating] = useState(false);
  const [orderAdded, setOrderAdded] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const { data: patientCase, isLoading: caseLoading } = usePatientCase(CASE_ID);
  const enrollMutation = useEnrollPatient();
  const isPapFlow = workflowData.flowType === "Fax_PAP_Audit";

  // Auto-navigate back to record when patient completes onboarding
  useEffect(() => {
    if (workflowData.consentStatus === 'confirmed') {
      navigate('/');
    }
  }, [workflowData.consentStatus, navigate]);

  useEffect(() => {
    if (orderPlaced && !enrollMutation.isPending) {
      toast.success("Message sent successfully");
    }
  }, [orderPlaced, enrollMutation.isPending]);

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
    enrollMutation.mutate({ caseId: CASE_ID, contactMethod });
    setOrderPlaced(true);
  };

  const consentStatus = patientCase?.consentStatus ?? "pending";

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
              consentStatus={consentStatus}
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
              orderAdded={orderAdded}
              patientName={patientCase?.patientName ?? ""}
              phone={patientCase?.phone ?? ""}
              email={patientCase?.email ?? ""}
              contactMethod={contactMethod}
              isPapFlow={isPapFlow}
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
              isPlacing={enrollMutation.isPending}
              orderPlaced={orderPlaced}
            />
          )}
        </div>
      </div>
    </div>
  );
}
