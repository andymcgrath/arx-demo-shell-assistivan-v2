import { Loader2, CheckCircle2, Send } from "lucide-react";
import { FC_BLUE } from "../components/SfControls";
import { PanelLabel } from "./FulfilmentPrimitives";
export function AccountInformation({
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
          className="accent-[var(--crm-primary,#0176d3)] w-3.5 h-3.5 cursor-pointer"
          disabled={orderAdded}
        />
        <span className="text-[13px] text-[#3e3e3c]">{phone}</span>
        <span
          className="text-[11px] px-1.5 py-0.5 rounded"
          style={{ background: "var(--crm-primary-30, #e8f0fe)", color: FC_BLUE, fontWeight: 500 }}
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
          className="accent-[var(--crm-primary,#0176d3)] w-3.5 h-3.5 cursor-pointer"
          disabled={orderAdded}
        />
        <span className="text-[13px] text-[#3e3e3c] truncate">{email}</span>
        <span
          className="text-[11px] px-1.5 py-0.5 rounded shrink-0"
          style={{ background: "var(--crm-primary-30, #e8f0fe)", color: FC_BLUE, fontWeight: 500 }}
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
              background: orderPlaced ? "#2e844a" : isPlacing ? "var(--crm-primary-dark, #0056a3)" : FC_BLUE,
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
