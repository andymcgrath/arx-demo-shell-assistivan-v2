# Demo 5: iAssist Buy and Bill, HCP captures consent

The same Buy and Bill story as [demo 4](buy-and-bill.md). Only the consent differs. Flow type `iAssist_Buy_And_Bill`. Pick: `consent: hcp_signs`.

The iAssist form looks the same in both demos. The radios start on the story's pick, and the other options stay selectable. A click changes what the form shows, not the story.

## What changes

| Step | Demo 4 (patient consents by text) | Demo 5 (HCP captures consent) |
|---|---|---|
| iAssist consent | Via Text selected. PHI authorization and Income Verification hidden. The HCP acknowledges the message. | Sign Right Now selected. The HCP captures the PHI authorization, the signature, and household income. |
| Referral | Consent and income are pending. | Consent and income are marked done. |
| Patient app | Text, code, consent, household income, enrollment complete. | Text, code, enrollment complete. No consent or income screens. |
| iAssist Enrollment card | Waits on consent, then income. | Shows consent given. |

Everything after that is the same: BI, PA, the PA-approved text, the HCP record, the copay card, and the copay claim.

## Presenter notes

- Switching between demos 4 and 5 is safe. Each demo pins its own consent pick.
- Use this demo to show a practice that captures consent in the office.

## Tests

`iassist.buyandbill.test.ts` (the consent fork block).
