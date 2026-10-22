# Demo 5: iAssist Buy and Bill, Free Drug

eMedBV finds no medical coverage. There is no PA and no copay. The patient applies for the free drug program. A CRM agent approves it, the patient confirms an appointment date, and the agent triages the drug to the site of care. The patient pays nothing and sees no pricing.

Flow type `iAssist_Buy_And_Bill_PAP`. Pick: `bi: no_coverage`. It is its own scenario because its tracking and site-of-care screens are scoped to the recipe. They would redirect the commercial path if added to it.

## Flow

1. **The HCP runs eMedBV.** It shows "No medical coverage found", with no copay card. Submit needs only eMedBV.
2. **BI returns no coverage.** No PA starts. About 2 seconds later the application update text goes out on its own.
3. **The patient verifies the update text and its code.** They land on one screen with household size and income, prefilled from what the HCP entered, and the credit check consent. The review page asks them to confirm and submit.
4. **The patient sees "Application received."** It says the team will review the application and contact them with next steps. It does not say approved.
5. **The CRM agent approves.** The Financial Assistance stage shows In Review with the credit check consent, household size, and income. The agent clicks **Approve Application** in the stage header. It is an agent step, not a timer.
6. **The patient sees the approval screen.** It says they are approved and shows the site-of-care address. They pick an appointment date and read the text confirmation. The wording says "injection", not "infusion".
7. **The agent triages to the site of care** in the Triage stage. Choose Pharmacy stays disabled until the patient confirms the date. The patient's tracker then says the drug is on its way to Community Allergy and Immunology Practice.

## CRM stages

Enrolled, Benefits Investigation (no coverage, free drug program), Financial Assistance (the application and its result), Triage to Site of Care, Order Status.

## iAssist record

- Cards: Enrollment, Free drug application, Appointment.
- The submission page has a Free Drug Program section: coverage result, credit check consent, household size and income, decision, site of care, appointment.
- Documents include the sample free drug application.

## Stage jump

1 Referral received. 2 HCP submitted (eMedBV). 3 Patient enrolled. 4 BI complete, no coverage. 5 Application received. 6 Free drug approved (CRM). 7 Appointment scheduled. 8 Triage to site of care.

## Adding a denied outcome later

Approved is the only outcome today. A scenario that wants a denial adds an exit to a new `pap` fork and a module that handles it. The recipe check fails any pick that no module handles.

## Field portal

- Related tab: a Patient Journey table (Enrolled, Benefits Investigation, Financial Assistance, Triage to Site of Care, Appointment, Order Status).
- Related Docs: the enrollment form, then the free drug application once approved. Display only.
- Emails: BI sends "No Medical Coverage Found" with no PA task. The application update and the income submission each send one. eMedBV sends none.

## Not built yet

- A consent fork for this scenario. The patient always consents by text.

## Tests

`iassist.pap.test.ts`, golden path `iassist-buy-and-bill-pap`, and the ladder fixture `ladders/iAssist_Buy_And_Bill_PAP.json`.
