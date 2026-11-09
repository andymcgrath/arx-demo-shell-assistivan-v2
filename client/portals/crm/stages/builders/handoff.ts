import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";

/**
 * Handoff to the client's CRM (the `crm_handoff` block). The system sends the case data once the assigned pharmacy accepts
 * the Rx. The stage lists what went over. The text says "the client's CRM", so the recorded stage fixtures do not change with the brand.
 */

const ID = "HO-14290";
const NAME = "CRM Handoff";

const standard = (d: WorkflowData): Stage => {
  if (d.crmHandoffStatus !== "sent") {
    return { id: ID, name: NAME, statusLabel: "Stage not started", statusDetail: `Waiting for the pharmacy to accept the Rx before the case goes to the client's CRM`, isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null };
  }
  return {
    id: ID,
    name: NAME,
    statusLabel: "Sent",
    statusDetail: `Case data handed to the client's CRM`,
    isComplete: true,
    isNotStarted: false,
    fields: [
      { label: "Destination", value: "Client CRM" },
      { label: "Sent", value: "Patient, prescriber, Rx, benefit result, PA decision" },
      { label: "Dispensing pharmacy", value: d.selectedPharmacy?.name ?? null },
      { label: "PA decision", value: d.paStatus === "approved" ? "Approved" : d.paStatus === "denied" ? "Denied" : null },
    ],
    lastUpdated: dateFromToday(0).toLocaleDateString(),
    lastUpdatedAgo: "just now",
  };
};

export const HANDOFF_BUILDERS = { standard };
