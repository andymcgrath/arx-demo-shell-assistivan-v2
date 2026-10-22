# Reading the recipes: demos 4 and 5

A recipe is data. It lists the **blocks** (step modules) a scenario uses and the **fork picks** that choose its path. The machine is shared. Source: `client/workflows/iassist/recipes.ts`, `forks.ts`, and the module files in `client/workflows/iassist/modules/`.

Terms:

- **Block:** a reusable step module. It owns its rules, its screens, and its stage labels.
- **Fork:** a point where the story picks a branch. The presenter never picks. Each pick is pinned by the demo in `brands/celldex/brand.json`.
- **Trigger:** who fires the step. `HCP` and `patient` click. `agent` is a CRM click. `system` fires on its own after a delay.

## Demo 4: iAssist Buy and Bill

Flow type `iAssist_Buy_And_Bill`. The medical benefit covers the drug and a PA is required.

### Fork picks

| Fork | Pick | What it does |
|---|---|---|
| `bi` | `medical_buy_and_bill` | BI finds medical coverage. A PA is required. No pharmacy benefit path. |
| `pa` | `approved` | The PA approves. The denied exit would need the `appeal` block, which this recipe lacks. |
| `consent` | `patient_text` | The patient consents in the patient app. `hcp_signs` (the HCP captures consent on the form) is declared but no demo uses it. |

### Blocks

| Block | Props | Contributes |
|---|---|---|
| `benefit_verification` | `benefit: medical` | The eMedBV run on the Insurance step. Sets `benefitsVerified`. |
| `copay` | `enrolledBy: hcp` | HCP copay enrollment, the copay card, and the CRM Copay tab. Needs `benefitsVerified`. |
| `enrollment` | `variant: no_rx` | The referral with no Rx, plus the patient's text, code, and consent. No household income step unless `income: "confirm"` is added. |
| `pa_notification` | `variant: hcp_administered` | The patient's PA-approved text and code, then the final screen ("contact your prescriber", "you will be notified of next steps"). |
| `patient_record` | none | The iAssist patient record: status cards, history, documents. |
| `copay_claim` | none | The Copay Claim button and modal. Needs copay enrolled and the `pa` fork. |

### Steps in order

| # | Step | Event | Trigger | Block | Fork read |
|---|---|---|---|---|---|
| 1 | Run eMedBV: medical covered, PA required | `RUN_MEDBV` | HCP | `benefit_verification` | |
| 2 | Enroll the patient in copay | `ENROLL_COPAY` | HCP | `copay` | |
| 3 | Submit the enrollment (the referral). BI starts on its own. | `REFERRAL_RECEIVED` | HCP | `enrollment` | |
| 4 | Patient verifies the text and code | `VERIFY_SMS`, `VERIFY_OTP` | patient | `enrollment` | |
| 5 | Patient consents | `CONFIRM_CONSENT` | patient | `enrollment` | `consent` |
| 6 | The agent opens the BI stage. The result lands in about 3 seconds. | `COMPLETE_BI` | agent | spine | `bi` |
| 7 | The PA starts after BI says a PA is required | `SUBMIT_PA` | system | spine | `bi` |
| 8 | The agent opens the PA stage. It approves in about 3 seconds. | `APPROVE_PA` | agent | spine | `pa` |
| 9 | Patient verifies the PA-approved text and code. The final screen follows. | `VERIFY_PA_APPROVED_SMS`, `VERIFY_PA_APPROVED_OTP` | patient | `pa_notification` | |
| 10 | The HCP files a copay claim from the patient record | `SUBMIT_COPAY_CLAIM` | HCP | `copay_claim` | `pa` |

Notes:

- Step 6 can run before step 5 finishes. BI does not wait for the patient.
- Ordering is enforced by preconditions. For example, step 8 is rejected until BI is complete and says a PA is required.
- With `income: "confirm"` on `enrollment`, a `CONFIRM_INCOME` step (patient) follows step 5.

## Demo 5: iAssist Buy and Bill, Free Drug

Flow type `iAssist_Buy_And_Bill_PAP`. eMedBV finds no medical coverage. There is no PA and no copay.

### Fork picks

| Fork | Pick | What it does |
|---|---|---|
| `bi` | `no_coverage` | BI finds no coverage. This requires the `financial_assistance` block. No PA starts. |

The `pa` and `consent` forks do not apply to this flow. The patient consents by text.

### Blocks

| Block | Props | Contributes |
|---|---|---|
| `benefit_verification` | `benefit: medical` | The eMedBV run. It shows no coverage and no copay card. |
| `enrollment` | `variant: no_rx` | The referral with no Rx, plus the patient's text, code, and consent. |
| `financial_assistance` | `variant: pap` | The application update text, the credit check and household income, the "application received" screen, the CRM approval, and the approval text and code. |
| `patient_record` | none | The iAssist patient record, with the free drug application and appointment cards. |
| `scheduling` | `variant: infusion` | The patient's appointment date and the text confirmation. |
| `pharmacy_selection` | `variant: site_of_care` | The agent's triage to the site of care. Allowed only after approval and the appointment date. |
| `tracking` | none | The order steps: fill, ready, ship, deliver, and the patient tracker. |

### Steps in order

| # | Step | Event | Trigger | Block | Fork read |
|---|---|---|---|---|---|
| 1 | Run eMedBV: no medical coverage | `RUN_MEDBV` | HCP | `benefit_verification` | |
| 2 | Submit the enrollment (the referral). BI starts on its own. | `REFERRAL_RECEIVED` | HCP | `enrollment` | |
| 3 | Patient verifies the text and code, then consents | `VERIFY_SMS`, `VERIFY_OTP`, `CONFIRM_CONSENT` | patient | `enrollment` | |
| 4 | The agent opens the BI stage. No coverage lands in about 3 seconds. | `COMPLETE_BI` | agent | spine | `bi` |
| 5 | The application update text goes out about 2 seconds later | `SEND_PAP_SMS` | system | `financial_assistance` | `bi` |
| 6 | Patient verifies the update text and code | `VERIFY_PAP_SMS`, `VERIFY_PAP_OTP` | patient | `financial_assistance` | |
| 7 | Patient agrees to the credit check and confirms household income. The screen says "Application received". | `VERIFY_INCOME` | patient | `financial_assistance` | |
| 8 | The agent clicks Approve Application in the Financial Assistance stage | `APPROVE_PAP` | agent | `financial_assistance` | |
| 9 | Patient taps the approval text and enters the code | `VERIFY_PA_APPROVED_SMS`, `VERIFY_PA_APPROVED_OTP` | patient | `financial_assistance` | |
| 10 | Patient sees the approval and picks an appointment date | `PATIENT_SELECTS_INFUSION_DATE` | patient | `scheduling` | |
| 11 | The agent triages the Rx to the site of care | `SELECT_PHARMACY` | agent | `pharmacy_selection` | |
| 12 | The dispensing pharmacy starts the order about 2 seconds later | `FILL_RX` | system | `tracking` | |
| 13 | The agent marks it received, shipped, then delivered | `READY_RX`, `SHIP_RX`, `DELIVER_RX` | agent | `tracking` | |

Notes:

- Step 4 can run before step 3 finishes.
- Step 10 is rejected until step 9 is done. Step 11 is rejected until step 10 is done.
- A denied outcome is not built. It would add a `pap` fork exit and a block that handles it. The recipe check fails any pick that no block handles.

## What differs between the two

| | Demo 4 | Demo 5 |
|---|---|---|
| BI pick | `medical_buy_and_bill` | `no_coverage` |
| Forks declared | `bi`, `pa`, `consent` | `bi` |
| PA | Required, starts on its own | None |
| Copay and claim blocks | Yes | No |
| Who approves | The PA approves on a timer | An agent clicks Approve Application |
| Patient screens after consent | PA-approved text, code, final screen | Update text, code, credit check, received, approval, date, tracker |
| Ends at | A copay claim filed | The drug delivered to the site of care |
