/** PAP transfer screens and route rules: the wait for the referral, then the transfer text. */
import type { Screen } from "@/engine/workflow/screens";
import { PAP_TRANSFER_SCOPE } from "../pap_transfer";
import { assignedWithoutPa } from "../shared";
import type { CoaRoute } from "../slots";

/** The PES site has its own pages and its own text (`screens/hcp_patient.ts`). */
const NOT_PES_SITE = { not: { module: "enrollment", props: { variant: "hcp_patient" } } } as const;

export const PAP_TRANSFER_SCREENS: Screen[] = [{ path: "/pap-transfer-sms", label: "Transfer SMS", group: "Patient support program", scope: [...PAP_TRANSFER_SCOPE, NOT_PES_SITE] }];

export const PAP_TRANSFER_ROUTES: CoaRoute[] = [
  // Home until the referral goes out, then the text. After the tap the income screens take over.
  { id: "pap_transfer.waiting", slot: "transfer", path: "/", scope: [...PAP_TRANSFER_SCOPE, NOT_PES_SITE], when: (d) => assignedWithoutPa(d) && d.papTransferStatus === "none" },
  { id: "pap_transfer.sms", slot: "transfer", path: "/pap-transfer-sms", scope: [...PAP_TRANSFER_SCOPE, NOT_PES_SITE], when: (d) => d.papTransferSmsSent && !d.papTransferSmsVerified },
];
