# Plan: CoAssist PAP transfer

Status: steps 1 to 6 done. Step 7 is a follow-up in `PLAN_RULE7_CLEANUP.md`.

CoAssist is the system entry point. BI returns no coverage. The case transfers to the manufacturer's patient support program (PSP), the patient applies for the free drug program, and ARx Patient Solutions Pharmacy dispenses. No PA, no payment, no cash offer.

Run `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Tag each green step `refactor/NN-short-name`. Read every fixture diff before recording.

## Decisions

- The scenario id is `CoA_PAP`, on the CoAssist workflow. It is one machine (rule 1). It does not hand off to the PAP workflow's machine.
- The patient stays in the same app. The PAP screens appear after the transfer, using the PAP income screens.
- Income is approved only. The recipe pins no denial. A denial path is a later fork.
- ARx Patient Solutions Pharmacy is the dispensing pharmacy. It uses the `assigned` variant of `pharmacy_selection`. The patient does not pick it.
- The PSP name comes from the brand file, never from source.
- The recipe: `source: "coassist"`, `forks: ["bi"]`, `choices: { bi: "no_coverage_pap" }`, `panels: ["benefits"]`. Modules: `enrollment`, `pap_transfer`, `income_qualification`, `pharmacy_selection` (variant `assigned`), `scheduling`, `tracking`. No `pa_notification`, `cash_offer`, or `payment`.
- `no_coverage` keeps the cash offer. `no_coverage_pap` is a second exit with the same benefit data and a different path.

- The patient journey after the transfer is the Fax PAP income form (decided 2026-10-29). Income verified activates the program, with no agent approval beat. iAssist's `financial_assistance:pap` (credit check, agent approval, approval text and code) stays iAssist only. Both modules fire the same five events, so keep their gating the same where it overlaps. Revisit a merge into one module only if a third scenario needs the free drug journey (rule 6).

## Progress

- Step 1 done: tag `ryzup/01-income-qualification`. `main` merged into `ryzup`: tag `ryzup/02-merge-main` (596 tests, baseline 2).
- Step 2 done: tag `ryzup/03-no-coverage-pap-exit` (602 tests, baseline 2).
- Step 3 done: tag `ryzup/04-pap-transfer` (607 tests, baseline 2). The module, its screens, and its routes exist and are tested alone. They are not in `COASSIST_RULES` or `COASSIST_SCREENS` yet, because the build-time scope check rejects a module no recipe lists. Step 5 wires them in, with the `REFER_TO_PSP` system trigger on `spine.complete_bi`. 
- Step 4 done: tag `ryzup/05-pap-assigned-handoff` (609 tests, baseline 2). `assigned_waiting` no longer claims a PA-less case (`assignedWithoutPa` in `modules/shared.ts`), and `spine.complete_bi` assigns the scenario's `transferPharmacy` when the exit runs no PA. Dispatch still waits for income (`VERIFY_INCOME` sets `dispatchStatus`). The pharmacy's name and contact come from the brand file's `program.transferPartner` through `TRANSFER_PHARMACY`.
- Step 5 done: tag `ryzup/06-coa-pap-scenario` (624 tests, baseline 2). `CoA_PAP` is a flow type, a scenario, a recipe, a registry entry, a golden path (`coa-pap`, ends delivered), and a 10-rung ladder from the `bi` fork. The module rules and routes are wired in. `spine.complete_bi` fires `REFER_TO_PSP`, and the transfer text tap fires `SEND_PAP_SMS`, both `system`. `recipe.ts` gained `orderedAfter`, so a recipe with the pharmacy before the referral or income fails. The assigned PA routes now need the `pa` fork. New patient page `PapTransferSms`. Known gap: a pin of another `bi` exit that needs no module the recipe lacks (`pharmacy_covered`, `medical_pa_required`) falls back to the free drug program. Step 6 closes it in the brand test.
- Step 6 done: tag `ryzup/07-ryzup-demo` (636 tests, baseline 2). `brands/ryzup/brand.json` has the `coa-pap` demo (`choices: { bi: "no_coverage_pap" }`) and `program.transferPartner` for ARx Patient Solutions Pharmacy, with a placeholder address and phone. The brand test now rejects a pin of a `bi` exit the scenario cannot reach (`forksForFlow`), and a pin the recipe cannot run. `docs/BRANDS.md` explains both. Checked in the app with `BRAND=ryzup`: stages 4, 5, 6, 7, and 11 land on the transfer text, the update text, the home card, the address form, and delivered. `BRAND=ryzup pnpm build:client` builds.

## Why a new exit and not a cash offer variant

The patient sees a different journey after the same BI result. Rule 14 says that is a fork exit. Rule 5 says the scenario decides what follows, so `cash_offer` and `pap_transfer` never know about each other.

## Steps

1. **Extract `income_qualification`.** Move `SEND_PAP_SMS`, `VERIFY_PAP_SMS`, `VERIFY_PAP_OTP`, `START_INCOME_QUALIFICATION`, and `VERIFY_INCOME` from `workflows/pap/rules.ts` into a shared module. Rule 6 allows it because a second scenario now uses it. `PAP_RULES` imports it back. The Fax and PrES fixtures must not change. Do this step first and alone. Declare its needs and sets (needs a completed BI and a consented patient, sets `incomeStatus` and `papStatus`).
2. **`bi` exit.** Add `no_coverage_pap` to `BI_EXITS` with `paRequired: false`, `pharmacyAssigned: true`, and `requires: ["pap_transfer", "income_qualification", "pharmacy_selection:assigned"]`. `resolveBi` applied `pharmacyAssigned` only when a PA runs, so an unforced exit now keeps its own flag (a forced status still needs the PA). `spine.complete_bi` sent the cash-offer SMS whenever neither benefit covered, so it now skips it when the exit assigns a pharmacy with no PA (`assignsWithoutPa`). Add the exit to the CoAssist `bi` fork. New test: `coassist.papExit.test.ts`.
3. **`pap_transfer` module.** The referral to the PSP. It sets `papTransferStatus` and sends the transfer SMS. Preconditions: BI complete and `no_coverage_pap` chosen. Mark the referral `system`. Screens: waiting, transfer SMS. Add the route rules to `coassist/screens.ts`.
4. **CoAssist `assigned` variant for this path.** The variant exists for medical transfer. Confirm its route rules do not collide with the PAP routes, and add the dispense hand-off to ARx Patient Solutions Pharmacy.
5. **The scenario.** Flow type, scenario, recipe, registry entry, screen map, `ALL_SCENARIOS`, starting portal, and `BI_STAGES` rungs. The golden path ends at `medication_delivered`. Add the new scenario's fixtures. The rule 12 invariant and the menu test must pass for it.
6. **Brand and demo.** Add `brands/ryzup/brand.json` (see Brand). Add a `demos` entry with `flow: "CoA_PAP"` and `choices: { bi: "no_coverage_pap" }`. Update `docs/BRANDS.md`.
7. **Follow-up, own step.** The shell and CRM branch on `isCoaFlow` and `isCoverageFlow`. The new flow shows the closest existing step bar. Fixing it belongs to `PLAN_RULE7_CLEANUP.md`.

## Brand

- Slug: `ryzup`. File: `brands/ryzup/brand.json`. Copy `brands/_template/brand.json`.
- `manufacturer.name`: Alkermes. `program.name`: Lumryz RyzUp Support Services. `program.drugDisplayName`: Lumryz.
- Logo and colors come later. Leave `program.assets` out so the program name shows as text. Use template colors until then, and mark them `[TBD]` in the file's review notes.
- `program.name` already exists in the schema. No schema change.

## Open items

- **Pharmacy details [TBD].** `program.transferPartner` is set to ARx Patient Solutions Pharmacy. Its street address, city, state, zip, and phone are placeholders in `brands/ryzup/brand.json`. Replace them when supplied.
- **Manufacturer fields [TBD].** `ryzup` extends `assistivan`, so `tagline`, `support` phone, the legal URLs, and `dosageForm` still show Assistivan's values. Replace them when the client supplies theirs.
- **Logo and colors [TBD].** `program.assets` and `program.colors` are not set. The program name shows as text on the inherited colors.

## Final check

- Brand test passes for the new demo.
- Fax and PrES fixtures are unchanged after step 1.
- The patient never sees a pricing, payment, PA, or cash offer screen on `CoA_PAP`.
- A test fails when `pharmacy_selection` is ordered before `pap_transfer`.
