/**
 * Provider transfer: DME with the medical benefit covered transfers to an outside provider.
 */
import type { CoaRule } from "./shared";
import { REVEAL_MS } from "./shared";

export const PROVIDER_TRANSFER_RULES: CoaRule[] = [
  {
    id: "provider_transfer.view_stage",
    on: "VIEW_STAGE",
    snapshot: false,
    scenarios: ["CoA_DME"],
    when: (d, e) => e.stage === "DME_TRANSFER" && d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus === "none",
    then: { trigger: "agent", id: "dme-transfer", after: REVEAL_MS, send: () => ({ type: "NOTIFY_PROVIDER_TRANSFER" }) },
  },
  { id: "provider_transfer.leave_stage", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "DME_TRANSFER", cancel: ["dme-transfer"] },
  {
    id: "provider_transfer.notify",
    on: "NOTIFY_PROVIDER_TRANSFER",
    scenarios: ["CoA_DME"],
    when: (d) => d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus === "none",
    set: () => ({ dmeProviderTransferStatus: "notified", dmeTransferSmsSent: true }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "provider_transfer.verify_sms",
    on: "VERIFY_DME_TRANSFER_SMS",
    scenarios: ["CoA_DME"],
    when: (d) => d.dmeTransferSmsSent && !d.dmeTransferSmsVerified,
    set: () => ({ dmeTransferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
];
