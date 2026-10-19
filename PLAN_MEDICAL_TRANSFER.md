# Plan: shared BI component and the iAssist medical transfer scenario

The goal is to build a scenario from components and configuration, not from new code per client. The first use is a client demo: an iAssist source, BI with a medical benefit, a PA, copay as data, and a Triage transfer (HCP-administered, Buy & Bill).

Run `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Tag each green step `refactor/NN-short-name`. Read every fixture diff before recording.

## Decisions

- No client or drug name in source. The scenario id is `iAssist_Medical_Transfer`. The client's demo is an entry in `brands/<slug>/brand.json`.
- A source is a scaffold, not a scenario. BI is a component with a catalog of exits. A source or scenario picks the exits it offers and the story pins one.
- Buy & Bill is the Triage `transfer` exit, not a new module. It forbids `scheduling` and `payment`, requires `tracking`, and leaves `pharmacy_selection` optional. No new module is built.
- Copay is data only in this scenario. The CRM shows it. The patient does not enroll in the app. `financial_assistance` stays CoAssist-only until a second scenario needs it (rule 6).
- A PA is required when the exit says so. Each BI exit carries `paRequired`. The `submit_pa` rule and the CRM read it. The condition "pharmacy covered and medical not" goes away.
- Terminology: the CRM benefits panel is not called eMedBV in code. It is the benefits panel.

## Exit catalog

| Exit | Pharmacy | Medical | PA | Needs |
|---|---|---|---|---|
| `pharmacy_covered` | covered | not covered | yes | none |
| `pharmacy_transfer` | covered | not covered | yes | `provider_transfer` |
| `medical_covered` | covered | covered | no | `provider_transfer` |
| `medical_pa_required` | not covered | covered | yes | `pharmacy_selection` (assigned) |
| `no_coverage` | not covered | not covered | no | `cash_offer` or `financial_assistance` |

`medical_pa_required` is new. It is the exit the medical transfer scenario pins.

## Steps

1. **Shared BI component.** Move the fork and its rules (`complete_bi`, `submit_pa`) to `workflows/shared/bi.ts`. A factory takes the scenarios and the exit ids a source offers. Add `paRequired` to exit data and to `WorkflowData`. CoAssist adopts it with no behavior change. iAssist adopts it and renames `coverage_found` to `pharmacy_covered`. Fixtures change: a new field in `workflowData`, and renamed choices and brand demo picks.
2. **Benefits panel component.** Extract the pharmacy and medical sections from `portals/crm/pages/Index.tsx` (lines 2547 to 2685) into one component that takes the two statuses and `paRequired`. Gate it on data (the statuses are set), not on `isCoverageFlow`. The Medical "PA Required?" row reads `paRequired`. No fixture changes. Check it in the browser for the Coverage scenario.
3. **iAssist assigned pharmacy.** Add the `assigned` variant to iAssist `pharmacy_selection`. Move the `assignment` helper from CoAssist to the shared folder. Add `transferPharmacy` to iAssist content. Add a terminal route to the existing `PharmacyTransfer` page, scoped to the variant. No FILL_RX, READY_RX, or SHIP_RX.
4. **The scenario.** Add `iAssist_Medical_Transfer`: flow type, registry entry, scenario, recipe (`triage: "transfer"`), golden path, ladder, and a demo in the client's brand file. The recipe lists `enrollment`, `pa_notification`, `pharmacy_selection` (assigned), and `tracking`. Add a guard test that the recipe passes `recipeProblems`.
5. **Follow-up, own step.** Replace `isCoverageFlow` and other `flowType ===` checks in the CRM and shell with reads from the scenario definition (rule 7). Split `crm/pages/Index.tsx` along existing seams. It is far over 600 lines.

## Open questions

- CRM layout for this scenario. Default: keep the iAssist layout and show the benefits panel in place of its insurance section. Say if the client wants the Coverage layout instead.
- Does `medical_pa_required` need its own patient-facing copy (PA approved SMS wording)? Default: reuse the existing `pa_notification` screens.

## Final check

- `rg "flowType ===" client/portals` has no hit for the new scenario.
- Brand test passes for every `demos` entry.
- Rule 12 invariant test passes for every scenario, including the new one.
