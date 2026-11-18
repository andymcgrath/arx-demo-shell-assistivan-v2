# Build prompt: Abivax CoAssist, denied PA, Bridge, appeal, two dispense legs

Client: `abivax`. Read `CLAUDE.md` first. Its rules apply. Ask which tag prefix to use before the first tag. Run `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Never tag a red build.

This replaces `PROMPT_BRIDGE_VARIANT.md`. Tag `abivax/12-bridge-variant` built the first part. This prompt covers the rest of Andy's sequence.

## The story (Andy, 17 Nov 2026)

1. CoAssist eRx. In the EHR the HCP picks Abivax Direct as the pharmacy and submits the enrollment.
2. The patient gets a text and completes the information confirmation, consent, signature, and document upload.
3. The case manager opens BI in the CRM. It shows covered, PA required. The PA fires on its own.
4. The case manager opens the PA. It is denied. The appeal starts on its own. The Bridge is offered.
5. The patient gets a text and enrolls in $0 copay, confirms the delivery address, sees a confirmation, then the tracking screen.
6. The case manager transfers to ARx, the non-commercial pharmacy. It receives the Rx, ships, and delivers.
7. The appeal is approved. The case manager transfers to Abivax Direct, the commercial pharmacy. It receives the Rx, ships, and delivers.

Pharmacies:

- **ARx, non-commercial (Bridge, free drug):** `program.transferPartner` in `brands/abivax/brand.json`. Already set to ARx Patient Solutions Pharmacy.
- **Abivax Direct, commercial:** `program.specialtyPharmacy`. It is empty. Andy approved a made-up, realistic US address. Fill it with this representative data (the 555 phone number is a reserved fictional range):
  - Abivax Direct Pharmacy, 1800 Maitland Commerce Way, Suite 120, Maitland, FL 32751, (407) 555-0134.

## What tag 12 built

The `bridge` variant of `cash_offer`: after a denied PA, a free-supply text and a supply screen. No price. The trigger defaults from intake (`erx` is `system`, `fax` is `agent`). It added a CRM send button, a Field email, a tracker rung, and tests (`engine/__tests__/coassist.bridge.test.ts`).

## What differs from the story

1. **Wrong pharmacy.** `BridgeSupply.tsx` reads `program.specialtyPharmacy` (Abivax Direct). The Bridge is dispensed by ARx, so it must read `program.transferPartner`.
2. **No $0 copay or address in the Bridge step.** The built screen is information only. The story has the patient enroll in $0 copay and confirm the address inside the Bridge text. Copay today unlocks only after the PA approval is verified (`copayUnlocked` in `modules/financial_assistance.ts`), which never happens after a denial. Change the precondition to "the Bridge text is verified" when the recipe has a Bridge. Copay at $0 is a price of 0 with no pricing screens. Scheduling here is the delivery address and the delivery date (Andy confirmed, for consistency with the other demos). Use the existing `scheduling` block.
3. **No appeal in CoAssist.** `appeal` has a contract in `engine/workflow/components.ts` and rules only in iAssist. Build CoAssist appeal rules: the denial starts the appeal on its own (`system`), and the appeal decides later. Add an `appeal` fork with exits `approved` and `denied`. The demo pins `approved`. Per rule 14 the presenter has no branch buttons. Offer a second demo with `denied` (the patient stays on the Bridge) only if Andy asks.
4. **Two dispense legs.** The story dispenses twice: ARx, then Abivax Direct after the appeal. Today `selectedPharmacy` and `tracking` run once. Build a second pharmacy hand-off and tracker cycle, each with its own receive, ship, and deliver steps ("pharmacy receives Rx" is its own step). The patient confirms the delivery address and date for both shipments (Andy confirmed). The second leg asks again, prefilled from the first, and the date is a fresh pick. Declare `needs` and `sets` (rule 4) and add the ordering test: the second leg is rejected until the appeal is approved and the first leg is delivered.
5. **eRx pharmacy pick.** Step 1 maps to `pharmacy_selection` variant `prescriber` (as in `CoA_APA_Specialty`) with Abivax Direct. Keep the pick on the case so leg 2 reads it.
6. **Patient onboarding on the first text (step 2).** Andy means the patient portal, not the EHR. He wants the onboarding the Fax Standard patient flow already captures: text, code, confirm details, consent, signature, insurance upload, then enrollment complete (`workflows/standard/screens.ts`). The pages exist: `/consent`, `/signature` (`Signature.tsx`), and `/upload-insurance` (`UploadInsurance.tsx`). CoAssist today stops at a combined Confirm Details and Consent screen (`modules/screens/enrollment.ts`) and does not route to the signature or upload pages. Reuse the existing pages. Build no new screens.
   - Add the two screens to the `enrollment` block as an optional prop (for example `capture: ["signature", "upload_insurance"]`), so other CoAssist recipes keep today's flow. Their fixtures must not move.
   - Add the route rules (rule 13) after consent and before enrollment complete, and the menu entries. Check that `Signature.tsx` (`nextPath`) and `UploadInsurance.tsx` (the route lookup) land on the right screen in a CoAssist recipe, since they were written for Fax.
   - Declare `needs` and `sets` (rule 4). The headless test reaches enrollment complete only after both.
7. **Demo entry.** The uncommitted `coassist-copay-bridge` demo in the brand file points at plain `CoA_Copay` with `pa: approved`. Replace it: this story pins `pa: denied`, with its own block list. Give it a label that matches the dropdown numbering.
8. **Catalog.** `catalog/forks.ts` has about 390 uncommitted lines. Read them before touching the file. The `denied` exit's `leadsTo` needs `appeal`, `financial_assistance`, `pharmacy_selection`, `scheduling`, and `tracking` so the canvas does not grey those cards.

## Steps

1. Fix 1 and 7 (small). Tag.
2. CoAssist appeal block and fork (3). Headless test: denial, appeal starts, appeal approved. Tag.
3. The Bridge step with $0 copay and address (2). Tag.
4. Two dispense legs (4, 5). Ordering test and rule 12 invariant. Tag.
5. Report what was built and what was not.

## Fax

Fax workflows have no blocks, so the `agent` trigger path only runs in a workflow built on blocks. Do not build the Fax version here. Andy has not decided whether Fax converts to blocks.

## Stop and ask Andy

- Does the denied-appeal outcome need its own demo?
