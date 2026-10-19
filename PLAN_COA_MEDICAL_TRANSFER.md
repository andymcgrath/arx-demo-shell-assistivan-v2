# Plan: CoAssist medical transfer (Servier)

Same outcome as the iAssist medical transfer: the medical benefit covers it, a PA is required, HCP administered, and the Rx transfers to an assigned site of care. The source is CoAssist this time. The first client is Servier.

Run `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Tag each green step `refactor/NN-short-name`. Read every fixture diff before recording.

## Decisions

- The scenario id is `CoA_Medical_Transfer`. No client or drug name in source. The Servier demo lives in `brands/servier/brand.json`.
- The recipe: `source: "coassist"`, `triage: "transfer"`, `panels: ["benefits"]`, `choices: { bi: "medical_pa_required", pa: "approved" }`. Modules: `enrollment`, `pa_notification`, `pharmacy_selection` (variant `assigned`), `tracking`. No payment, scheduling, or cash offer.
- The CRM uses the benefits panel for this scenario, as `CoA_Coverage` does. CoAssist has no iAssist layout, so the layout question does not arise.
- The `bi` exit `medical_pa_required` already exists in the shared catalog. CoAssist starts offering it. An exit's `requires` may name a variant (`pharmacy_selection:assigned`), so only a recipe with that variant can pick it. Without this, Copay and Coverage could pick an exit that has no screens.
- Same path through the CRM, different starting point. The source decides where the demo starts (CoAssist starts in the provider portal's eRx flow, iAssist in its own dashboard). The recipe decides everything after: the CRM stages, the benefits panel, the step bar, and the stage-jump list. The transfer ladder is one list of events, shared by both sources, because the events are the same.
- The transfer pharmacy comes from `program.transferPartner` in the brand file. For this demo it is a site of care, not a pharmacy.

## Why CoAssist needs routes of its own

CoAssist route rules split by journey. The waiting and PA notice screens apply only to a scenario with the `pricing` fork (DTP and Copay) or the `provider_transfer` module (Coverage). The new scenario has neither, so it would have no screen while BI and the PA run. The `assigned` variant of `pharmacy_selection` owns four route rules: waiting, PA SMS, PA OTP, and the terminal transfer screen. The screens and rules follow the iAssist ones.

## Steps

1. **Variant-aware `requires`.** `recipe.ts` accepts `module:variant`. `medical_pa_required` now requires `pharmacy_selection:assigned`. The iAssist recipe test and the composition test keep passing. No fixture changes.
2. **CoAssist `assigned` variant.** Add the variant's screens and four route rules. Add `CoA_Medical_Transfer` to the CoAssist `bi` fork (scenarios and exit list). Nothing uses the variant until step 3.
3. **The scenario.** Flow type, scenario, recipe, registry entry, machine scenario map, screen map, `ALL_SCENARIOS`, starting portal. The provider portal treats it as a CoAssist flow (its eRx path). The shell picks the step bar and stage-jump list from the recipe (`triage: "transfer"`), not the flow id. The transfer ladder moves to one shared module that both iAssist and CoAssist call. The iAssist ladder fixture must not change. Golden path `coa-medical-transfer` ending at `pharmacy_transferred`. Stage-jump rungs in `BI_STAGES`, and the ladder guard test lists no known gap for it. Fixtures: the new scenario's, plus the rule table and screen map gain the new flow.
4. **Servier demo.** Add the demo to `brands/servier/brand.json`, keeping the existing `coa-pharmacy-transfer` demo. Add `program.transferPartner`. Update `BRANDS.md`.
5. **Follow-up, own step.** The shell and CRM still branch on the flow type (`isCoaFlow`, `isCoverageFlow`). The new flow shows the closest existing step bar and stage list. Replacing those with reads from the scenario is the rule 7 cleanup already listed in `PLAN_MEDICAL_TRANSFER.md`.

## Open questions

- Servier's site of care: name, address, city, state, zip, phone. Default: reuse Dr. Chen's Orlando site of care from the Celldex brand file.
- Servier's confirmation background. Default: leave as it is.
- Keep the existing Servier pharmacy transfer demo. Default: yes.

## Final check

- Brand test passes for every Servier `demos` entry.
- Rule 12 invariant test passes for the new scenario.
- The new scenario's patient never sees a pricing, scheduling, payment, or fulfillment screen.
