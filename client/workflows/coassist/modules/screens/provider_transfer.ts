/** Provider transfer: medical benefit covered, so the Rx goes to the DME provider. */
import type { Screen } from "@/engine/workflow/screens";
import type { CoaRoute } from "../slots";

const SCOPE = { module: "provider_transfer" } as const;

export const PROVIDER_TRANSFER_SCREENS: Screen[] = [
  { path: "/dme-transfer-sms", label: "Transfer SMS", group: "Provider transfer", scope: SCOPE },
  { path: "/dme-provider-transfer", label: "DME Provider Transfer", group: "Provider transfer", scope: SCOPE, sticky: true },
];

export const PROVIDER_TRANSFER_ROUTES: CoaRoute[] = [
  // Medical benefit covered always wins.
  { id: "provider_transfer.dme_waiting", slot: "transfer", path: "/", scope: SCOPE, when: (d) => d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus !== "notified" },
  { id: "provider_transfer.dme_sms", slot: "transfer", path: "/dme-transfer-sms", scope: SCOPE, when: (d) => d.medicalBenefitStatus === "covered" && !d.dmeTransferSmsVerified },
  { id: "provider_transfer.dme_transfer", slot: "transfer", path: "/dme-provider-transfer", scope: SCOPE, when: (d) => d.medicalBenefitStatus === "covered" },
];
