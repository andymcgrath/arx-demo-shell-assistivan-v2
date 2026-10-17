import type { FlowType } from "@/engine/types";
import { COASSIST_FLOWS } from "./coassist/scenarios";

/**
 * Flows whose machine owns the automation: it starts BI and the PA itself and
 * times the reveals. The CRM reports what the agent is looking at and nothing
 * else. Flows not listed still use the timers in portals/crm/pages/Index.tsx.
 * Delete the CRM timers once the last workflow is listed here.
 */
const FACTORY_FLOWS: FlowType[] = [...COASSIST_FLOWS];

export const machineOwnsAutomation = (flowType: FlowType): boolean => FACTORY_FLOWS.includes(flowType);
