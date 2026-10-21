# Demo 4: iAssist Buy and Bill

The commercial path. The medical benefit covers the drug and a PA is required. The patient consents by text.

Flow type `iAssist_Buy_And_Bill`. Picks: `bi: medical_buy_and_bill`, `pa: approved`, `consent: patient_text`.

## Flow

1. **The HCP starts in iAssist.**
   - Patient information: consent is set to Via Text. The HCP only acknowledges that the patient will get a message. The PHI authorization and the Income Verification block are hidden, because the patient handles both in the patient app.
   - Medication: the Site of Care tab starts on the patient's site. Picking another site fills its HOPD NPI and TIN.
   - Insurance: after the HCP selects or adds insurance, Run eMedBV shows a progress bar, then the results. The card shows a check, "eMedBV complete. Buy and bill covered, prior authorization required.", and a one-line summary of the result.
   - Clinical: the diagnosis starts on the brand's indication. Supporting documents are optional.
   - Prior authorization: the payer details, diagnosis, treatment plan, and reason for prescribing prefill. The letter of medical necessity shows an upload when the answer is Yes.
   - Buy and Bill: the HCP enrolls the patient in copay. The office comes from the site-of-care list. Submit needs eMedBV and copay done.
2. **Submitting is the referral.** No Rx and no order go out. BI starts on its own.
3. **The patient gets a text.** They verify the text and the code, consent, then confirm household size and income. A 3 second credit check runs, then a "You are qualified" screen. Got it lands on the home screen. The enrollment screen says benefits are being checked.
4. **The CRM runs BI, then the PA.** The agent opens the BI stage and the result lands in about 3 seconds: medical benefit covered, PA required. The PA starts on its own. The agent opens the PA stage and it approves in about 3 seconds. Financial Assistance shows copay enrolled by the HCP, with the remaining balance.
5. **The patient is told.** They verify the PA-approved text and code. The final screen says they are approved, their prescriber is informed, and they should contact the office to confirm the injection date.
6. **The HCP sees the result in iAssist.** Open the patient from the dashboard.
   - Status cards fill in as steps finish, under a progress bar.
   - The copay card shows the program, member ID, effective date, and remaining balance.
   - History lists the submission and its documents. Names open a sample PDF. Download All Files works.
7. **The HCP files a copay claim.** A History row opens the claim detail. The CRM Copay tab and the Field Related tab show the enrollment and claims. The modal is locked to the open patient: prescriber, date of service, CMS-1500, EOB. A confirmation modal follows, then a toast. History gets a row marked In review. The balance does not change until the program approves the claim.

## Field portal

- Related tab: Copay Enrollment and Copay Claims tables, the shared case documents, and a Patient Journey table (Enrolled, Benefits Investigation, PA Initiated, PA Approved, Copay Enrolled).
- Related Docs: the enrollment form and the summary of benefits. Display only, since no upload exists.
- Emails: eMedBV and copay enrollment send none. The copay claim sends one.

## Talk track

- iAssist is the starting point and the HCP does the copay work there.
- The referral carries what the CRM needs. The CRM adds manual outreach only where needed, such as a temporary J-code. The edit-and-save BI step is a talk track and is not built.
- Copay is for the HCP. The patient app shows none.

## Stage jump

1 Referral received. 2 HCP submitted (eMedBV, copay, referral). 3 Patient enrolled. 4 PA approved. 5 Patient verified. 6 Copay claim filed.

## Tests

`iassist.buyandbill.test.ts`, golden path `iassist-buy-and-bill`, and the ladder fixture `ladders/iAssist_Buy_And_Bill.json`.

## Shared documents and CRM details

- One list, `caseDocuments`, feeds iAssist, the CRM Related Documents tab, and the Field Related tab. Documents appear as the case reaches each step.
- The CRM benefits panel sections (Information, Pharmacy Benefits, Medical Benefits) collapse from the chevron.
- The CRM Copay tab shows program, member ID, status, dates, remaining balance, and claims. It appears only for scenarios with the copay module.
