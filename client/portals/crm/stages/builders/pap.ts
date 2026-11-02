import type { WorkflowData } from "@/engine/types";
import { BRAND } from "@/brand";
import { dateFromToday } from "@/lib/relativeDate";
import { pspStages } from "../../pspStages";
import type { Stage } from "../types";

/** PAP Enrollment (Fax PAP and PrES PAP): the stage that follows a BI with no insurance. */
const pap = (d: WorkflowData): Stage =>
  d.papStatus === "none"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Pending", statusDetail: "Awaiting income verification", isComplete: false, isNotStarted: true, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: null }], lastUpdated: null, lastUpdatedAgo: null }
    : d.papStatus === "active"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Complete", statusDetail: "Patient enrolled — Free Goods approved", isComplete: true, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: "Verified" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.papStatus === "audit_pending"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Audit Pending", statusDetail: "Insurance audit initiated", isComplete: false, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: "Verified" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Discontinued", statusDetail: "Patient has insurance — PAP discontinued", isComplete: false, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

export const PAP_BUILDERS = { standard: pap };

/** Patient Support Program Referral (CoAssist PAP). The text lives in pspStages.ts. */
export const PSP_BUILDERS = {
  standard: (d: WorkflowData): Stage => pspStages(d, BRAND.program.name)[1],
};
