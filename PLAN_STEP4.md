# Step 4: iAssist onto the recipe

Source: `MODEL_DRAFT.md` migration plan, step 4. CoAssist is the reference (`PLAN_STEP2.md`). Same rules: behavior-preserving, fixtures prove it, one tag per sub-step, `pnpm test` and `pnpm typecheck:ratchet` green before each.

## Decision

iAssist owns its module files under `workflows/iassist/modules/`. The two sources share the contracts in `MODULE_CONTRACTS`, the recipe validator, the rule `scope`, and the screen-map slots engine. They do not share rule code. The rules differ in real ways, and rule 6 says extract a shared module only when the second source proves the need. A shared extraction can come after step 4 with fixtures on both sides.

## What iAssist is today

- Two scenarios on one machine: `iAssist_PA_Approved` and `iAssist_PAP` (PA denied, appeal approved, infusion scheduled).
- `erx` intake. BI starts with the referral. A PA starts when BI says one is required.
- 38 rules in one file, 15 with `scenarios:` filters. No forks. `content.biResult` and `content.paOutcome` pick the outcome.
- One screen map with `scenarios:` filters on 14 menu screens and 20 route rules, none with ids.
- Automation: `appeal-start` (rule built in the Rules portal) and agent-driven reveals for BI, PA, and appeal.

## What differs from CoAssist

- No cash offer, copay, or provider transfer.
- Payment is self-pay only. Retail and Mail Order are settled at the counter.
- The PA approval reverify (SMS, OTP) is skipped when the patient consents after approval.
- PAP has an appeal, an infusion date, and a site of care. The PA stays denied for good. No CoAssist module covers it.

## Sub-steps

**4.1 Source and recipes as data.** Add `iassist` to `SOURCES`. Add an `appeal` module to the catalog (needs `fork:pa`, sets `appealResolved`, tracker steps "Appeal filed" and "Appeal decided"). Write `workflows/iassist/recipes.ts`. Validate both recipes. No machine change.

**4.2 Forks.** Declare `bi` (coverage_found, no_coverage) and `pa` (approved, denied) as iAssist forks, chooser story, with `stagesBefore` and exit `stages`. Move `content.biResult` and `content.paOutcome` into scenario `choices`. Add the appeal as a fork (`appeal`: approved, with a denied exit only if a behavior needs it). The reveal automation reads the pick. Fixtures prove the pick sets what the content did.

**4.3 Rules into modules.** Split `iassist/rules.ts` into `modules/*.ts` with ids. Convert the 15 `scenarios:` filters to scopes. Record the rule order and applicability matrix (`rules/iassist.json`), the same way as `rules/coassist.json`.

**4.4 Screens into modules.** Move screens and route rules to module files with slots and scopes. Freeze the old route order, walk the machine with seeded random events, compare route at every state.

**4.5 Ladders.** `iassistLadders.ts` derives from the forks, as DME already does.

**4.6 Invariants and end states.** Extend the precondition invariant test to iAssist. Golden paths already name end states.

**4.2 (done).** `workflows/iassist/forks.ts` declares `bi` and `pa`, both story forks, in `ALL_FORKS`. `content.biResult` and `content.paOutcome` are gone. Scenarios carry `choices` and a `recipe`, and the rules and both reveals read the pick through `exitFor`. Exits name the modules a recipe needs: `approved` requires `pa_notification`, `denied` requires `appeal`, and `no_coverage` requires `financial_assistance` (no module handles it yet, so no iAssist recipe can pick it). CoAssist's `pa` fork was global, so it now lists its three scenarios. Otherwise iAssist would have two `pa` forks. The `appeal` fork in the original plan is not needed: no behavior reads one. Existing iAssist golden paths and the automation test are the behavior proof, and they did not change.

## Risks

- **Module names that do not fit.** `scheduling` covers an address and ship date. The PAP infusion date is a different screen and event. A `variant` prop separates them, as `cash_offer` does.
- **Appeal automation is a rule built in the Rules portal.** `SET_APPEAL_RULE` has `snapshot: false` and cancels a timer. A scope must not change that.
- **Shared screens.** `/pa-denied`, `/benefit-pricing`, and `/order-tracker` are patient pages shared with CoAssist. They read `flowType`. A page that checks `flowType` stays as is (rule 7 cleanup is its own step).
- **Snapshot keys.** A changed `WorkflowData` shape needs a snapshot key bump.
