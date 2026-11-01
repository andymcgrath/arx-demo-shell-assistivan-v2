import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/lib/portalRouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePatientCase } from "@/hooks/usePatientCase";
import { useEnrollPatient } from "@/hooks/useEnrollPatient";
import { useSendPapUpdate } from "@/hooks/useSendPapUpdate";
import { usePersonaState, useWorkflowActor } from "@/engine/WorkflowProvider";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import type { CrmCan } from "../stages/actions";
import { FC_BLUE } from "../components/SfControls";
import { MaterialCatalog } from "../fulfilment/MaterialCatalog";
import { ItemDetails, OrderDetails } from "../fulfilment/ItemColumns";
import { AccountInformation } from "../fulfilment/AccountInformation";
import { MATERIAL_META, canAddItem, buildMessageText } from "../fulfilment/items";

const CASE_ID = "demo";

export default function FulfilmentCenter() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('crm');
  const actor = useWorkflowActor();
  // Whether the machine accepts the event now, so the item's readiness is the machine's answer.
  const can: CrmCan = (e) => actor.getSnapshot().can(e as any);

  // Default straight to Application Update when that's what actually needs
  // sending (BI just came back no_insurance for a WF2 patient) — saves the
  // agent a click when arriving here from the BI detail view's CTA.
  const [selectedItem, setSelectedItem] = useState(() =>
    canAddItem("pap-application-update", "pending", workflowData, can)
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
  const noPaIntake = scenarioFacts(workflowData.flowType).isNoPaIntake;
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
  const itemReady = canAddItem(selectedItem, consentStatus, workflowData, can);
  const messageText = buildMessageText(selectedItem, noPaIntake);

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
          className="text-[13px] font-semibold text-[var(--crm-primary,#0176d3)] pb-2 mr-4"
          style={{ borderBottom: "2px solid var(--crm-primary, #0176d3)" }}
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
