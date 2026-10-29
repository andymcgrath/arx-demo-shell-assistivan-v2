/**
 * PAP transfer: the `no_coverage_pap` exit of the `bi` fork. Neither benefit covers it, so CoAssist refers the case to
 * the manufacturer's patient support program and texts the patient. The income application that follows is the
 * `income_qualification` module. This module never knows about it (CLAUDE.md rule 5).
 *
 * Needs: a completed BI whose exit is `no_coverage_pap`. Sets: `papTransferStatus` and the transfer text.
 * Triggers: the referral is a `system` step. `spine.complete_bi` fires it, and the same precondition holds if an
 * agent were to click it instead.
 */
import type { WorkflowData } from "@/engine/types";
import { exitFor } from "@/engine/workflow/forks";
import type { RuleScope } from "@/engine/workflow/types";
import { biForkFor } from "../forks";
import type { CoaRule } from "./shared";

/** The module is in the recipe, and the scenario's `bi` fork has the free drug program exit. */
export const PAP_TRANSFER_SCOPE: RuleScope[] = [{ module: "pap_transfer" }, { fork: "bi", exit: "no_coverage_pap" }];

/** BI is back and the story picked the free drug program exit. */
export const papTransferChosen = (d: WorkflowData) => d.biStatus === "complete" && exitFor(biForkFor(d.flowType), d).id === "no_coverage_pap";

export const PAP_TRANSFER_RULES: CoaRule[] = [
  {
    id: "pap_transfer.refer",
    on: "REFER_TO_PSP", // trigger: system
    scope: PAP_TRANSFER_SCOPE,
    when: (d) => papTransferChosen(d) && d.papTransferStatus === "none",
    set: () => ({ papTransferStatus: "referred", papTransferSmsSent: true }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "pap_transfer.verify_sms",
    on: "VERIFY_PAP_TRANSFER_SMS",
    scope: PAP_TRANSFER_SCOPE,
    when: (d) => d.papTransferSmsSent && !d.papTransferSmsVerified,
    set: () => ({ papTransferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
];
