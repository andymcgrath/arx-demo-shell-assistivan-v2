import { ghostCards, type DemoRequest } from "./request";

/**
 * The Claude Code prompt for a demo request. Short on purpose. The request file is the source of truth, so the prompt
 * points at it and does not carry the storyboard. It names the rules by number and does not restate them.
 * Pure text. The dev export endpoint loads it and writes it beside the request file.
 */
export function buildPrompt(request: DemoRequest, requestPath: string): string {
  const ghosts = ghostCards(request);
  const demos = request.demos.length;
  const lines = [
    `# Build the demo: ${request.title}`,
    "",
    `Client: \`${request.client}\`. Request: \`${requestPath}\`.`,
    ghosts.length
      ? `The request has ${ghosts.length} ghost card${ghosts.length === 1 ? "" : "s"}. Build ${ghosts.length === 1 ? "it" : "each one"}.`
      : "The request has no ghost cards. It only needs the recipe and the demos applied.",
    "",
    "Do these in order.",
    "",
    `1. Read \`${requestPath}\`, then \`CLAUDE.md\` and the docs it names. The rules there apply. Do not restate them.`,
    `2. Apply the recipe and the ${demos} demo${demos === 1 ? "" : "s"} in the request.`,
    "3. Build each ghost card as a block. Keep it inline unless a second scenario uses it (rule 6). Declare `needs` and `sets` (rule 4).",
    "4. Add screens (rule 13), preconditions (rules 11 and 12), and one headless test per demo. Each test reaches the end state the last card names (rule 8).",
    `5. Run \`pnpm test\` and \`pnpm typecheck:ratchet\`. Tag \`${request.client}/NN-short-name\`. Find the next number with \`git tag -l '${request.client}/*'\`. Never tag a red build.`,
    request.openQuestions.length
      ? `6. The request has ${request.openQuestions.length} open question${request.openQuestions.length === 1 ? "" : "s"}. For each one, stop and ask. Do not invent an answer.`
      : "6. The request has no open questions. If you hit a gap the request does not cover, stop and ask. Do not invent an answer.",
    "7. End with a short report: what was built, and what was not.",
    "",
  ];
  return lines.join("\n");
}
