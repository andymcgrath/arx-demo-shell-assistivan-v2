import { useState, useMemo, useRef, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = "#00a5b4";
const C_GREAT  = "#42C442";
const C_GOOD   = "#BCD631";
const C_AVG    = "#FCBF3D";
const C_BELOW  = "#FA8B3D";
const C_POOR   = "#FF6262";
const C_NODATA = "#CCCCCC";
const LP_BG = "#f4f6f8";
const BDRY = "#e0e0e0";

// ─── Types ────────────────────────────────────────────────────────────────────
type PerfStatus = "great" | "good" | "average" | "below" | "poor" | "nodata";
type RightView = "overview" | "kpi" | "heatmap";
type TimeWindow = "1m" | "3m" | "6m" | "1y" | "all";
interface KpiCard { name: string; value: string | null; goal: string; status: PerfStatus; }
interface ImpItem { kpi: string; actual: string; goal: string; status: PerfStatus; }
interface TrendPoint { label: string; value: number; status: PerfStatus; volume: number; }
interface ANode { id: string; name: string; children?: ANode[]; }

// ─── Employees ────────────────────────────────────────────────────────────────
const EMPLOYEES = [
  "Cage, Luke", "Fisher, Olivia", "Hodges, Lily", "Johnson, Liz",
  "Jones, Jessica", "King, Amelia", "Mathis, Jake", "Murdock, Matt",
  "Murray, Adrian", "Patel, Rajesh", "Rand, Danny", "Rutherford, Adam",
];
const EMP_ORG = (e: string) =>
  ({ "Fisher, Olivia": "Refill Queue – MIDWEST", "Murdock, Matt": "Prior Auth Team – SOUTHWEST", "Hodges, Lily": "Customer Service – MIDWEST" }[e] ?? "Pharmacy Call Center – US");

// ─── KPI Card Data ────────────────────────────────────────────────────────────
const KPI_MAP: Record<string, KpiCard[]> = {
  "Cage, Luke": [
    { name: "Prescription Accuracy Rate",                  value: "97.2%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "9%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.58",  goal: "0.55%", status: "good" },
    { name: "Overall Call Quality Score",                  value: "86.1",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.9",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.4",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "13%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "9%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "11",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "96.8%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "96.4%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "93.8%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "98.7%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.6%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "90%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "88.5%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "5.2%",  goal: "8%",    status: "great" },
  ],
  "Fisher, Olivia": [
    { name: "Prescription Accuracy Rate",                  value: "98.2%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "8%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.58",  goal: "0.55",  status: "average" },
    { name: "Overall Call Quality Score",                  value: "87.4",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.8",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.2",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "12%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "8%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "12",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "97.1%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "96.8%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "94.3%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "100%",  goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "99.2%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "92%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "89.6%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "4.2%",  goal: "8%",    status: "great" },
  ],
  "Hodges, Lily": [
    { name: "Prescription Accuracy Rate",                  value: "96.8%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "11%",   goal: "10%",   status: "good" },
    { name: "Talk Ratio (Speech)",                         value: "0.62",  goal: "0.55",  status: "good" },
    { name: "Overall Call Quality Score",                  value: "84.2",  goal: "85",    status: "good" },
    { name: "Avg Handle Time (Refill)",                    value: "4.1",   goal: "4.0",   status: "good" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.6",   goal: "7.5",   status: "good" },
    { name: "% Hold Time",                                 value: "14%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "7%",    goal: "7%",    status: "good" },
    { name: "% Idle Time of Staffed Time",                 value: "10%",   goal: "10%",   status: "good" },
    { name: "Calls per Staffed Hour",                      value: "10",    goal: "10",    status: "good" },
    { name: "Insurance Verification Completed",           value: "95.8%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "95.3%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "91.2%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "97.1%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.4%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "88%",   goal: "88%",   status: "good" },
    { name: "First Call Resolution Rate",                 value: "85.6%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "7.8%",  goal: "8%",    status: "great" },
  ],
  "Johnson, Liz": [
    { name: "Prescription Accuracy Rate",                  value: "99.1%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "7%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.52",  goal: "0.55",  status: "great" },
    { name: "Overall Call Quality Score",                  value: "91.2",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.6",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "6.8",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "11%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "5%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "7%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "13",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "98.3%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "97.9%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "96.2%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "99.8%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "99.6%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "94%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "92.1%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "2.8%",  goal: "8%",    status: "great" },
  ],
  "Jones, Jessica": [
    { name: "Prescription Accuracy Rate",                  value: "97.5%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "9%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.60",  goal: "0.55",  status: "average" },
    { name: "Overall Call Quality Score",                  value: "86.7",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.9",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.3",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "12%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "8%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "11",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "96.8%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "96.2%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "93.8%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "99.1%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.7%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "90%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "88.3%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "5.2%",  goal: "8%",    status: "great" },
  ],
  "King, Amelia": [
    { name: "Prescription Accuracy Rate",                  value: "96.5%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "10%",   goal: "10%",   status: "good" },
    { name: "Talk Ratio (Speech)",                         value: "0.59",  goal: "0.55",  status: "good" },
    { name: "Overall Call Quality Score",                  value: "85.1",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.95",  goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.4",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "13%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "10%",   goal: "10%",   status: "good" },
    { name: "Calls per Staffed Hour",                      value: "11",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "96.2%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "95.7%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "92.4%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "97.8%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.2%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "89%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "86.8%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "6.1%",  goal: "8%",    status: "great" },
  ],
  "Mathis, Jake": [
    { name: "Prescription Accuracy Rate",                  value: "98.0%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "8%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.57",  goal: "0.55",  status: "average" },
    { name: "Overall Call Quality Score",                  value: "88.4",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.7",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.1",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "12%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "8%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "12",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "97.3%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "96.9%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "94.6%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "99.5%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "99.1%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "91%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "90.1%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "3.9%",  goal: "8%",    status: "great" },
  ],
  "Murdock, Matt": [
    { name: "Prescription Accuracy Rate",                  value: "95.2%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "11%",   goal: "10%",   status: "good" },
    { name: "Talk Ratio (Speech)",                         value: "0.64",  goal: "0.55",  status: "good" },
    { name: "Overall Call Quality Score",                  value: "85.8",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "4.0",   goal: "4.0",   status: "good" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.5",   goal: "7.5",   status: "good" },
    { name: "% Hold Time",                                 value: "14%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "7%",    goal: "7%",    status: "good" },
    { name: "% Idle Time of Staffed Time",                 value: "11%",   goal: "10%",   status: "good" },
    { name: "Calls per Staffed Hour",                      value: "10",    goal: "10",    status: "good" },
    { name: "Insurance Verification Completed",           value: "95.4%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "94.8%", goal: "95%",   status: "good" },
    { name: "Patient Instructions Documented",            value: "90.6%", goal: "90%",   status: "good" },
    { name: "Escalation Protocol Followed",               value: "96.2%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "97.8%", goal: "98%",   status: "good" },
    { name: "Patient Satisfaction Score",                 value: "87%",   goal: "88%",   status: "good" },
    { name: "First Call Resolution Rate",                 value: "84.3%", goal: "85%",   status: "good" },
    { name: "Call Escalation Rate",                       value: "8.2%",  goal: "8%",    status: "good" },
  ],
  "Murray, Adrian": [
    { name: "Prescription Accuracy Rate",                  value: "96.9%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "9%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.59",  goal: "0.55",  status: "average" },
    { name: "Overall Call Quality Score",                  value: "85.9",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.8",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.2",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "12%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "8%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "11",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "96.2%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "95.6%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "92.9%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "98.4%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.5%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "89%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "87.4%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "5.1%",  goal: "8%",    status: "great" },
  ],
  "Patel, Rajesh": [
    { name: "Prescription Accuracy Rate",                  value: "99.3%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "7%",    goal: "10%",   status: "great" },
    { name: "Talk Ratio (Speech)",                         value: "0.50",  goal: "0.55",  status: "great" },
    { name: "Overall Call Quality Score",                  value: "94.6",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "3.5",   goal: "4.0",   status: "great" },
    { name: "Avg Handle Time (Prior Auth)",                value: "6.6",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "10%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "5%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "6%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "14",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "98.9%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "98.5%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "97.1%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "99.9%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "99.8%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "96%",   goal: "88%",   status: "great" },
    { name: "First Call Resolution Rate",                 value: "94.3%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "1.5%",  goal: "8%",    status: "great" },
  ],
  "Rand, Danny": [
    { name: "Prescription Accuracy Rate",                  value: "96.4%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "10%",   goal: "10%",   status: "good" },
    { name: "Talk Ratio (Speech)",                         value: "0.61",  goal: "0.55",  status: "good" },
    { name: "Overall Call Quality Score",                  value: "85.3",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "4.0",   goal: "4.0",   status: "good" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.5",   goal: "7.5",   status: "good" },
    { name: "% Hold Time",                                 value: "13%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "6%",    goal: "7%",    status: "great" },
    { name: "% Idle Time of Staffed Time",                 value: "9%",    goal: "10%",   status: "great" },
    { name: "Calls per Staffed Hour",                      value: "11",    goal: "10",    status: "great" },
    { name: "Insurance Verification Completed",           value: "95.9%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "95.3%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "91.6%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "97.9%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.1%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "88%",   goal: "88%",   status: "good" },
    { name: "First Call Resolution Rate",                 value: "85.8%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "7.1%",  goal: "8%",    status: "great" },
  ],
  "Rutherford, Adam": [
    { name: "Prescription Accuracy Rate",                  value: "96.2%", goal: "95%",   status: "great" },
    { name: "Silence Time (Speech)",                       value: "10%",   goal: "10%",   status: "good" },
    { name: "Talk Ratio (Speech)",                         value: "0.60",  goal: "0.55",  status: "good" },
    { name: "Overall Call Quality Score",                  value: "85.0",  goal: "85",    status: "great" },
    { name: "Avg Handle Time (Refill)",                    value: "4.0",   goal: "4.0",   status: "good" },
    { name: "Avg Handle Time (Prior Auth)",                value: "7.4",   goal: "7.5",   status: "great" },
    { name: "% Hold Time",                                 value: "13%",   goal: "15%",   status: "great" },
    { name: "% After-Call Work Time",                      value: "7%",    goal: "7%",    status: "good" },
    { name: "% Idle Time of Staffed Time",                 value: "10%",   goal: "10%",   status: "good" },
    { name: "Calls per Staffed Hour",                      value: "10",    goal: "10",    status: "good" },
    { name: "Insurance Verification Completed",           value: "96.1%", goal: "95%",   status: "great" },
    { name: "Drug Interaction Check Performed",           value: "95.4%", goal: "95%",   status: "great" },
    { name: "Patient Instructions Documented",            value: "91.3%", goal: "90%",   status: "great" },
    { name: "Escalation Protocol Followed",               value: "97.6%", goal: "95%",   status: "great" },
    { name: "HIPAA Compliance Verified",                  value: "98.0%", goal: "98%",   status: "great" },
    { name: "Patient Satisfaction Score",                 value: "88%",   goal: "88%",   status: "good" },
    { name: "First Call Resolution Rate",                 value: "85.4%", goal: "85%",   status: "great" },
    { name: "Call Escalation Rate",                       value: "7.4%",  goal: "8%",    status: "great" },
  ],
};
function getKpis(emp: string): KpiCard[] {
  if (KPI_MAP[emp]) return KPI_MAP[emp];
  const h = emp.charCodeAt(0) + emp.charCodeAt(emp.length - 1);
  const s: PerfStatus[] = ["great", "average", "poor"];
  return [
    { name: "Quality Score", value: `${(h % 40 + 40).toFixed(1)}%`, goal: "85.0%", status: s[h % 3] },
    { name: "Call Handling", value: `${(h % 30 + 55).toFixed(1)}%`, goal: "70.0%", status: s[(h + 1) % 3] },
    { name: "Employee AHT", value: `${h % 100 + 200}`, goal: "120", status: "poor" as PerfStatus },
    { name: "Schedule Adherence", value: `${h % 20 + 70}%`, goal: "90%", status: s[(h + 2) % 3] },
    { name: "Occupancy", value: `${h % 30 + 60}%`, goal: "80%", status: s[h % 3] },
  ];
}

// ─── Improvement Opportunities ────────────────────────────────────────────────
function getImps(emp: string): ImpItem[] {
  return getKpis(emp)
    .filter(k => k.status === "below" || k.status === "poor")
    .map(k => ({ kpi: k.name, actual: k.value ?? "—", goal: k.goal, status: k.status }));
}

// ─── Accordion Tree ───────────────────────────────────────────────────────────
const ACCORDION: ANode[] = [
  { id: "chb", name: "Call Handling", children: [
    { id: "esl",  name: "Prescription Accuracy Rate" },
    { id: "sil",  name: "Silence Time (Speech)" },
    { id: "tr",   name: "Talk Ratio (Speech)" },
    { id: "tqs",  name: "Overall Call Quality Score" },
  ]},
  { id: "prod", name: "Productivity", children: [
    { id: "ahold", name: "Avg Handle Time (Refill)" },
    { id: "awrap", name: "Avg Handle Time (Prior Auth)" },
    { id: "phold", name: "% Hold Time" },
    { id: "pwrap", name: "% After-Call Work Time" },
    { id: "pidle", name: "% Idle Time of Staffed Time" },
    { id: "cph",   name: "Calls per Staffed Hour" },
  ]},
  { id: "qb", name: "Compliance & Safety", children: [
    { id: "abc",  name: "Insurance Verification Completed" },
    { id: "abph", name: "Drug Interaction Check Performed" },
    { id: "abt",  name: "Patient Instructions Documented" },
    { id: "ac",   name: "Escalation Protocol Followed" },
    { id: "idt",  name: "HIPAA Compliance Verified" },
    { id: "pss",  name: "Patient Satisfaction Score" },
    { id: "tbph", name: "First Call Resolution Rate" },
    { id: "taph", name: "Call Escalation Rate" },
  ]},
];

// ─── Trend Data ───────────────────────────────────────────────────────────────
function makeTrend(base: number, goalPct: number): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const WEEKS = 260; // 5 years
  return Array.from({ length: WEEKS }, (_, i) => {
    const noise = Math.sin(i * 0.5) * 12 + Math.cos(i * 1.2) * 5;
    const v = Math.max(2, Math.min(98, base + noise));
    const value = parseFloat(v.toFixed(1));
    const volume = Math.round(100 + Math.sin(i * 0.4) * 28 + Math.cos(i * 0.9) * 14);
    const d = new Date(today);
    d.setDate(d.getDate() - (WEEKS - 1 - i) * 7);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
      value,
      volume,
      status: (value >= goalPct * 1.2 ? "great" : value >= goalPct ? "good" : value >= goalPct * 0.8 ? "average" : value >= goalPct * 0.6 ? "below" : "poor") as PerfStatus,
    };
  });
}
function getTrend(kpi: KpiCard): TrendPoint[] {
  const goalNum = parseFloat(kpi.goal.replace(/[^0-9.]/g, "")) || 50;
  const bases: Record<PerfStatus, number> = { great: goalNum + 18, good: goalNum + 8, average: goalNum - 5, below: goalNum - 15, poor: goalNum - 25, nodata: goalNum - 30 };
  const h = kpi.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10;
  return makeTrend(bases[kpi.status] + h - 5, goalNum);
}
function filterTrendByDates(data: TrendPoint[], from: string, to: string): TrendPoint[] {
  if (!from && !to) return data;
  const fromMs = from ? new Date(from).getTime() : 0;
  const toMs   = to   ? new Date(to).getTime()   : Infinity;
  return data.filter(d => {
    const [m, day, y] = d.label.split("/");
    const ms = new Date(`${y}-${m.padStart(2,"0")}-${day.padStart(2,"0")}`).getTime();
    return ms >= fromMs && ms <= toMs;
  });
}
function windowToFrom(w: TimeWindow, toISO: string): string {
  const to = new Date(toISO);
  if (w === "1m") { to.setMonth(to.getMonth() - 1); }
  else if (w === "3m") { to.setMonth(to.getMonth() - 3); }
  else if (w === "6m") { to.setMonth(to.getMonth() - 6); }
  else if (w === "1y") { to.setFullYear(to.getFullYear() - 1); }
  else return ""; // "all" — return empty to signal show everything
  return to.toISOString().slice(0, 10);
}
function guessWindow(from: string, to: string): TimeWindow {
  if (!from) return "all";
  const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
  if (days <= 35) return "1m";
  if (days <= 100) return "3m";
  if (days <= 200) return "6m";
  if (days <= 380) return "1y";
  return "all";
}

// ─── Heat Map Data ────────────────────────────────────────────────────────────
const HM_COLS = ["Cage Luke","Fisher Olivia","Hodges Lily","Johnson Liz","Jones Jessica","King Amelia","Mathis Jake","Murdock Matt","Murray Adrian","Patel Rajesh","Rand Danny","Rutherford Adam"];
interface HmRow { id: string; name: string; level: number; expandable?: boolean; parentId?: string; cells: PerfStatus[]; }
const HM_ROWS: HmRow[] = [
  // cells order: Cage, Fisher, Hodges, Johnson, Jones, King, Mathis, Murdock, Murray, Patel, Rand, Rutherford
  { id: "r1",  name: "Call Handling",                          level: 0, expandable: true, cells: ["average","great","good","great","average","average","good","poor","average","great","great","average"] },
  { id: "r1a", name: "Effective Sales Language",               level: 1, parentId: "r1",   cells: ["average","great","good","great","average","average","good","below","average","great","great","average"] },
  { id: "r1b", name: "Silence Time (Speech)",                  level: 1, parentId: "r1",   cells: ["poor","average","below","great","poor","average","good","poor","average","great","average","average"] },
  { id: "r1c", name: "Talk Ratio (Speech)",                    level: 1, parentId: "r1",   cells: ["average","average","below","good","average","average","good","poor","average","great","good","average"] },
  { id: "r1d", name: "Total Quality Score (Speech)",           level: 1, parentId: "r1",   cells: ["poor","below","poor","great","poor","average","good","poor","average","great","average","below"] },
  { id: "r2",  name: "Productivity",                           level: 0, expandable: true, cells: ["average","good","average","great","good","average","great","poor","average","great","great","average"] },
  { id: "r2a", name: "Avg Hold Time",                          level: 1, parentId: "r2",   cells: ["great","average","average","great","great","average","great","poor","great","great","great","average"] },
  { id: "r2b", name: "Avg Wrap Time",                          level: 1, parentId: "r2",   cells: ["average","average","average","great","average","average","great","poor","average","great","average","average"] },
  { id: "r2c", name: "% Hold Time",                            level: 1, parentId: "r2",   cells: ["great","average","great","great","great","good","great","poor","great","great","great","good"] },
  { id: "r2d", name: "% Wrap Up Time",                         level: 1, parentId: "r2",   cells: ["average","below","below","good","average","below","good","poor","average","great","average","average"] },
  { id: "r2e", name: "% Idle Time of Staffed Time",            level: 1, parentId: "r2",   cells: ["poor","poor","below","average","poor","average","good","poor","average","great","average","below"] },
  { id: "r2f", name: "Calls per Staffed Hour",                 level: 1, parentId: "r2",   cells: ["great","average","great","great","good","average","great","poor","average","great","average","average"] },
  { id: "r3",  name: "Quality Bot",                            level: 0, expandable: true, cells: ["average","great","great","great","average","average","great","below","average","great","good","average"] },
  { id: "r3a", name: "Advised before conferencing",            level: 1, parentId: "r3",   cells: ["average","below","great","great","average","average","great","below","average","great","average","average"] },
  { id: "r3b", name: "Advised before placing on hold",         level: 1, parentId: "r3",   cells: ["great","great","good","great","great","good","great","below","great","great","great","good"] },
  { id: "r3c", name: "Advised before transferring",            level: 1, parentId: "r3",   cells: ["average","average","average","great","average","average","good","below","average","great","average","average"] },
  { id: "r3d", name: "Authenticated Caller",                   level: 1, parentId: "r3",   cells: ["great","poor","average","great","great","average","great","average","great","great","great","good"] },
  { id: "r3e", name: "Identified themselves",                  level: 1, parentId: "r3",   cells: ["nodata","nodata","great","great","nodata","average","great","below","nodata","great","great","average"] },
  { id: "r3f", name: "Promoted Self-service options",          level: 1, parentId: "r3",   cells: ["average","below","average","great","below","average","good","poor","average","great","average","below"] },
  { id: "r3g", name: "Thanked before placing on hold",         level: 1, parentId: "r3",   cells: ["great","great","great","great","great","good","great","average","great","great","great","great"] },
  { id: "r3h", name: "Thanked after placing on hold",          level: 1, parentId: "r3",   cells: ["great","great","great","great","average","good","great","below","great","great","great","great"] },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
function statusBg(s: PerfStatus) {
  if (s === "great")   return C_GREAT;
  if (s === "good")    return C_GOOD;
  if (s === "average") return C_AVG;
  if (s === "below")   return C_BELOW;
  if (s === "poor")    return C_POOR;
  return C_NODATA;
}
function statusDot(s: PerfStatus) {
  const bg = statusBg(s);
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: bg, flexShrink: 0 }} />;
}
function cellIcon(s: PerfStatus) {
  if (s === "great" || s === "good") return <span style={{ color: "#fff", fontWeight: 700 }}>✓</span>;
  if (s === "nodata") return <span style={{ color: "#888" }}>—</span>;
  if (s === "poor") return <span style={{ color: "#fff", fontWeight: 700 }}>✕</span>;
  return <span style={{ color: "#fff", fontWeight: 700 }}>≈</span>;
}

// ─── Mini Icons ───────────────────────────────────────────────────────────────
const Ico = {
  Grid:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  List:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  HeatMap:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>,
  Search:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Cal:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ChevD:    () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevR:    () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>,
  Info:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  X:        () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Settings: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Filter:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  BarChart: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Table:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 21V9"/></svg>,
};

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHdr({ label, extra }: { label: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: `1px solid ${BDRY}` }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", color: "#444", textTransform: "uppercase" }}>{label}</span>
      {extra && <div className="flex items-center gap-1">{extra}</div>}
    </div>
  );
}

// ─── Dual Range Slider ────────────────────────────────────────────────────────
function DualRangeSlider({
  min, max, start, end, onChange,
}: {
  min: number; max: number; start: number; end: number;
  onChange: (start: number, end: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "range" | null>(null);
  const lastClientX = useRef(0);
  const startRef = useRef(start);
  const endRef = useRef(end);
  const onChangeRef = useRef(onChange);
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { endRef.current = end; }, [end]);
  useEffect(() => { onChangeRef.current = onChange; });

  const pct = (v: number) => max > min ? ((v - min) / (max - min)) * 100 : 0;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.round(min + p * (max - min));
      const s = startRef.current, en = endRef.current;
      if (dragging.current === "start") {
        onChangeRef.current(Math.max(min, Math.min(v, en - 1)), en);
      } else if (dragging.current === "end") {
        onChangeRef.current(s, Math.max(s + 1, Math.min(v, max)));
      } else {
        const dx = e.clientX - lastClientX.current;
        lastClientX.current = e.clientX;
        const step = Math.round((dx / rect.width) * (max - min));
        const span = en - s;
        const ns = Math.max(min, Math.min(s + step, max - span));
        onChangeRef.current(ns, ns + span);
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [min, max]);

  const sp = pct(start), ep = pct(end);
  return (
    <div ref={trackRef} style={{ position: "relative", height: 16, userSelect: "none", marginTop: 2 }}>
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, background: "#e5e7eb", borderRadius: 2, transform: "translateY(-50%)" }} />
      <div
        style={{ position: "absolute", top: "50%", left: `${sp}%`, width: `${ep - sp}%`, height: 4, background: TEAL, opacity: 0.45, borderRadius: 2, transform: "translateY(-50%)", cursor: "grab" }}
        onMouseDown={e => { dragging.current = "range"; lastClientX.current = e.clientX; e.preventDefault(); }}
      />
      {([{ p: sp, t: "start" }, { p: ep, t: "end" }] as { p: number; t: "start" | "end" }[]).map(({ p, t }) => (
        <div key={t}
          style={{ position: "absolute", top: "50%", left: `${p}%`, width: 13, height: 13, background: "#fff", border: `2px solid ${TEAL}`, borderRadius: "50%", transform: "translate(-50%, -50%)", cursor: "ew-resize", zIndex: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
          onMouseDown={e => { dragging.current = t; e.preventDefault(); }}
        />
      ))}
    </div>
  );
}

// ─── SVG KPI Trend Chart ──────────────────────────────────────────────────────
const YEAR_WEEKS = 52;
function KpiTrendChart({ data, goalPct }: { data: TrendPoint[]; goalPct: number }) {
  // Default to last 52 weeks (1 year); today is always the right boundary
  const [sliderStart, setSliderStart] = useState(() => Math.max(0, data.length - YEAR_WEEKS));
  const [sliderEnd, setSliderEnd] = useState(Math.max(0, data.length - 1));
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  useEffect(() => {
    setSliderStart(Math.max(0, data.length - YEAR_WEEKS));
    setSliderEnd(Math.max(0, data.length - 1));
    setSelectedBar(null);
  }, [data.length]);

  if (!data.length) return (
    <div style={{ padding: "20px 0", color: "#999", fontSize: 12, textAlign: "center" }}>No data in selected range</div>
  );

  const s = Math.min(sliderStart, data.length - 1);
  const e = Math.max(s, Math.min(sliderEnd, data.length - 1));
  const visible = data.slice(s, e + 1);

  // Chart dimensions — SVG uses width:100%/height:auto so it scales with the container
  const VW = 800, VH = 320;
  const ML = 50, MR = 56, MT = 16, MB = 24;
  const pw = VW - ML - MR, ph = VH - MT - MB;
  const yScale = (v: number) => ph - (v / 100) * ph;
  const n = visible.length || 1;
  const slotW = pw / n;
  const barW = Math.max(2, slotW - 1.5);
  const xBar = (i: number) => i * slotW + (slotW - barW) / 2;
  const xMid = (i: number) => i * slotW + slotW / 2;

  const maxVol = Math.max(...visible.map(d => d.volume ?? 0), 1);
  const volY = (v: number) => ph - (v / maxVol) * ph * 0.58;

  const monthLabels: { i: number; label: string }[] = [];
  const seenM = new Set<string>();
  visible.forEach((d, i) => {
    const [m, , y] = d.label.split("/");
    const k = `${y}-${m}`;
    if (!seenM.has(k)) { seenM.add(k); monthLabels.push({ i, label: `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m]} ${y?.slice(2)}` }); }
  });

  // Linear regression of quality score across visible window
  const nv = visible.length;
  const sumX = nv * (nv - 1) / 2;
  const sumX2 = (nv - 1) * nv * (2 * nv - 1) / 6;
  const sumY = visible.reduce((a, d) => a + d.value, 0);
  const sumXY = visible.reduce((a, d, i) => a + i * d.value, 0);
  const denom = nv * sumX2 - sumX * sumX || 1;
  const slope = (nv * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / nv;
  const trendPts = visible.map((_, i) => Math.max(0, Math.min(100, slope * i + intercept)));

  const NW = VW, NH = 36;
  const NML = ML, NMR = MR;
  const npw = NW - NML - NMR, nph = NH;
  const nd = data.length || 1;
  const nSW = npw / nd;
  const nBarH = (v: number) => Math.max(1, (v / 100) * nph);
  const sliderSP = s / (data.length - 1 || 1);
  const sliderEP = (e + 1) / (data.length || 1);

  // Clamp goal label so it doesn't overflow top or bottom
  const goalLabelY = Math.max(10, Math.min(ph - 4, yScale(goalPct) + 4));

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <g transform={`translate(${ML},${MT})`}>
          {[0, 25, 50, 75, 100].map(t => (
            <g key={t}>
              <line x1={0} y1={yScale(t)} x2={pw} y2={yScale(t)} stroke={t === 0 ? "#d1d5db" : "#f0f0f0"} />
              <text x={-6} y={yScale(t) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{t}</text>
            </g>
          ))}
          {/* Goal line — solid blue */}
          <line x1={0} y1={yScale(goalPct)} x2={pw} y2={yScale(goalPct)} stroke="#2563eb" strokeWidth="2" />
          <text x={pw + 4} y={goalLabelY} fontSize="9" fill="#2563eb" fontWeight="700">Goal</text>
          {/* Bars: quality measure % colored by status */}
          {visible.map((d, i) => (
            <rect key={i} x={xBar(i)} y={yScale(d.value)} width={barW} height={ph - yScale(d.value)}
              fill={statusBg(d.status)}
              opacity={selectedBar === i ? 1 : hoveredBar === i ? 0.95 : 0.82}
              rx="1"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
              onClick={() => setSelectedBar(prev => prev === i ? null : i)}
            />
          ))}
          {/* Selected bar ring */}
          {selectedBar !== null && selectedBar < visible.length && (
            <rect
              x={xBar(selectedBar)} y={yScale(visible[selectedBar].value)}
              width={barW} height={ph - yScale(visible[selectedBar].value)}
              fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" rx="1"
              style={{ pointerEvents: "none" }}
            />
          )}
          {/* Hover tooltip */}
          {hoveredBar !== null && (() => {
            const d = visible[hoveredBar];
            const cx = xMid(hoveredBar);
            const tipW = 96, tipH = 40;
            const tx = Math.max(0, Math.min(cx - tipW / 2, pw - tipW));
            const ty = Math.max(0, yScale(d.value) - tipH - 8);
            return (
              <g transform={`translate(${tx},${ty})`} style={{ pointerEvents: "none" }}>
                <rect width={tipW} height={tipH} rx="4" fill="rgba(15,23,42,0.88)" />
                <text x={8} y={14} fontSize="9" fill="rgba(255,255,255,0.7)">{d.label}</text>
                <text x={8} y={30} fontSize="13" fontWeight="800" fill="#fff">{d.value}%</text>
                <rect x={tipW - 14} y={4} width={10} height={10} rx="2" fill={statusBg(d.status)} />
              </g>
            );
          })()}
          {/* Call volume line */}
          {visible.length > 1 && (
            <polyline fill="none" stroke="#475569" strokeWidth="1.5"
              points={visible.map((d, i) => `${xMid(i)},${volY(d.volume ?? 0)}`).join(" ")} />
          )}
          {/* Trend line — dashed */}
          {visible.length > 1 && (
            <polyline fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6,3"
              points={trendPts.map((v, i) => `${xMid(i)},${yScale(v)}`).join(" ")} />
          )}
          {/* Month labels — sole occupant of bottom margin */}
          {monthLabels.map(({ i, label }) => (
            <text key={i} x={xMid(i)} y={ph + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
          ))}
          <line x1={0} y1={0} x2={0} y2={ph} stroke="#d1d5db" />
          <line x1={0} y1={ph} x2={pw} y2={ph} stroke="#d1d5db" />
        </g>
      </svg>

      {/* Navigator + range slider — full width, no chart-margin padding */}
      <div style={{ marginTop: 4 }}>
        <svg viewBox={`0 0 ${VW} ${NH}`} className="w-full" style={{ height: NH, display: "block" }}>
          {/* Y-axis label area (match chart margin) */}
          <g transform={`translate(${ML},0)`}>
            {/* Call volume line across full 5-year range */}
            {(() => {
              const maxV = Math.max(...data.map(d => d.volume ?? 0), 1);
              const navPW = pw;
              const navSW = navPW / (data.length || 1);
              const pts = data.map((d, i) => `${i * navSW + navSW / 2},${NH - (d.volume ?? 0) / maxV * NH * 0.85 + NH * 0.08}`).join(" ");
              return data.length > 1 ? <polyline fill="none" stroke="#94a3b8" strokeWidth="1" opacity={0.7} points={pts} /> : null;
            })()}
            {/* Selection overlay — proportional to selected range */}
            {(() => {
              const navPW = pw;
              const sp = s / (data.length - 1 || 1) * navPW;
              const ep = (e + 1) / (data.length || 1) * navPW;
              return (
                <>
                  {/* Dimmed unselected regions */}
                  <rect x={0} y={0} width={sp} height={NH} fill="rgba(255,255,255,0.6)" />
                  <rect x={ep} y={0} width={navPW - ep} height={NH} fill="rgba(255,255,255,0.6)" />
                  {/* Selection window */}
                  <rect x={sp} y={0} width={ep - sp} height={NH} fill={TEAL} opacity={0.12} />
                  <line x1={sp} y1={0} x2={sp} y2={NH} stroke={TEAL} strokeWidth={2} />
                  <line x1={ep} y1={0} x2={ep} y2={NH} stroke={TEAL} strokeWidth={2} />
                </>
              );
            })()}
          </g>
        </svg>
        <div style={{ paddingLeft: `${(ML / VW) * 100}%`, paddingRight: `${(MR / VW) * 100}%` }}>
          <DualRangeSlider
            min={0} max={Math.max(0, data.length - 1)}
            start={s} end={e}
            onChange={(ns, ne) => { setSliderStart(ns); setSliderEnd(ne); setSelectedBar(null); }}
          />
        </div>
      </div>

      {/* Legend — HTML, outside the SVG so nothing crowds the chart */}
      <div className="flex items-center gap-4 flex-wrap" style={{ paddingLeft: `${(ML / VW) * 100}%`, marginTop: 6, fontSize: 10, color: "#6b7280" }}>
        <span className="flex items-center gap-1">
          <span style={{ display: "inline-block", width: 10, height: 8, background: C_GREAT, opacity: 0.82, borderRadius: 1 }} />
          Actual Value
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#2563eb" strokeWidth="2" /></svg>
          Goal
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4,2" /></svg>
          Trend
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#475569" strokeWidth="1.5" /></svg>
          Call Volume
        </span>
      </div>
    </div>
  );
}

// ─── Date helpers ────────────────────────────────────────────────────────────
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtDisplay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}
function computeRange(period: string): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toISO(today);
  if (period === "Daily") return { from: to, to };
  if (period === "Monthly") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(first), to };
  }
  // Weekly default
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  return { from: toISO(weekStart), to };
}

// ─── LEFT PANEL ───────────────────────────────────────────────────────────────
function LeftPanel({
  selected, onSelect, onTimeChange,
}: {
  selected: string;
  onSelect: (e: string) => void;
  onTimeChange: (from: string, to: string, period: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Weekly");
  const _todayISO = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(() => windowToFrom("1y", _todayISO));
  const [toDate, setToDate] = useState(_todayISO);

  const filtered = EMPLOYEES.filter(e => e.toLowerCase().includes(search.toLowerCase()));

  const handlePeriod = (p: string) => {
    setPeriod(p);
    const { from, to } = computeRange(p);
    setFromDate(from);
    setToDate(to);
    onTimeChange(from, to, p);
  };
  const handleFrom = (v: string) => { setFromDate(v); onTimeChange(v, toDate, period); };
  const handleTo   = (v: string) => { setToDate(v);   onTimeChange(fromDate, v, period); };

  return (
    <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 200, background: LP_BG, borderRight: `1px solid ${BDRY}` }}>
      {/* TIME */}
      <SectionHdr label="Time" extra={<button style={{ fontSize: 10, color: "#888" }}>▭</button>} />
      <div className="px-3 py-2 space-y-2" style={{ borderBottom: `1px solid ${BDRY}` }}>
        <div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>Period</div>
          <select value={period} onChange={e => handlePeriod(e.target.value)}
            className="w-full rounded border text-xs px-1.5 py-1 outline-none"
            style={{ borderColor: BDRY, background: "#fff", color: "#333" }}>
            <option>Weekly</option><option>Daily</option><option>Monthly</option>
          </select>
        </div>
        {[
          { label: "From", val: fromDate, onChange: handleFrom },
          { label: "To",   val: toDate,   onChange: handleTo   },
        ].map(({ label, val, onChange }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>{label}</div>
            <div className="flex items-center gap-1 rounded border px-1.5 py-1" style={{ borderColor: BDRY, background: "#fff" }}>
              <input type="date" value={val} onChange={e => onChange(e.target.value)}
                className="flex-1 text-xs outline-none bg-transparent"
                style={{ color: "#333", border: "none", padding: 0, minWidth: 0 }} />
            </div>
          </div>
        ))}
      </div>

      {/* EMPLOYEES */}
      <SectionHdr label="Employees" extra={<button style={{ fontSize: 10, color: "#888" }}>▭</button>} />
      <div className="px-2 pt-2 pb-1 space-y-1.5" style={{ borderBottom: `1px solid ${BDRY}` }}>
        <div className="flex items-center gap-1 rounded border px-1.5 py-1" style={{ borderColor: BDRY, background: "#fff" }}>
          <Ico.Search />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." className="flex-1 text-xs outline-none bg-transparent" style={{ color: "#333" }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(emp => (
          <button key={emp} onClick={() => onSelect(emp)}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-blue-50"
            style={{
              background: selected === emp ? "#cce4f7" : "transparent",
              color: selected === emp ? "#0070d2" : "#333",
              borderBottom: `1px solid ${BDRY}`,
              fontWeight: selected === emp ? 600 : 400,
            }}>
            {emp}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MIDDLE PANEL (Employee card + Improvement Opportunities only) ─────────────
function MiddlePanel({ employee, onKpiSelect }: { employee: string; onKpiSelect: (kpi: KpiCard) => void }) {
  const [viewByScore, setViewByScore] = useState(true);
  const imps = getImps(employee);

  return (
    <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 220, background: "#fff", borderRight: `1px solid ${BDRY}` }}>
      {/* Employee Card */}
      <div className="px-3 py-2" style={{ borderBottom: `1px solid ${BDRY}` }}>
        <div className="flex items-start gap-2">
          <div className="flex items-center justify-center rounded flex-shrink-0" style={{ width: 42, height: 42, background: "#e8ecf0" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1a202c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{employee}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Organization: {EMP_ORG(employee)}</div>
            <div className="flex items-center gap-1 mt-1">
              {["Coaching", "eLearning"].map(l => (
                <span key={l} className="px-1.5 py-0.5 rounded-full" style={{ border: `1px solid ${TEAL}`, color: TEAL, fontSize: 9 }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Opportunities */}
      <SectionHdr label="Improvement Opportunities" extra={<Ico.Info />} />
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${BDRY}` }}>
        <span style={{ fontSize: 11, color: "#666" }}>View by</span>
        {["Score", "Trend"].map(v => (
          <label key={v} className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="viewby" checked={(v === "Score") === viewByScore} onChange={() => setViewByScore(v === "Score")} style={{ accentColor: TEAL }} />
            <span style={{ fontSize: 11, color: "#333" }}>{v}</span>
          </label>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {imps.length === 0 && (
          <div style={{ padding: "16px 12px", fontSize: 11, color: "#999", textAlign: "center" }}>No improvement areas identified.</div>
        )}
        {imps.map((item, i) => {
          const kpiCard: KpiCard = { name: item.kpi, value: item.actual, goal: item.goal, status: item.status };
          return (
            <button
              key={i}
              onClick={() => onKpiSelect(kpiCard)}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 transition-colors"
              style={{ borderBottom: "1px solid #f5f5f5", textAlign: "left" }}
            >
              <div className="flex items-center justify-center rounded flex-shrink-0" style={{ width: 26, height: 26, background: statusBg(item.status) }}>
                <span style={{ color: "#fff" }}><Ico.BarChart /></span>
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 11, fontWeight: 600, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.kpi}</div>
                <div style={{ fontSize: 10, color: "#888" }}>Actual: <b>{item.actual}</b> · Goal: {item.goal}</div>
              </div>
              <span style={{ color: "#bbb", flexShrink: 0 }}><Ico.ChevR /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── PERFORMANCE PANEL (Accordion — now its own column) ──────────────────────
function PerformancePanel({
  employee, selectedKpi, activeSection, onKpiSelect, onSectionClick,
}: {
  employee: string;
  selectedKpi: string | null;
  activeSection: string | null;
  onKpiSelect: (kpi: KpiCard) => void;
  onSectionClick: (children: ANode[], name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["chb", "prod", "qb"]));
  const kpis = getKpis(employee);

  const toggleNode = (id: string) =>
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  function renderNodes(nodes: ANode[], depth = 0): React.ReactNode {
    return nodes.map(node => {
      const isActiveKpi = selectedKpi === node.name;
      const isActiveSection = activeSection === node.name;
      const hasChildren = !!node.children?.length;
      const isOpen = expanded.has(node.id);
      const matchingKpi = kpis.find(k => k.name === node.name)
        ?? kpis.find(k => k.name.toLowerCase().includes(node.name.toLowerCase()));
      const st = matchingKpi?.status ?? "nodata";
      const isHighlighted = isActiveKpi || isActiveSection;
      return (
        <div key={node.id}>
          <div
            className="w-full flex items-center gap-1.5 transition-colors hover:bg-gray-50"
            style={{
              paddingLeft: 8 + depth * 12,
              paddingRight: 6, paddingTop: 4, paddingBottom: 4,
              background: isActiveSection ? "#e8f4fd" : isActiveKpi ? "#fff8ed" : "transparent",
              borderLeft: isActiveSection ? `3px solid ${TEAL}` : isActiveKpi ? `3px solid ${C_AVG}` : "3px solid transparent",
              borderBottom: "1px solid #f5f5f5",
              fontSize: 11,
            }}
          >
            {/* Chevron — toggles expand/collapse only */}
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                style={{ color: "#999", flexShrink: 0, lineHeight: 1, padding: "0 2px" }}
              >
                {isOpen ? <Ico.ChevD /> : <Ico.ChevR />}
              </button>
            ) : (
              <span style={{ width: 10, flexShrink: 0 }} />
            )}
            {/* Status dot + label — clicking shows overview (parents) or KPI detail (leaves) */}
            <button
              onClick={() => {
                if (hasChildren) {
                  onSectionClick(node.children!, node.name);
                } else {
                  if (matchingKpi) onKpiSelect(matchingKpi);
                  else onKpiSelect({ name: node.name, value: null, goal: "50.0%", status: "nodata" });
                }
              }}
              className="flex items-center gap-1.5 text-left flex-1 min-w-0"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {statusDot(st)}
              <span style={{ color: isActiveSection ? "#0070a8" : isActiveKpi ? "#a06000" : "#333", fontWeight: isHighlighted ? 600 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {node.name}
              </span>
              {!hasChildren && <span style={{ color: "#ccc", flexShrink: 0, lineHeight: 1 }}><Ico.ChevR /></span>}
            </button>
          </div>
          {hasChildren && isOpen && renderNodes(node.children!, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 220, background: "#fff", borderRight: `1px solid ${BDRY}` }}>
      <SectionHdr label="Performance" extra={
        <>
          <button style={{ color: "#888" }}><Ico.List /></button>
          <button style={{ color: "#888" }}><Ico.Grid /></button>
        </>
      } />
      <div className="px-2 py-1.5 flex items-center gap-1" style={{ borderBottom: `1px solid ${BDRY}` }}>
        <select className="flex-1 rounded border text-xs px-1 py-0.5 outline-none" style={{ borderColor: BDRY, background: "#fff", color: "#333" }}>
          <option>Pharmacy Call Center</option>
        </select>
        <button style={{ color: "#888" }}><Ico.Filter /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderNodes(ACCORDION)}
      </div>
    </div>
  );
}

// ─── RIGHT: Performance Overview ──────────────────────────────────────────────
function PerfOverview({
  kpis, onKpiClick, sectionFilter, sectionLabel,
}: {
  kpis: KpiCard[];
  onKpiClick: (k: KpiCard) => void;
  sectionFilter: string[] | null;
  sectionLabel: string | null;
}) {
  const displayed = sectionFilter
    ? kpis.filter(k => sectionFilter.some(name =>
        k.name.toLowerCase().includes(name.toLowerCase().slice(0, 15)) ||
        name.toLowerCase().includes(k.name.toLowerCase().slice(0, 15))
      ))
    : kpis;

  const title = sectionLabel ? `${sectionLabel} — Overview` : "Performance Overview";

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ marginBottom: 100 }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{title}</span>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 11, color: "#666" }}>Sort by:</span>
          <select className="rounded border text-xs px-1 py-0.5 outline-none" style={{ borderColor: BDRY }}>
            <option>KPI Name</option><option>Status</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))" }}>
        {displayed.map((k, i) => {
          const bg = statusBg(k.status);
          const isNoData = k.status === "nodata";
          return (
            <button key={i} onClick={() => onKpiClick(k)}
              className="rounded-lg p-3 text-left transition-opacity hover:opacity-90"
              style={{ background: bg, minHeight: 130 }}>
              <div className="flex items-start justify-between gap-1 mb-2">
                <span style={{ fontSize: 10, color: isNoData ? "#ddd" : "#fff", lineHeight: 1.3, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {k.name}
                </span>
                <span style={{ fontSize: 12, color: isNoData ? "#ccc" : "#fff" }}>{(k.status === "great" || k.status === "good") ? "▲" : k.status === "nodata" ? "" : "▼"}</span>
              </div>
              {isNoData
                ? <div style={{ fontSize: 14, fontWeight: 700, color: "#ddd", margin: "8px 0" }}>No Data</div>
                : <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "6px 0" }}>{k.value}</div>
              }
              {!isNoData && (() => {
                const val = parseFloat(k.value?.replace(/[^0-9.]/g, "") ?? "0");
                const goal = parseFloat(k.goal.replace(/[^0-9.]/g, "")) || 1;
                const pct = Math.min(100, Math.round((val / goal) * 100));
                return (
                  <div className="mt-2">
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>Goal {k.goal} ({pct}%)</div>
                  </div>
                );
              })()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── RIGHT: KPI View ──────────────────────────────────────────────────────────
function KpiView({ kpi, employee, dateFrom, dateTo, onDateChange }: {
  kpi: KpiCard; employee: string; dateFrom: string; dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const trend = useMemo(() => getTrend(kpi), [kpi]);
  const visible = useMemo(() => filterTrendByDates(trend, dateFrom, dateTo), [trend, dateFrom, dateTo]);
  const activeWin = guessWindow(dateFrom, dateTo);
  const goalNum = parseFloat(kpi.goal.replace(/[^0-9.]/g, "")) || 50;
  const bg = statusBg(kpi.status);
  const isOutOfStd = kpi.status === "poor";

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Banner */}
      <div className="flex items-stretch" style={{ background: bg, minHeight: 90 }}>
        <div className="flex-1 px-4 py-3 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.6)", display: "inline-block" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{kpi.name}</span>
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{kpi.value ?? "—"}</div>
        </div>
        <div className="flex flex-col justify-center px-4 py-2 gap-0.5" style={{ background: "rgba(0,0,0,0.2)", minWidth: 160 }}>
          {[
            ["Goal", kpi.goal],
            ["Peer", "1"],
            ["Employee % met", "0.00%"],
            ["Score Type", "Actual Based"],
          ].map(([l, v]) => (
            <div key={l} style={{ fontSize: 10, color: "rgba(255,255,255,0.9)" }}>
              <span style={{ fontWeight: 600 }}>{l}:</span> {v}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center px-4">
          <div className="rounded px-3 py-1.5 text-center" style={{ background: bg, border: "2px solid rgba(255,255,255,0.5)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
              {kpi.status === "great" ? "✓  On Target"
                : kpi.status === "good" ? "↗  On Track"
                : kpi.status === "average" ? "→  Catching Up"
                : kpi.status === "below" ? "↘  Below Target"
                : kpi.status === "poor" ? "✕  Out of Standard"
                : "—  No Data"}
            </div>
          </div>
        </div>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${BDRY}` }}>
        {[Ico.BarChart, Ico.Table, Ico.Info, Ico.Download, Ico.Settings].map((Icon, i) => (
          <button key={i} className="text-gray-400 hover:text-gray-600 transition-colors"><Icon /></button>
        ))}
      </div>

      {/* Trend section */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>KPI Trend</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {(["Actual Value", "Show"] as const).map(t => (
                <button key={t} style={{ fontSize: 11, color: t === "Actual Value" ? TEAL : "#888", borderBottom: t === "Actual Value" ? `2px solid ${TEAL}` : "2px solid transparent", paddingBottom: 2 }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Date range + time buttons */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {([["From", dateFrom], ["To", dateTo]] as [string,string][]).map(([l, v]) => (
            <div key={l} className="flex items-center gap-1 rounded border px-2 py-1" style={{ borderColor: BDRY, fontSize: 11 }}>
              <span style={{ color: "#888" }}>{l}:</span>
              <span style={{ color: "#333" }}>{fmtDisplay(v)}</span>
              <Ico.Cal />
            </div>
          ))}
          <div className="flex rounded overflow-hidden border" style={{ borderColor: BDRY }}>
            {(["1m","3m","6m","1y","all"] as TimeWindow[]).map(w => (
              <button key={w}
                onClick={() => {
                  const newFrom = windowToFrom(w, dateTo);
                  onDateChange(newFrom, dateTo);
                }}
                className="px-2 py-1 text-xs transition-colors"
                style={{ background: activeWin === w ? TEAL : "#fff", color: activeWin === w ? "#fff" : "#555", borderRight: `1px solid ${BDRY}` }}>
                {w}
              </button>
            ))}
          </div>
        </div>

        <KpiTrendChart data={visible} goalPct={goalNum} />
      </div>
    </div>
  );
}

// ─── RIGHT: Heat Map ──────────────────────────────────────────────────────────
function HeatMapView() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(["r4"]));
  const toggleRow = (id: string) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const visibleRows = HM_ROWS.filter(r => !r.parentId || expandedRows.has(r.parentId));

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button style={{ color: "#888" }}><Ico.List /></button>
        <button style={{ color: "#888" }}><Ico.Grid /></button>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#444", marginLeft: 4 }}>Heat Map</span>
        {[["Sort", "None"], ["Sort by", "N/A"], ["Order", "N/A"]].map(([l, v]) => (
          <div key={l} className="flex items-center gap-1 rounded border px-2 py-1" style={{ borderColor: BDRY, fontSize: 11, background: "#fff" }}>
            <span style={{ color: "#666" }}>{l}:</span>
            <span style={{ color: "#333", fontWeight: 600 }}>{v}</span>
            <Ico.ChevD />
          </div>
        ))}
        <button className="rounded px-3 py-1 text-xs font-semibold text-white" style={{ background: TEAL }}>Apply</button>
      </div>
      {/* Grid */}
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: 1060 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 12px 6px 4px", fontSize: 11, color: "#555", fontWeight: 600, borderBottom: `1px solid ${BDRY}`, minWidth: 180 }}>Agent Skills</th>
              {HM_COLS.map(col => (
                <th key={col} style={{ textAlign: "center", padding: "6px 4px", fontSize: 11, color: "#333", fontWeight: 700, borderBottom: `1px solid ${BDRY}`, minWidth: 80 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "3px 8px 3px 4px", paddingLeft: 4 + row.level * 16 }}>
                  <div className="flex items-center gap-1">
                    {row.expandable && (
                      <button onClick={() => toggleRow(row.id)} style={{ color: "#999", flexShrink: 0, lineHeight: 1 }}>
                        {expandedRows.has(row.id) ? <Ico.ChevD /> : <Ico.ChevR />}
                      </button>
                    )}
                    {!row.expandable && <span style={{ width: 10 }} />}
                    <span style={{ fontSize: 11, color: "#333", fontWeight: row.level === 0 ? 600 : 400 }}>{row.name}</span>
                  </div>
                </td>
                {row.cells.map((cell, ci) => (
                  <td key={ci} style={{ padding: 3, textAlign: "center" }}>
                    <div className="flex items-center justify-center rounded" style={{ background: statusBg(cell), height: 30, margin: "0 auto", maxWidth: 68 }}>
                      {cellIcon(cell)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        {([["great","Great"],["good","Good"],["average","Average"],["below","Below Avg"],["poor","Needs Improvement"],["nodata","No Data"]] as [PerfStatus,string][]).map(([s, label]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="rounded" style={{ width: 14, height: 14, background: statusBg(s) }} />
            <span style={{ fontSize: 10, color: "#666" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ExplorePerformance() {
  const [employee, setEmployee] = useState("Fisher, Olivia");
  const [rightView, setRightView] = useState<RightView>("overview");
  const [selectedKpi, setSelectedKpi] = useState<KpiCard | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string[] | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [timeFrom, setTimeFrom] = useState(() => windowToFrom("1y", todayISO));
  const [timeTo, setTimeTo]     = useState(todayISO);
  const [timePeriod, setTimePeriod] = useState("Weekly");

  const handleTimeChange = (from: string, to: string, period: string) => {
    setTimeFrom(from); setTimeTo(to); setTimePeriod(period);
  };

  const kpis = getKpis(employee);

  const handleKpiSelect = (k: KpiCard) => {
    setSelectedKpi(k);
    setActiveSection(null);
    setRightView("kpi");
  };

  const handleSectionClick = (children: ANode[], name: string) => {
    setSectionFilter(children.flatMap(c => c.children ? c.children.map(gc => gc.name) : [c.name]));
    setActiveSection(name);
    setSelectedKpi(null);
    setRightView("overview");
  };

  const handleEmpSelect = (emp: string) => {
    setEmployee(emp);
    setSelectedKpi(null);
    setSectionFilter(null);
    setActiveSection(null);
    setRightView("overview");
  };

  return (
    <div className="flex flex-col" style={{ background: "#fff", marginBottom: 100 }}>
      {/* Breadcrumb + date row */}
      <div className="flex items-center justify-between px-4 py-1.5 flex-shrink-0" style={{ borderBottom: `1px solid ${BDRY}`, background: "#fafafa" }}>
        <div style={{ fontSize: 11, color: "#0070d2" }}>
          {["Performance Overview", "KPI View", "Performance Overview", "Heat Map"].map((crumb, i, arr) => (
            <span key={i}>
              <button className="hover:underline">{crumb}</button>
              {i < arr.length - 1 && <span style={{ color: "#ccc", margin: "0 4px" }}>›</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1" style={{ fontSize: 11, color: "#555" }}>
          <button style={{ color: "#888" }}>◄</button>
          <span>{timePeriod} to Date: {fmtDisplay(timeFrom)} – {fmtDisplay(timeTo)}</span>
          <button style={{ color: "#888" }}>►</button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${BDRY}` }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a202c", letterSpacing: "-0.3px" }}>EXPLORE PERFORMANCE</h2>
      </div>

      {/* 4-panel body */}
      <div className="flex">
        <LeftPanel selected={employee} onSelect={handleEmpSelect} onTimeChange={handleTimeChange} />
        <MiddlePanel employee={employee} onKpiSelect={handleKpiSelect} />
        <PerformancePanel
          employee={employee}
          selectedKpi={selectedKpi?.name ?? null}
          activeSection={activeSection}
          onKpiSelect={handleKpiSelect}
          onSectionClick={handleSectionClick}
        />

        {/* Right panel */}
        <div className="flex flex-col flex-1">
          {/* Toggle bar */}
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${BDRY}`, background: "#fafafa" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              {rightView === "overview" ? "Performance Overview" : rightView === "kpi" ? "KPI View" : "Heat Map"}
            </span>
            <div className="flex items-center gap-1">
              {([
                ["overview", Ico.Grid],
                ["kpi",      Ico.List],
                ["heatmap",  Ico.HeatMap],
              ] as [RightView, () => JSX.Element][]).map(([view, Icon]) => (
                <button key={view} onClick={() => setRightView(view)}
                  className="rounded p-1.5 transition-colors"
                  style={{ background: rightView === view ? TEAL : "transparent", color: rightView === view ? "#fff" : "#888" }}>
                  <Icon />
                </button>
              ))}
              <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors ml-1"><Ico.Settings /></button>
            </div>
          </div>

          {/* Panel content */}
          <div className="flex flex-1">
            {rightView === "overview" && <PerfOverview kpis={kpis} onKpiClick={handleKpiSelect} sectionFilter={sectionFilter} sectionLabel={activeSection} />}
            {rightView === "kpi" && (selectedKpi
              ? <KpiView kpi={selectedKpi} employee={employee} dateFrom={timeFrom} dateTo={timeTo}
                  onDateChange={(from, to) => { setTimeFrom(from); setTimeTo(to); }} />
              : <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a KPI from the list or a card to view the trend.</div>
            )}
            {rightView === "heatmap" && <HeatMapView />}
          </div>
        </div>
      </div>
    </div>
  );
}
