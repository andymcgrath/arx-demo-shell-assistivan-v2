import type { FlowType } from "@/engine/types";
import { personaFor } from "@/workflows/persona";

/** The case patient's first name, from the flow's persona. The CRM copy that names the patient reads it here. */
export const patientFirstNameFor = (flowType: FlowType): string => personaFor(flowType).patientName.split(" ")[0];
