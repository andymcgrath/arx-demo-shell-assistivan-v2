# Buy and Bill scenarios

Three demos run the Buy and Bill story on the iAssist workflow. The HCP buys the drug and bills the medical benefit, so nothing ships to the patient except in the free drug demo, where the drug goes to the site of care.

| Demo | Flow | Fork picks | Page |
|---|---|---|---|
| 4. iAssist Buy and Bill | `iAssist_Buy_And_Bill` | `bi: medical_buy_and_bill`, `consent: patient_text` | [buy-and-bill.md](buy-and-bill.md) |
| 5. iAssist Buy and Bill, HCP captures consent | `iAssist_Buy_And_Bill` | `consent: hcp_signs` | [buy-and-bill-hcp-consent.md](buy-and-bill-hcp-consent.md) |
| 6. iAssist Buy and Bill, Free Drug | `iAssist_Buy_And_Bill_PAP` | `bi: no_coverage` | [buy-and-bill-free-drug.md](buy-and-bill-free-drug.md) |

Run any of them with `BRAND=celldex pnpm dev`. The presenter never picks a branch live. Each outcome is a demo in `brands/celldex/brand.json`.

All data is representative. The drug is not yet approved, so the ICD-10 code (L50.1, idiopathic urticaria) and every price are placeholders. Have a coder confirm the code before real use.

## Shared building blocks

- **eMedBV (`benefit_verification`):** the HCP runs it on the Insurance step after entering insurance. A progress bar (about 2.7 seconds) runs, then the results open.
- **Copay (`copay`):** the HCP enrolls the patient in iAssist. The patient takes no action and sees no copay or pricing.
- **Copay claim (`copay_claim`):** the HCP files a claim from the patient record after the PA is approved.
- **Patient record (`patient_record`):** status cards, copay card, history, and sample documents.
- **One diagnosis:** `program.indication` in the brand file feeds the Clinical step, the PA form, and the Buy and Bill summary.
- **Sites of care:** one list (`client/portals/iassist/data/sitesOfCare.ts`) feeds the Medication step (HOPD NPI and TIN fill in) and the office on the Buy and Bill step.

## Rules these demos follow

- BI must complete before the PA starts. The PA starts on its own (`erx` intake, rule 11).
- The agent reveals each BI and PA result by opening its stage in the CRM. The result lands about 3 seconds later.
- Appeals are skipped. There is no triage, order status, or scheduling on the commercial path.
