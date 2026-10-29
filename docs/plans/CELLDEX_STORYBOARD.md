# Default demo:

Commercial patient, medical benefit, PA approved

## iAssist (HCP), start the submission.

- The HCP opens the standard iAssist onboarding. This is the same setup as today.
- The enrollment form has no Rx and no order. It carries the prescriber, barzolvolimab (injection, correct dosing), the indication-matched ICD-10, insurance, and site of care.
- A consent choice appears. The HCP can’t sign for the patient, so they pick “text the patient.” The in-office attestation checkbox is the alternative.

## iAssist, eMedBV.

- The HCP runs medBV. The checklist modal appears, then “Get MedBV.”
- The results modal shows B&B covered with coinsurance and PA required, provider in network with administration copay and no PA, and deductible and OOP bars.
- The Figma “Buy and Bill Information” screen follows. It has the collapsed copay card with balance.
- The HCP enrolls the patient in copay. The card shows Active, with benefit period and year-to-date spend.

## iAssist, submit.

- The HCP submits. The status dashboard shows the Enrollment and Prior Authorization cards as submitted. There is no Prescription card.
- The “Submission complete” side panel appears.
- New: A Copay Claim button sits next to View Submission.

## Patient UI, the text.

- The patient gets a text because the enrollment arrived. This is the standard SMS, phone, and OTP gate.
- The patient confirms details and consent, then sees “Enrollment complete.”

## CRM, benefit investigation.

- Intake shows enrollment received and the text sent.
- The BI record is the medical benefit record, pre-filled from iAssist. Because there’s no permanent J-code yet, the presenter edits a field or two and saves, which marks BI done.

## CRM, PA.

- The PA starts automatically once BI completes and says a PA is required. It sits at waiting, then flips to approved.
- Appeals are skipped, with no card.

## CRM, financial assistance.

- The card shows copay enrolled by the HCP in iAssist, with the program, approval, effective, and expiration dates.
- There is no triage and no order status. The last CRM stage is PA Approved.

## Patient UI, approval text.

- “You’re approved. Your prescriber has been informed. Contact them to confirm your injection date.”
- There is no pricing, payment, or copay screen.

## iAssist, back to the HCP.

- New patient view: The HCP clicks the patient on the dashboard.
- The history item opens the detail view. It has uploads (SOB, PA approval notice with auth number and expiration, enrollment form, PA form), notes, and the Buy and Bill section with the expanded copay card (balance, spend, transactions).
- The HCP clicks Copay Claim. The claim modal takes prescriber, patient search, date of service, and a faux CMS-1500 and EOB upload.
- The Submitted success modal appears. The claim lands in the transaction history.
- The Field portal shows the stages (Enrolled, BI, PA Approved, copay enrolled) and the SOB and enrollment form as display-only docs.

# PAP variant (second demo)

## Scenes 1 to 5 are the same, but BI finds no coverage.

- The CRM routes to financial assistance. The patient UI shows the existing FA screens: credit check consent, household size and income, then the result.
- The CRM then shows Triage to Pharmacy and Order Status for free drug going to the site of care.
- The patient confirms the appointment date and the doctor’s office, not a home address.
- iAssist shows the patient view with the PAP shipment status.

## Generic forms to create (like the enrollment form)

- Medical benefit PA form
- Summary of benefits (SOB)
- PA approval notice
- Copay card, with generic branding
- CMS-1500 sample and EOB sample, for the faux upload
- FA result letter, for the PAP variant
