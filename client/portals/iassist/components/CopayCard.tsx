/**
 * CopayCard: the collapsible Copay Information card from the Buy and Bill screens. Collapsed it shows the balance
 * on the card. Expanded it shows the program status, the card, the benefit period, spend, and transactions.
 * Not enrolled: it offers enrollment (the HCP enrolls the patient, so the patient takes no action).
 */
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { BRAND } from "@/brand";
import CopayCardArt from "./CopayCardArt";
import { benefitPeriod, COPAY_ANNUAL_MAX, money, spendOnCard, type CopayTransaction } from "../data/copayProgram";

/** How long enrollment shows as working before the patient is enrolled. */
const ENROLL_MS = 3000;

export default function CopayCard({
  enrolled,
  onEnroll,
  transactions = [],
  defaultOpen = false,
}: {
  enrolled: boolean;
  onEnroll?: () => void;
  transactions?: CopayTransaction[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Enrolling takes a moment, as it does in the other enrollment flows. The event fires when the wait ends.
  const [enrolling, setEnrolling] = useState(false);
  useEffect(() => {
    if (!enrolling) return;
    const t = setTimeout(() => {
      onEnroll?.();
      setEnrolling(false);
    }, ENROLL_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolling]);
  const spend = spendOnCard(transactions);
  const balance = COPAY_ANNUAL_MAX - spend;

  return (
    <div className="border border-[#D9D9D9] rounded-xl bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-base font-semibold text-[#1D1D1D]">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />} Copay Information
        </span>
        <span className="text-sm text-[#1D1D1D]">
          {enrolled ? (
            <>Current balance on card: <strong>{money(balance)}</strong></>
          ) : (
            <span className="text-[#6F7276]">Not enrolled</span>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#E8E8E8] px-4 py-4 space-y-4">
          <p className="text-base font-semibold text-[#1D1D1D]">{BRAND.program.name}</p>

          {!enrolled ? (
            <div className="space-y-3">
              <p className="text-sm text-[#6F7276]">
                The patient has commercial coverage and may qualify for the copay program. Enroll them here. They do not need to do anything.
              </p>
              {onEnroll && (enrolling ? (
                <div className="space-y-2 max-w-sm" aria-live="polite">
                  <p className="text-sm text-[#1D1D1D] flex items-center gap-2"><Loader2 size={16} className="animate-spin text-[#007178]" /> Enrolling in the copay program...</p>
                  <div className="h-2 rounded-full bg-[#E8E8E8] overflow-hidden">
                    <div className="h-full bg-[#007178] copay-enroll-bar" style={{ animation: `copay-enroll ${ENROLL_MS}ms linear forwards` }} />
                  </div>
                  <style>{`@keyframes copay-enroll { from { width: 0% } to { width: 100% } }`}</style>
                </div>
              ) : (
                <button type="button" onClick={() => setEnrolling(true)} className="bg-[#007178] text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-[#03656B]">
                  Enroll in copay
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-[#6F7276] flex items-center gap-1.5">
                Status: <strong className="text-[#007178]">Active</strong> <CheckCircle2 size={14} className="text-[#007178]" />
              </p>

              <CopayCardArt />

              <div className="text-sm text-[#1D1D1D] space-y-1">
                <p>Current benefit period: <strong>{benefitPeriod()}</strong></p>
                <p>Year to date spend on card: <strong>{money(spend)}</strong></p>
              </div>

              <div>
                <p className="text-sm text-[#6F7276] mb-1">Transactions</p>
                {transactions.length === 0 ? (
                  <p className="text-sm text-[#999]">No transactions yet.</p>
                ) : (
                  <ul className="divide-y divide-[#F0F0F0]">
                    {transactions.map((t) => (
                      <li key={t.id} className="py-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-sm">
                        <span><span className="text-[#6F7276]">Benefit type: </span>{t.benefitType}</span>
                        <span><span className="text-[#6F7276]">Amount: </span>{t.amount === null ? "Pending" : money(t.amount)}</span>
                        <span><span className="text-[#6F7276]">Status: </span>{t.status}</span>
                        <span><span className="text-[#6F7276]">Service date: </span>{t.serviceDate}</span>
                        {t.denialReason && <span className="col-span-2 sm:col-span-4 text-xs text-[#D02B20]">{t.denialReason}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
