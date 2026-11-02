import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";

/**
 * Appeals. Only the iAssist appeal scenario files a real appeal. In every other scenario `appealStatus` stays `none`,
 * so this shows "Not needed" once the PA is approved and "not started" otherwise. Opening the stage while the appeal is
 * filed is the machine's payer-response timer (the stage's `signal`).
 */

const ID = "A-14275";
const NAME = "Appeals";
const FIELDS = [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }];

const standard = (d: WorkflowData): Stage =>
  d.paStatus === "approved"
    ? { id: ID, name: NAME, statusLabel: "Not needed", statusDetail: "PA Approved", isComplete: true, isNotStarted: false, fields: FIELDS.map((f) => ({ ...f })), lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.appealStatus === "approved"
    ? { id: ID, name: NAME, statusLabel: "Approved", statusDetail: "Appeal approved — payer overturned the denial", isComplete: true, isNotStarted: false, fields: FIELDS.map((f) => ({ ...f })), lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.appealStatus === "initiated"
    ? { id: ID, name: NAME, statusLabel: "Filed", statusDetail: "Appeal submitted — awaiting payer response", isComplete: true, isNotStarted: false, fields: FIELDS.map((f) => ({ ...f })), lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: FIELDS.map((f) => ({ ...f })), lastUpdated: null, lastUpdatedAgo: null };

export const APPEAL_BUILDERS = { standard };
