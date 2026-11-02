import { Loader2, MessageSquare } from "lucide-react";
import { FC_BLUE } from "../components/SfControls";
import type { MaterialMeta } from "./items";
import { PanelLabel, CheckRow } from "./FulfilmentPrimitives";
export function ItemDetails({
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

export function OrderDetails({
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
            style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}
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
          background: "var(--crm-primary-30, #e8f4ff)",
          color: "var(--crm-primary-dark, #1a1a2e)",
          border: "1px solid var(--crm-primary-30, #c7dffa)",
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
            borderTop: "8px solid var(--crm-primary-30, #e8f4ff)",
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
