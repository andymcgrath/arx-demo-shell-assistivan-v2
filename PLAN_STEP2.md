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

**2.3 The patient-chosen forks.** See "2.3 design" below. DTP and Copay only. DME is out: its pricing is set by the BI exit and the cash-offer path, so there is no patient pick to model.

**2.3b Pre-picked pricing (new behavior).** A recipe or demo that pins `pricing` or `copay` in `choices` skips the menu. The pick applies when the PA approval verifies, on both paths: the OTP, and the consent shortcut when the PA was approved first. DME's pharmacy transfer already works this way through `pharmacyAssigned`. This is what lets a sales rep ask for "skip the pricing screen." A pinned Retail uses the scenario's default retail pharmacy. Brand demos pin through their `choices`, and the brand test already validates them against the declared exits.

Browser testing changed one rule. A pinned self-pay lands on the self-pay offer and the patient accepts it there. A fork exit can carry `confirm: true`: a pin pre-selects it and routes to its own screen, and the rules apply it only when the patient accepts. Retail, Mail Order, and `copay: enroll` apply on their own. Pinning Mail Order skips the Retail-or-Mail-Order choosing step, so `copay: enroll` plus `pricing: mail_order` is valid but unrealistic for a demo. The test demo for it was removed.

The one UI change: `/benefit-pricing` is a sticky screen and `PaApprovedOtp` navigates there by hand, so `BenefitPricing.tsx` redirects to the route the data says comes next, but only when the pricing pick is pinned. Opening the screen from the menu after a live pick still shows the menu. Menu generation from the recipe (2.5) will later hide screens a pin skips.

**2.4 Rules per module.** Split `rules.ts` into one fragment per module. The factory assembles them from the recipe, in spine order. A test checks that the assembled order for each event matches today's order. DME's `SELECT_PHARMACY` must stay ahead of the generic one.

**2.5 Screens per module.** Each module contributes its screens and route rules. The route list and the menu derive from the recipe. Delete every `scenarios:` filter in `screens.ts`. `screens.test.ts` already checks that every visited screen is in the menu.

**2.6 Proof recipe.** Compose one new scenario with no new code: commercial coverage, PA approved, patient selects a pharmacy, Rx transferred, no scheduling or payment. Add its golden path. This is the one sub-step that records a new fixture, and it must be reviewed.

## 2.3 design

**Today.** `pricingOption` (`retail`, `mail_order`, `self_pay`, or null) is the patient's pick. About 35 places read it: the route rules, seven patient pages, the CRM status text, and the shell. The patient app sends `SELECT_PRICING_OPTION { option }` for Retail and Mail Order. `SELECT_SELF_PAY` means two things: in DTP it picks cash pay, and in Copay it enrolls in the copay program (`copayEnrolled`). Copay is two decisions: enroll or not, then Retail or Mail Order.

**Forks.**

| Scenario | Fork | Exits | Reads from |
|---|---|---|---|
| DTP | `pricing` | `retail`, `mail_order`, `self_pay` | `pricingOption` |
| Copay | `copay` | `enroll`, `decline` | `copayEnrolled`, then `pricingOption` |
| Copay | `pricing` | `retail`, `mail_order` | `pricingOption` |

All three use `chooser: "patient"`. Exit ids match today's `pricingOption` values, so no read site changes.

**The patient's pick lives in the data, not in `choices`.** `choices` survives RESET by design, because it holds the story's and presenter's pre-picks. A patient's live pick written there would leak into the next run. `pricingOption` already records the pick. A patient fork declares how to read its pick from the data (`picked`), so BrandLab and the validator can show it.

**Events stay.** The patient app and every test keep sending `SELECT_PRICING_OPTION` and `SELECT_SELF_PAY`. The rules change underneath:

- One `SELECT_PRICING_OPTION` rule covers DTP and Copay. It accepts only an option that is a declared exit of the scenario's `pricing` fork, and it sets that exit's data. The pharmacy still comes from scenario content, keyed by exit id.
- `SELECT_SELF_PAY` on DTP picks the `self_pay` exit. On Copay it picks `copay.enroll`.
- Three rules plus the shared one become two. DME's `SELECT_SELF_PAY` and `SELECT_PHARMACY` rules stay as they are.

**Unchanged.** Route rules, patient pages, CRM text, stage ladders, and fixtures. No `WorkflowData` shape change, so no snapshot key bump.

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
