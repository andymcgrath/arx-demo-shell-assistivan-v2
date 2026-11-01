import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";

/** Enrollment Assistance. The variants differ only in what the pending line says about how the patient was reached. */
const ea = (pending: string) => (d: WorkflowData): Stage =>
  d.consentStatus !== "confirmed"
    ? { id: "EA-14272", name: "Enrollment Assistance", statusLabel: "Pending", statusDetail: pending, isComplete: false, isNotStarted: false, fields: [], lastUpdated: dateFromToday(-4).toLocaleDateString(), lastUpdatedAgo: "4 days ago" }
    : { id: "EA-14272", name: "Enrollment Assistance", statusLabel: "Complete", statusDetail: "Enrollment Completed", isComplete: true, isNotStarted: false, fields: [], lastUpdated: dateFromToday(-4).toLocaleDateString(), lastUpdatedAgo: "4 days ago" };

export const EA_BUILDERS = {
  default: ea("Awaiting patient consent"),
  /** iAssist: the HCP's office starts the case and the patient gets a welcome message. */
  welcome_message: ea("Welcome message sent"),
  /** CoAssist DTP, Copay and Coverage: the SMS goes out on its own. */
  sms_consent: ea("SMS sent — awaiting patient consent"),
};
