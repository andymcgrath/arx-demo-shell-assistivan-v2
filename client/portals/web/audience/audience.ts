/** Which audience the web page serves, read from the `audience` fork's pick (the demo pins it). Pure, so the shell and the page agree. */
import { exitFor } from "@/engine/workflow/forks";
import { AUDIENCE_FORK } from "@/workflows/coassist/forks";
import { scenarioFacts } from "@/workflows/scenarioFacts";

export type Audience = "hcp" | "patient";

export const audienceOf = (choices: Record<string, string> | undefined): Audience => (exitFor(AUDIENCE_FORK, { choices: choices ?? {} }).id === "patient" ? "patient" : "hcp");

/**
 * True when the web page is a desktop site (the HCP's), so the shell shows it without the phone frame. The patient's page is a
 * mobile page, like every other consumer web scenario.
 */
export function webIsDesktopSite(flowType: string, choices: Record<string, string> | undefined): boolean {
  const facts = scenarioFacts(flowType);
  return facts.isHcpEnrollment || (facts.hasAudienceFork && audienceOf(choices) === "hcp");
}
