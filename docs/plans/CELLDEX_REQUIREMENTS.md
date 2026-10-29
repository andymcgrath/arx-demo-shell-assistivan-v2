# Celldex demo requirements

Sources: Teams thread (10/13 to 10/20/26), the 10/20 prep call with Brok, Timothy, Shawn, Alex, and Jared, and the reference screens. The call supersedes earlier chat notes where they differ. Purpose: end-to-end demo for the Celldex RFP defense (next Thursday).

## Context

- **Client:** Celldex Therapeutics. Drug: barzolvolimab (Phase 3, approval expected next year). No product site. Use the name and celldex.com branding.
- **Program type:** Monthly, HCP-administered injection, in-office. Medical benefit.
- **Model:** Buy and bill (B&B) with medBV, PA, and copay.
- **Priority:** Copay. It is a key RFP piece. Show the HCP copay experience: enrollment, balance, claim submission, claim history.
- **Not a live program:** This is a new design. Apellis is the nearest comparison.
- **Brand rule:** Client and drug names live only in `brands/<slug>/brand.json`.
- **No product supply in the default path.** The HCP orders from their own wholesaler. Free drug ships from our pharmacy only on the PAP or QuickStart path.

## Workflow shape

One workflow. iAssist starts. One default scenario (commercial, covered, PA approved). One optional alternative if the lift is small.

- **Default demo:** Commercial patient with medical benefit coverage. PA approved. Copay enrolled by the HCP. No triage. No order.
- **PAP fork (in scope):** BI finds no coverage. Route to financial assistance, then triage to pharmacy to dispense free drug to the site of care. Reuse the existing FA screens (credit check consent, household size and income, result). Declare it in `forks.ts`. Story chooses. No presenter buttons. Ship as its own demo. A PA denial or delay can use the same exits later, but it is not required for Thursday.
- **Appeals:** Skipped. The PA is approved.
- **Scheduling:** B&B hub does no scheduling. The patient text tells them to contact their physician.
- **BI and PA ordering:** The HCP collects everything in iAssist once. The CRM then runs BI and PA automatically, in order. PA waits for a completed BI that says a PA is required. This is rule 11 on the `erx` intake channel: the PA is a `system` step triggered by BI completion. The earlier call notes said "PA submitted through iAssist." Model it as above. The iAssist screens show the PA as initiated, then the CRM carries it.
- **Last CRM stage (default):** PA Approved.

## Building blocks (scenario: iAssist Buy and Bill)

Branch: `feature/buy-and-bill-demo`. New scenario `iAssist_Buy_And_Bill` on the existing iAssist workflow. It sits beside `iAssist_PA_Approved`, `iAssist_PAP`, and `iAssist_Medical_Transfer`. It is a recipe of modules (see `client/workflows/iassist/recipes.ts`). It adds no machine code, no `flowType ===` checks, and no client names in source.

Note: you wrote "Build and Buy". I read that as Buy and Bill.

| Block | New or reuse | Configurable by | Used by |
|---|---|---|---|
| `enrollment` | Reuse | Variant `no_rx`: enrollment form with no prescription or order | Buy and Bill, PAP |
| `benefit_verification` (medBV modal) | Reuse the BI fork and `benefits` panel | Benefit type (`medical`), result values, PA required | Buy and Bill |
| `pa_notification` | Reuse | Variant `hcp_administered`: text says contact your physician to confirm the injection date | Buy and Bill |
| `patient_record` | New | Sections shown (enrollment, buy and bill, prior authorization, documents), notes on or off | Buy and Bill, PAP |
| `copay` | New | Card display, balance, transaction list, enrolled by `hcp` or in the CRM | Buy and Bill |
| `copay_claim` | New | Entry button, claim fields, success modal | Buy and Bill |
| `financial_assistance` | Reuse | Variant `site_of_care`: confirm appointment date and doctor's office | PAP exit of Buy and Bill |
| `triage` and `tracking` | Reuse | Only the PAP exit includes them | PAP exit |

Rule 6 check: `patient_record` is used by both the default and PAP demos, so extract it. `copay` and `copay_claim` are split so a later program can take the card without the claim flow. Keep them separate modules.

**Forks.** Reuse the BI fork. Default exit: `medical_pa_required`. Alternate exit: `no_coverage`, which requires `financial_assistance`. The PA fork stays `approved`. Do not add presenter buttons.

**Rules (rule 11, 12).**
- `copay.enroll`: allowed only when the submission exists. Sets `copayEnrolled`.
- `copay_claim.submit`: allowed only when `copayEnrolled` holds. Appends to the claim history.
- `pa.start`: `system` step. Fires after BI completes and says a PA is required. Same precondition as every other iAssist scenario.
- The invariant test must reject `copay_claim.submit` before enrollment.

**Screens (rule 13).** Each module contributes its screens and route rules. The scenario adds `patient_record`, `copay`, and `copay_claim` entries. The menu is generated. A test checks every visited screen appears in the menu.

**Demos.** Add two entries to the Celldex `demos` list: Buy and Bill (default) and Buy and Bill with PAP (`no_coverage`). The existing three demos stay as they are.

**Tests (rule 8).** One headless event list per demo. Default: enrollment, BI complete, PA approved, copay enrolled, claim submitted, ends at PA Approved. PAP: no coverage, financial assistance result, triage, ends at the site-of-care confirmation.

## Requirements by app

### iAssist (HCP)

1. Start with an enrollment form. No prescription and no order. This replaces the earlier eRx-to-distributor idea.
2. Remove the old SYFOVRE content. Use barzolvolimab, an injection, and correct dosing.
3. Default the diagnosis code to the drug's indication.
4. Run medBV. Show medical benefit results (coverage, coinsurance, deductible and OOP bars). Pharmacy benefit results are optional.
5. The submission carries what the CRM needs to run BI, then a medical benefit PA, in order. The HCP does not start the PA separately.
6. HCP copay enrollment in the flow. Show the copay card, status Active, benefit period, and year-to-date spend. Reference: Figma "Step 6: Buy and Bill Information."
7. Consent: The HCP cannot sign for the patient. Offer two options: ask us to text the patient for consent, or an in-office attestation checkbox. The demo uses the text.
8. **Patient view (new).** Today the dashboard's patient link goes nowhere. Build a patient view in the iAssist brand (not the client brand). Two reference versions exist, one per client. Keep our layout: patient header, submission status cards, and history table.
    - **History item detail:** Click a history row to open the detail view. It shows uploads, notes (add and delete), then sections for enrollment, Buy and Bill, and prior authorization, each with a download. Attachments cover SOB, PA approval notice (auth number and expiration), enrollment form, and PA form.
    - **Buy and Bill section:** Contains the collapsible Copay Information card. Collapsed: current balance. Expanded: copay card, status, benefit period, year-to-date spend, and transaction history.
9. **Copay claim.** Add a "Copay Claim" button next to View Submission on the status dashboard. It opens the claim modal directly. The Figma selection modal (Start Workflow vs Copay Claim) is not needed, because the button replaces it.
    - **Claim modal (Figma):** Prescriber, patient search (or add new patient), date of service, and document upload (CMS-1500 and EOB, JPG, PNG, or PDF, 19MB max). Add-patient fields: first and last name, DOB, sex, zip, email, phone. Next leads to the upload step.
    - **Success:** Show the "Submitted success" modal. The claim then appears in the copay transaction history.
    - **Upload:** The standard Assistivan has no upload function. Demo it as a faux upload (pick a sample CMS-1500 and EOB). Store nothing.
    - **Rebrand:** The Figma copy says UCB. Change to the brand's manufacturer and drug name from `brand.json`.
10. PA approval communication. The HCP sees PA approved, auth number, expiration, SOB, and remaining copay balance.
11. Rules tab talk track is still open.

### CRM

1. **Intake:** Enrollment received. A text goes to the patient.
2. **Benefit investigation:** Medical benefit record. Pre-fill from iAssist. The presenter edits a field or two and saves to mark BI done. No permanent J-code exists yet, so manual outreach fills the rest. Fall back to talking through it if the edit is not feasible.
3. **PA:** Already submitted through iAssist. Status shows waiting, then approved.
4. **Appeals:** Skip.
5. **Financial assistance:** Show copay enrollment approved, done by the HCP in iAssist. Add balance or claim detail if screenshots fit.
6. **Triage:** None on the default path. Brok can speak to it. On the optional fork, show "Triage to Pharmacy" for free drug dispense.
7. **Order status:** None on the default path. On the optional fork, show the order shipped to the site of care.

### Patient UI

1. Patient gets a text because enrollment arrived. Show consent capture. The "get help" link auto-populates the sign-in number.
2. Commercial path: no pricing, no payment, no copay screen. Final message: approved, your prescriber is informed, contact them to confirm your injection date (or they already have an appointment).
3. Optional fork (PAP): confirm the appointment date and the injection location. The location is the doctor's office, not a home address.

### Field portal

1. Tie to the demo patient.
2. Show journey stages aligned to the CRM: Enrolled, BI, PA Initiated, PA Approved, copay enrolled.
3. Show related docs: SOB and enrollment form. No upload function exists, so display only.

## Reference screens (folder: Demos/Barzolvolimab| Celldex)

- **iAssist "Step 6" (Figma):** Prescriber, medication, NDC, ICD-10, supplies, office, address, and a collapsible CoPay card with balance and a transaction list (type, amount, status, service date, denial reason).
- **eMedBV modal (Figma):** B&B covered (J-code, coinsurance, PA required), provider in network (CPT, copay, no PA), deductible and OOP bars, plan details. Results appear only after insurance is entered. Both Figma screens still show SYFOVRE content.
- **CRM:** BI result record, eMedBV checklist modal, copay claims search and detail, order record, stage cards, Order Status stage.
- **B&B HCP workflow PDF (other client):** Intake, procurement, scheduling, claims, remittance, analytics. Portal touchpoints: summary of benefit, PA check, copay balance, copay claim status.
- **Scope:** Intake through PA approval plus copay. Skip procurement, scheduling, claim scrub, remittance, analytics.

## Assets and inputs needed

| Item | Owner | Status |
|---|---|---|
| Figma: copay claim submission flow for iAssist | Alex | Searching |
| Figma: other copay screens | Alex | Will tag Andy |
| CRM screenshots for copay balance and claims | Shawn | Provided (claims, claim detail) |
| Celldex logo and branding | Jared | Received |
| Barzolvolimab name | Jared | Confirmed |

## Open questions

1. **Financial assistance stage (CRM, default path):** The CRM stage card has fields for Financial Program, Effective Date, Program Approval Date, Expiration Date, and Denial Reason. Proposal: fill program name, approval date, effective date, and expiration so it reads "copay enrolled by HCP." Keep the balance in iAssist, where the HCP checks it. Does that work for Brok?
3. **Rules tab:** What is the talk track?
4. **Indication, J-code, ICD-10:** Use representative values unless Celldex provides them. The CRM shows no permanent J-code yet, which fits an unapproved drug.
5. **PAP fork inputs:** The patient UI asks for household size and income, and the result returns to iAssist. Confirm the result values (approved, denied, or income-based tier).

## Decisions made

- The call overrides the earlier chat. Enrollment form only. No order. No distributor.
- Default demo ends at PA Approved.
- PAP fork is in scope. It uses the existing financial assistance screens.
- BI and PA originate in iAssist and run in order in the CRM.
- Copay is an HCP action in iAssist. The patient UI shows no copay or pricing.
- No upload feature. Documents are display only.
- No scheduling in the B&B hub.
- Appeals are skipped.
- Triage and order status appear only on the PAP fork.
