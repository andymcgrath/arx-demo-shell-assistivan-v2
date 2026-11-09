import type { BrandConfig } from "./schema";

/**
 * The clinical questions on the provider's PA form for one brand. Pure, so the form and the tests read one answer.
 *
 * 1. A brand's own `program.paQuestions` wins. A client's real criteria belong there.
 * 2. Else the questions are built from `program.indication`: a confirmed diagnosis, prior therapy, and supporting
 *    documentation, each naming the diagnosis.
 * 3. Else generic questions that name no condition.
 */
type Program = Pick<BrandConfig["program"], "paQuestions" | "indication">;

export function paQuestionsFor(program: Program): string[] {
  const own = program.paQuestions?.map((q) => q.trim()).filter(Boolean) ?? [];
  if (own.length) return own;
  const name = program.indication?.name.trim();
  return name
    ? [
        `Does the patient have a confirmed diagnosis of ${name}?`,
        `Has the patient tried and failed prior therapy for ${name}?`,
        `Is supporting clinical documentation of ${name} available for this request?`,
      ]
    : [
        "Does the patient have a confirmed diagnosis for this medication?",
        "Has the patient tried and failed prior therapy?",
        "Is supporting clinical documentation available for this request?",
      ];
}
