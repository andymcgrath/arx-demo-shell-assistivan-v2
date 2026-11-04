# HCP enrollment (client web page)

An HCP enrolls the patient from the client's own web site. The platform texts the patient, who follows the link into the patient experience and consents. The case ends at enrollment. There is no benefit verification, PA, pricing, or order.

| Demo | Flow | Fork picks |
|---|---|---|
| 9. HCP Enrollment | `CoA_HCP_Enroll` | none (no forks) |

It is a scenario of the CoAssist workflow with source `web` and the `hcp` variant of the enrollment module. PrES is legacy and gains nothing from this work.

## Story

1. **Client web page tab.** The HCP starts on the product page and opens Support Services.
2. **Enroll Patient** opens Available Services. Only the first service (the program enrollment) is live. The copay, nurse support, and upload services show as part of the program and stay off.
3. **Enrollment form**, three steps: patient (authorization, details, consent), insurance and Rx (pharmacy, diagnosis), prescriber (NPI search, certification). Fields start filled. The NPI and the certification are left for the presenter.
4. **Submit** sends `HCP_ENROLL_SUBMIT`. The machine marks the case enrolled and the invite sent. Nothing else starts.
5. **Patient tab.** The text arrives. The link opens the standard enrollment: phone check, one-time code (`314589`), details, consent, signature, insurance upload (skip). The case ends on the confirmation.

The CRM, Client, Provider, Rules, and Gateway tabs are hidden.

## Where things live

- Rule: `client/workflows/coassist/modules/hcp_enroll.ts`. Route: `modules/screens/enrollment.ts` (`enrollment.hcp_complete`). Recipe: `COA_HCP_ENROLL_RECIPE`.
- Site: `client/portals/web/hcp/`. Copy, services, pharmacies, and diagnoses come from `hcpSite` in the brand file. No brand or drug name is in source.
- Step bar: three steps (`HCP_ENROLLMENT_BAR` in `client/shell/stepBar.ts`). Stage jump: `hcpStageEvents` in `client/shell/coassistLadders.ts`.
- Tests: `coassist.hcp.test.ts` and the golden path `coa-hcp-enroll-patient-consents`.

All data is representative. The ICD-10 codes and pharmacy numbers come from the public enrollment form. Confirm them before real use.
