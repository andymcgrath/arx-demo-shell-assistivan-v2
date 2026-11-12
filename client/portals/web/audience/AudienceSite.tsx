/**
 * The client's web page for the audience scenario. It opens on the audience choice. The demo's pinned audience (the `audience`
 * fork) decides which page follows: the HCP's site (enrollment form, which texts the patient) or the patient's page
 * (authorization, details, and the prescription with the prescriber's NPI). Either one sends AUDIENCE_SUBMIT, and the machine
 * reads the pick. A reload or Reset All lands on the right page from the machine.
 */
import { useState, type ReactNode } from "react";
import { usePersonaState } from "@/engine/WorkflowProvider";
import HcpSite from "../hcp/HcpSite";
import AudienceLanding from "./AudienceLanding";
import { audienceOf } from "./audience";

export const AUDIENCE_SUBMIT = "AUDIENCE_SUBMIT";

/** `patientPage` is the consumer page, passed in so this file does not import the page that renders it. */
export default function AudienceSite({ patientPage }: { patientPage: ReactNode }) {
  const { workflowData: w } = usePersonaState("patient");
  const audience = audienceOf(w.choices);
  // After the submit the page is past the choice. Before it, the visitor picks their audience.
  const [chosen, setChosen] = useState(w.enrollmentStatus !== "none");
  if (!chosen) return <AudienceLanding pinned={audience} onChoose={() => setChosen(true)} />;
  return audience === "hcp" ? <HcpSite submitEvent={AUDIENCE_SUBMIT} /> : <>{patientPage}</>;
}
