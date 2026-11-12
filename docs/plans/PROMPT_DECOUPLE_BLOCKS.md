# Build prompt: independent financial assistance blocks, then Abivax

Goal: `income_qualification` (PAP), `copay`, and APA work as blocks any recipe can list, in any combination. Then build the Abivax demos on them.

Why: with no coverage a patient may qualify for PAP, or may pay cash, or may use the manufacturer copay program. With coverage a patient may use copay or PAP. A recipe declares which of these exist. Blocks never know about each other (CLAUDE.md rules 3, 4, 5).

Tag prefix for the decoupling and the fork: `refactor/`. Run `git tag -l 'refactor/*'` for the next number. Abivax work switches to `abivax/` only when Andy says so.

Do these in order. Run `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Never tag a red build.

## What is true today

- APA is already a block: `prior_authorization` variant `apa` (`client/workflows/catalog/blocks.ts`, `coassist/modules/prior_authorization.ts`). Used by `CoA_APA_Specialty`. No change needed.
- `income_qualification` is coupled to the no-coverage path:
  - The shared rules (`workflows/shared/income.ts`) need only `biStatus === "complete"`, but the CoAssist copy (`coassist/modules/income_qualification.ts`) is scoped to the module only. Its start event `SEND_PAP_SMS` fires from `pap_transfer.verify_sms`. Without `pap_transfer`, nothing fires it.
  - It sets `papStatus: "active"` to clear dispatch and assumes no PA exists. In a covered-BI recipe the PA also sets approval, so the two signals can disagree.
  - `pap_transfer` is the `no_coverage_pap` BI exit. The recipe `COA_PAP_RECIPE` is the only user in CoAssist.
- `copay` is coupled: `coassist/modules/financial_assistance.ts` is scoped to `fork: "copay"`, needs `paApprovedOtpVerified`, and only unlocks a reduced price on the `pricing` fork. iAssist has its own separate `copay` block and `financial_assistance` module. Read both before merging.
- The patient pricing screen has two renderings in `client/portals/patient/pages/BenefitPricing.tsx`. `DefaultBenefitPricing` (CoA_DTP, iAssist_PA_Approved) shows Retail, Mail, then a card labeled "Copay Program" that is really the `self_pay` exit. `CopayBenefitPricing` (flows with the `copay` fork) leads with copay. The old one was left untouched, not kept on purpose (commit `41a117e`).

## Decisions already made (Andy)

1. PAP, copay, and self-pay can all be in one recipe. The patient's outcome is one of them. Qualifying for PAP does not commit the patient: they can qualify, then still pay out of pocket or use the copay program. So split two events:
   - **Qualify:** the eIncome result. It sets `incomeStatus: "verified"` and an eligibility flag. It does not set `papStatus: "active"` and does not clear dispatch.
   - **Choose:** the fork pick. Choosing PAP sets `papStatus: "active"` and clears dispatch. Choosing copay or self-pay does the pricing and payment path.
   The fork holds the "one outcome" rule. No block knows about another. A recipe may still opt in to a case where the patient takes both, but that is not the default.
2. Relabel the DTP and iAssist "Copay Program" card as Self-pay. Do not reorder it or retire it.
3. Copay is a price modifier. When `copayEnrolled` is set, `payment` and `pricing` read it. With no price in the recipe, copay still enrolls and approves. Copay does not need the `pricing` module.

## Steps

1. **Baseline.** Record the test count and `.typecheck-baseline`.
2. **Decouple blocks.** For `income_qualification`, `copay`, and dispatch clearance:
   - Declare `needs` and `sets` (rule 4). Income needs a verified patient and a completed BI. It sets `incomeStatus` and `papStatus`. Copay needs a verified patient and sets `copayEnrolled`.
   - Make the first step's trigger a block prop: `system`, `agent`, or `patient` (rule 11). `CoA_PAP` keeps its current trigger through `pap_transfer`. New recipes can start income on a timer.
   - Scope rules by the block being in the recipe, not by a BI exit or fork id.
   - Split `VERIFY_INCOME` from PAP activation (decision 1). Today it does both. `CoA_PAP` and the PAP workflow must keep their current behavior: in a recipe with no other outcome, qualifying activates PAP right away. Do this with a block prop, for example `activate: "on_qualify"` (today's behavior) or `"on_choose"`.
   - Make dispatch clearance one shared signal that PAP activation, copay or self-pay payment, and PA approval can set.
   - Add the rule 4 test: it fails when a recipe orders these blocks wrongly.
   - Merge the iAssist copay block into the shared one only if the iAssist fixtures stay identical. If they would change, stop and report.
   - `CoA_PAP`, `CoA_Copay`, `CoA_Web_Copay`, and iAssist fixtures must not change. If one changes, do not record it. Stop and read the diff.
   - Tag `refactor/NN-decouple-assistance-blocks`.
3. **Assistance fork.** One patient-chosen fork, exits PAP, copay, and self-pay. Each exit `requires` its block, the same way `denied` requires `cash_offer`.
   - The exit set comes from the recipe. A recipe with only `income_qualification` offers PAP only.
   - The PAP exit is offered only after the patient qualifies. Copay and self-pay are offered whenever their blocks are in the recipe. The patient can qualify for PAP and still pick copay or self-pay.
   - The patient's final outcome is one exit. A recipe may opt in to allow more than one.
   - The brand test rejects a pin to an exit the recipe lacks.
   - Generate one headless test per allowed exit for every recipe that lists these blocks (rules 8 and 12).
   - Relabel the DTP and iAssist card as Self-pay. Update the fixtures that carry the label and read the diff.
   - Tag `refactor/NN-assistance-fork`.
4. **Abivax eRx recipe.** Start from `CoA_APA_Specialty` and add `copay` and `income_qualification`. PAP approves on its own through a `system` trigger, so nobody has to click the CRM. Add Field events for both blocks. Brand file `brands/abivax/brand.json` extends `assistivan`. Tag `abivax/01-...` after Andy confirms the prefix.
5. **PrES and PES: Abivax scenario 2.** Scenario 1 is the eRx CoAssist story. Scenario 2 is what the sales team runs next: one web start with two audiences, HCP (PrES) and patient or caregiver (PES). Build it as one scenario with an `audience` fork (exits `hcp` and `patient`, `chooser: story`). Per rule 14 the presenter has no branch buttons, so the brand file lists two demos on that scenario, one per exit. The site's "I am a Healthcare Provider" and "I am a Patient or Caregiver" buttons are what a visitor would click. Andy confirmed two dropdown demos. Do not add features to `PrES_PAP` (`legacy: true`). The scenario reuses the same blocks and needs:
   - A web start with an audience choice ("I am a Healthcare Provider", "I am a Patient or Caregiver"). `client/portals/web` already has an audience header.
   - A services page for each audience. PrES: Abivax Patient Enrollment, Copay Enrollment, Patient Assistance Program, Upload Documentation. PES: Patient Authorization, Copay Enrollment, Patient Assistance Program, Upload Documentation.
   - A new `enrollment` variant for PrES: the HCP completes the form on the web page, which fires the referral, then the patient gets the default text, code, and consent. The existing `web` variant skips those on purpose.
   - The HCP form pieces sit on the unmerged `boehringer` branch (`CoA_HCP_Enroll`). Ask before merging.
6. **Report.** What was built, what was not, and the final test count and type-error baseline.

## Stop and ask Andy

Do not invent answers to these.

- Does the patient see copay and PAP before or after the PA is approved? The existing Copay flow shows them after the approval text.
- Does the Abivax eRx demo keep pricing and payment screens? The plan assumed no, but self-pay and copay need a price and a payment. If the patient can pay out of pocket, the answer is probably yes. Confirm.
- In the Abivax eRx demo, does the patient run eIncome before the choice screen (qualify first, then choose), or does choosing PAP open eIncome? The first needs the two-event split above. The second is simpler but cannot show "I qualified and still chose to pay."
- Do Copay, PAP, and Upload Documentation open working screens in PrES and PES, or only appear as menu items?
- In PES, no HCP starts the case. Who supplies the Rx? The unbuilt Sanofi request has the same shape.
- Abivax inputs for the brand file: drug name, brand colors with a source URL, logos.
