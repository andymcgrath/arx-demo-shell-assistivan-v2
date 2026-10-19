# Step 2 plan: move CoAssist onto the recipe

Status: plan for review. No code has changed.

Goal: CoAssist's three scenarios (CoA_DTP, CoA_Copay, CoA_DME) become recipes built from components. Behavior stays the same. The nine CoAssist golden-path fixtures, plus the ladder, reset, undo, and email fixtures, prove it. Fixtures must not change in sub-steps 2.1 to 2.5.

## What the code looks like today

- **One rules table, 371 lines.** `workflows/coassist/rules.ts` serves all three scenarios. It holds 14 `scenarios: [...]` filters. Several events have one rule per scenario (`COMPLETE_BI`, `SUBMIT_PA`, `SELECT_SELF_PAY`, `VIEW_STAGE`).
- **One screen map, 157 lines.** `screens.ts` has about 35 `scenarios:` filters. Rule 14 retires both.
- **Outcomes live in two places.** DME uses the declared `bi` fork. DTP and Copay read `content.biResult` and `content.paOutcome`, which are scenario content and not forks.
- **The patient picks at runtime.** DTP and Copay let the patient choose Retail, Mail Order, or Self-pay on `/benefit-pricing`. That choice is `pricingOption`. Copay adds an enroll step first.
- **Four machines exist.** `coassist`, `iassist`, `standard`, and `pap`. This step touches only `coassist`.

## Mapping today's screens to modules

| Module | Screens |
|---|---|
| `enrollment` | `/sms-message`, `/phone-verification`, `/otp-verification`, `/confirm-details`, `/enrollment-complete` |
| `financial_assistance` (copay) | `/copay-enroll` |
| `pharmacy_selection` | `/pharmacy-selection`, `/network-pharmacy-selection`, `/pharmacy-selection-confirmation`, `/pharmacy-transfer` |
| `scheduling` | `/delivery-address`, `/delivery-date` |
| `payment` | `/benefit-pricing`, `/delivery-payment`, `/delivery-confirmation` |
| `tracking` | `/order-tracker`, `/order-shipped`, `/medication-delivered` |

Five screens fit no module in the catalog yet:

| Screen | Becomes |
|---|---|
| `/pa-approved-sms`, `/pa-approved-otp` | module `pa_notification` (SMS and OTP re-verify after a PA decision) |
| `/cash-offer-sms`, `/pa-denied` | module `cash_offer` (self-pay entry after a denial or no coverage) |
| `/dme-transfer-sms`, `/dme-provider-transfer` | module `provider_transfer` (the Transfer outcome) |

The catalog grows from six modules to nine.

## Sub-steps

Each sub-step ends green (`pnpm test`, `pnpm typecheck:ratchet`), is committed on its own, and gets an annotated tag `refactor/NN-name`.

**2.1 Recipes as data.** Add a recipe for each scenario, using today's behavior. Add the three modules above to the catalog. Add `recipeProblems()`, a pure validator for needs and sets order and Triage rules. Add a headless test that validates all three recipes and rejects a bad order. No machine change.

**2.2 BI and PA forks for every scenario.** Declare `bi` and `pa` forks for all three scenarios, DME included, with no exceptions. Move `content.biResult` and `content.paOutcome` into scenario `choices`. The DME recipe pins `pa` to `approved` and locks it. Collapse the paired `COMPLETE_BI`, `SUBMIT_PA`, and `VIEW_STAGE` rules into fork-driven ones. `pa_notification` needs `fork:pa` in every recipe, and the DME recipe lists `pa`. This reverses the 2.1 exception. Demos in brand files keep working because the brand test only checks that choices name declared exits.

The recipe decides which exit a fork walks. DME's `pa` fork declares `approved` and `denied`, and the DME recipe pins `approved`. Two small additions support this:

- A fork exit can name the modules it needs (`requires`). `pa.denied` requires `cash_offer`. `recipeProblems()` rejects a recipe that picks `denied` without one, so a bad combination fails a test and not a demo.
- Locking a fork per recipe is not needed yet. The new forks use `chooser: "story"`, which already means no presenter button. A per-recipe lock waits until a presenter should pick `bi` or `pa` on DTP.

Known gap, closed in 2.4: DME's rules still ignore `DENY_PA`, so `requires: ["cash_offer"]` passes for a DME recipe that picks `denied` while the machine would not follow it. Nothing picks it today. Module-owned rules in 2.4 remove the gap.

DTP and Copay stage ladders stay hard-coded in `coassistLadders.ts` for now. Only DME's ladder reads its fork.

Because no DME behavior is added, there is no separate DME denial sub-step. Once modules own their screens (2.5), a DME recipe with `cash_offer` gets the denial routing without a new rule.

**2.3 The patient-chosen fork.** Declare a `pricing` fork with `chooser: "patient"`. DTP exits are `retail`, `mail_order`, and `self_pay`. Copay exits are `copay_then_retail`, `copay_then_mail_order`, and `retail`. The fork replaces the three `SELECT_SELF_PAY` rules and the pricing rule.

**2.4 Rules per module.** Split `rules.ts` into one fragment per module. The factory assembles them from the recipe, in spine order. A test checks that the assembled order for each event matches today's order. DME's `SELECT_PHARMACY` must stay ahead of the generic one.

**2.5 Screens per module.** Each module contributes its screens and route rules. The route list and the menu derive from the recipe. Delete every `scenarios:` filter in `screens.ts`. `screens.test.ts` already checks that every visited screen is in the menu.

**2.6 Proof recipe.** Compose one new scenario with no new code: commercial coverage, PA approved, patient selects a pharmacy, Rx transferred, no scheduling or payment. Add its golden path. This is the one sub-step that records a new fixture, and it must be reviewed.

## Risks

- **First-match ordering.** Rules for one event run in declaration order. Assembling from fragments can reorder them silently. 2.4's ordering test guards it.
- **Sticky screens.** Some screens stay on-screen until data catches up. Moving them to modules must keep the `sticky` flag.
- **Stage ladders.** `coassistLadders.ts` and the presenter's fork buttons read fork stages. New forks need `stagesBefore` and exit `stages`, or the stage-jump list shrinks.
- **Snapshots.** A changed `WorkflowData` shape needs a snapshot key bump (v5 to v6).
- **Scenario ids stay.** `CoA_DTP`, `CoA_Copay`, and `CoA_DME` remain the stable ids. Brand files and the registry reference them. Renaming waits for step 5.

## Decisions needed

1. Patient-chosen pricing (decided: a `chooser: "patient"` fork).
2. Tag granularity: one tag per sub-step (decided: one tag per sub-step, `refactor/23` onward).
3. Starting point: 2.1 first (recommended, no behavior change).
