# Demo 6: iAssist Buy and Bill, Free Drug

eMedBV finds no medical coverage. There is no PA and no copay. The patient applies for the free drug program, and approval sends the drug to the site of care. The patient pays nothing and sees no pricing.

Flow type `iAssist_Buy_And_Bill_PAP`. Pick: `bi: no_coverage`. It is its own scenario because its tracking and site-of-care screens are scoped to the recipe. They would redirect the commercial path if added to it.

## Flow

1. **The HCP runs eMedBV.** It shows "No medical coverage found", with no copay card. Submit needs only eMedBV.
2. **BI returns no coverage.** No PA starts. About 2 seconds later the application update text goes out on its own.
3. **The patient verifies the update text and its code.** They land on one screen with household size and income, prefilled from what the HCP entered, and the credit check consent. Submit approves the application.
4. **The approval screen** says they are approved for the free drug program and shows the site-of-care address.
5. **The agent triages to the site of care** in the CRM.
6. **The patient picks an appointment date,** reads the text confirmation, and sees the order tracker. The wording says "injection", not "infusion".

## CRM stages

Enrolled, Benefits Investigation (no coverage, free drug program), Financial Assistance (the application and its result), Triage to Site of Care, Order Status.

## iAssist record

- Cards: Enrollment, Free drug application, Appointment.
- The submission page has a Free Drug Program section: coverage result, credit check consent, household size and income, decision, site of care, appointment.
- Documents include the sample free drug application.

## Stage jump

1 Referral received. 2 HCP submitted (eMedBV). 3 Patient enrolled. 4 BI complete, no coverage. 5 Free drug approved. 6 Triage to site of care. 7 Appointment scheduled.

## Adding a denied outcome later

Approved is the only outcome today. A scenario that wants a denial adds an exit to a new `pap` fork and a module that handles it. The recipe check fails any pick that no module handles.

## Not built yet

- Field portal stages for this scenario. The Patient Journey table covers demo 4 only.
- A consent fork for this scenario. The patient always consents by text.

## Tests

`iassist.pap.test.ts`, golden path `iassist-buy-and-bill-pap`, and the ladder fixture `ladders/iAssist_Buy_And_Bill_PAP.json`.
