/** PAP transfer screens and route rules: the wait for the referral, then the transfer text. */
import type { Screen } from "@/engine/workflow/screens";
import { PAP_TRANSFER_SCOPE } from "../pap_transfer";
import type { CoaRoute } from "../slots";

export const PAP_TRANSFER_SCREENS: Screen[] = [{ path: "/pap-transfer-sms", label: "Transfer SMS", group: "Patient support program", scope: PAP_TRANSFER_SCOPE }];

export const PAP_TRANSFER_ROUTES: CoaRoute[] = [
  // Home until the referral goes out, then the text. After the tap the income screens take over.
  { id: "pap_transfer.waiting", slot: "transfer", path: "/", scope: PAP_TRANSFER_SCOPE, when: (d) => d.biStatus === "complete" && d.papTransferStatus === "none" },
  { id: "pap_transfer.sms", slot: "transfer", path: "/pap-transfer-sms", scope: PAP_TRANSFER_SCOPE, when: (d) => !d.papTransferSmsVerified },
];
