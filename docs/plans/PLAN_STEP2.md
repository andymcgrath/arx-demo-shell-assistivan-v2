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

**2.4 Rules per module.** See "2.4 design" below. Three sub-steps: 2.4a records today's rule order and applicability as a fixture, 2.4b moves the rules into module files, 2.4c replaces the `scenarios:` filters with derived scope.

**2.5 Screens per module.** Each module contributes its screens and route rules. The route list and the menu derive from the recipe. Delete every `scenarios:` filter in `screens.ts`. `screens.test.ts` already checks that every visited screen is in the menu. See "2.5 design" below for the ordering question.

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

## 2.4 design

**Where the risk is.** `rules.ts` has 36 rules. XState takes the first matching rule per event, but almost every event has one rule, or rules that are mutually exclusive by their own guard (the three `VIEW_STAGE` reveals each check `e.stage`). Only `SELECT_PHARMACY` depends on order: DME's one-tap rule must stay ahead of the generic one. The real risk is applicability. 13 rules carry a `scenarios:` filter, and a wrong derivation silently gives a scenario an event it never had.

**Proof, recorded before anything moves.** Give every rule an `id`. Record a fixture of two things: the rule ids per event in order, and an applicability matrix (rule id by scenario: applies or not). Each sub-step must leave the fixture unchanged. 2.4c is allowed to change the filters but not the matrix.

**Rule to module map.**

| Module | Rules |
|---|---|
| spine (no module, every scenario) | `RUN_BI`, `COMPLETE_BI`, `SUBMIT_PA` (2), `APPROVE_PA`, BI and PA `VIEW_STAGE` reveals, BI and PA `LEAVE_STAGE` |
| `enrollment` | `REFERRAL_RECEIVED`, `VERIFY_SMS`, `VERIFY_OTP`, `CONFIRM_CONSENT` |
| `pa_notification` | `VERIFY_PA_APPROVED_SMS`, `VERIFY_PA_APPROVED_OTP` |
| `cash_offer` | `DENY_PA`, `SEND_CASH_OFFER` (variant `pa_denied`); `VERIFY_CASH_OFFER_SMS`, DME `SELECT_SELF_PAY` (variant `sms`) |
| `provider_transfer` | `NOTIFY_PROVIDER_TRANSFER`, `VERIFY_DME_TRANSFER_SMS`, DME_TRANSFER `VIEW_STAGE` and `LEAVE_STAGE` |
| `financial_assistance` | Copay `SELECT_SELF_PAY` (the `enroll` exit) |
| `payment` | `SELECT_PRICING_OPTION`, DTP `SELECT_SELF_PAY`, `PATIENT_PAYS`, `VERIFY_PAYMENT` |
| `pharmacy_selection` | DME one-tap `SELECT_PHARMACY`, generic `SELECT_PHARMACY` (in that order) |
| `scheduling` | `PATIENT_SETS_ADDRESS`, `PATIENT_SELECTS_SHIP_DATE` |
| `tracking` | `FILL_RX`, `READY_RX`, `SHIP_RX`, `DELIVER_RX` |

Shared helpers (`inFulfillmentTail`, `assignment`, `prePicked`, `pricingExit`) move to one `shared.ts`, because `CONFIRM_CONSENT` and `VERIFY_PA_APPROVED_OTP` both use them.

**2.4a Ids and the fixture.** Add `id` to each rule and record the order and matrix fixture. No behavior change.

**2.4b Move.** One file per module under `workflows/coassist/modules/`. `rules.ts` becomes the assembly: concatenate in a fixed order (spine before `provider_transfer`, and `payment` before `financial_assistance` before `cash_offer`). Filters stay as they are. The rule order per event and each rule's applicability must not change. The fixture's event keys are now sorted, so moving a rule never reshuffles the file.

**2.4c Derive the scope.** A rule declares where it applies instead of listing scenarios. Two forms:

- `{ module, props? }`: applies to a scenario whose recipe includes that module (with those props). `provider_transfer` is DME only because only the DME recipe lists it.
- `{ fork, exit? }`: applies where that fork applies (and has that exit). `SELECT_PRICING_OPTION` follows the `pricing` fork, so DME never gets it. The two `SUBMIT_PA` rules follow the two `bi` forks.

`cash_offer` needs a `variant` prop so DME keeps its SMS rules and DTP and Copay keep `DENY_PA` and `SEND_CASH_OFFER`. All 13 filters can be derived this way. The recipes gain `variant` on `cash_offer`.

**Decision for 2.4c.** DME has `cash_offer` in its recipe, because the no-coverage path uses it. If the `pa_denied` variant were not separate, DME would gain `DENY_PA`, the known gap from 2.2. Splitting by variant keeps DME as it is today. Giving DME a real denial is a separate step with its own screens and fixture.

## 2.5 design

**2.5a (done).** Every one of the 42 route rules has an id, and `coassist-screens.json` records, per scenario, the route rules in the order they are tried, the menu, and the sticky screens.

**2.5b (done).** Screens and route rules live in `workflows/coassist/modules/screens/<module>.ts`. `modules/slots.ts` declares 13 slots (gate, awaiting, transfer, pa_notice, pricing, pharmacy, shortcut, cash_offer, address, date, payment, tracking, fallback) and the menu group order. Every `scenarios:` filter became a `scope`: `STANDARD_BI` (fork `bi`, exit `coverage_found`) for DTP and Copay, `DME_BI` (exit `pharmacy_covered`) for DME, `{fork:"pricing"}`, `{fork:"copay"}`, or a module and variant. Menu screens are scoped by module, so a recipe without `scheduling` drops those screens. `coassist-route-order.json` freezes the old order. The walk test holds the new one to it, and fails when I move `shortcut` after `tracking`. `coassist-screens.json` changed in route order only. Menu and sticky are identical.

**2.5c (done).** `Screen.skipped(data)` leaves a screen out of the menu when the data skips it. `menuFor` takes optional data, and the patient `Header` passes it. A pinned pricing pick hides Benefit Pricing. It hides Copay Enrollment too, unless the pin is the self-pay offer the patient must confirm. Routing is untouched. The recorded menu is the no-data catalog, so it did not change. The CRM stage ladders for DTP and Copay stay hard-coded in `coassistLadders.ts`. That is its own step.

**2.6 (done).** The composition proof. `COA_COMMERCIAL_TRANSFER_RECIPE` is commercial coverage, PA approved, Retail, a pharmacy the patient selects, delivery, with no `scheduling` and no `payment`. It is not pickable (no scenario id, by decision: recipe-only proof). `coassist.composition.test.ts` builds a machine and screen map around it, with no new rule, route, or screen. It shows no scheduling or payment screen in the menu or on any route, rejects `PATIENT_SETS_ADDRESS`, `PATIENT_SELECTS_SHIP_DATE`, `PATIENT_PAYS`, and `VERIFY_PAYMENT`, and reaches delivery at the tracker. The first run failed twice, and both failures were real gaps. Scheduling and payment events were callable with the module absent, so they got `{module}` scopes. Their route rules stayed visible because one scope per rule could not say both "this module" and "this branch", so `scope` now accepts a list that must all hold. No current scenario changed: all three recipes list both modules, and the rules fixture matrix is identical.

**Still open after 2.6.** Module absence is enforced for scheduling, payment, cash_offer, provider_transfer, and the DME pharmacy pick. Other unscoped rules still apply when their module is missing. The generic `SELECT_PHARMACY` rule is one, and DTP relies on it without listing `pharmacy_selection`. Closing that is its own step. Making the proof pickable needs a scenario id, so the rule 7 `flowType ===` cleanup in about 20 pages comes first.

**What the recorded order shows.** The first match wins, and the modules interleave in the order a patient meets them. Module runs, in route order:

| Scenario | Runs |
|---|---|
| DTP | enrollment, pa_notification, payment, scheduling, cash_offer, payment, scheduling, tracking |
| Copay | enrollment, pa_notification, payment, tracking, scheduling, cash_offer, payment, scheduling, tracking, scheduling, tracking |
| DME | enrollment, provider_transfer, pa_notification, pharmacy_selection, tracking, cash_offer, scheduling, payment, tracking, enrollment |

`payment`, `scheduling`, and `tracking` each appear several times. A spine with one position per module cannot reproduce this. The spine has to be slots: a declared list of stages, with each route rule sitting at a slot and its module owning it. Reproducing today's exact order needs about as many slots as there are rules.

**The ordering decision** (see the question to the user): keep the recorded order exactly, relax it and prove equivalence by behavior, or leave the route list in one file and derive only scope and menu from the recipe.

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
