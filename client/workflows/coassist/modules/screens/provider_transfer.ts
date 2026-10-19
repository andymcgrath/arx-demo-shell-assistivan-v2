/** Provider transfer: medical benefit covered, so the Rx goes to the provider. */
import type { Screen } from "@/engine/workflow/screens";
import type { CoaRoute } from "../slots";

const SCOPE = { module: "provider_transfer" } as const;

export const PROVIDER_TRANSFER_SCREENS: Screen[] = [
  { path: "/provider-transfer-sms", label: "Transfer SMS", group: "Provider transfer", scope: SCOPE },
  { path: "/provider-transfer", label: "Provider Transfer", group: "Provider transfer", scope: SCOPE, sticky: true },
];

export const PROVIDER_TRANSFER_ROUTES: CoaRoute[] = [
  // Medical benefit covered always wins.
  { id: "provider_transfer.coverage_waiting", slot: "transfer", path: "/", scope: SCOPE, when: (d) => d.medicalBenefitStatus === "covered" && d.providerTransferStatus !== "notified" },
  { id: "provider_transfer.coverage_sms", slot: "transfer", path: "/provider-transfer-sms", scope: SCOPE, when: (d) => d.medicalBenefitStatus === "covered" && !d.providerTransferSmsVerified },
  { id: "provider_transfer.coverage_transfer", slot: "transfer", path: "/provider-transfer", scope: SCOPE, when: (d) => d.medicalBenefitStatus === "covered" },
];
