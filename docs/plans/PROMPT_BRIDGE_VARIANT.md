# Build prompt: Bridge as a variant of the cash offer block

Client: `abivax`. Read `CLAUDE.md` first. Its rules apply. Ask which tag prefix to use before the first tag.

Run `pnpm test` and `pnpm typecheck:ratchet` before and after. Never tag a red build.

## What Andy asked for

Add `bridge` as a third variant of the `cash_offer` block, next to `pa_denied` ("After a denied PA") and `sms` ("No coverage, offered by text"). It shows in the Demo Lab variant picker on the "After a denied PA" card.

## Definition (Andy, 17 Nov 2026)

- **What the patient gets:** a free short supply of the drug while the PA appeal runs. A white-label pharmacy, "Abivax Direct", dispenses it. After the supply the patient returns to PAP, copay, or coverage.
- **It replaces the cash offer.** A recipe that uses `bridge` has no cash pay. The variant sends no cash offer and shows no price.
- **Trigger depends on intake** (rule 11). `erx` intake: an automatic text, a `system` step after the denial. `fax` intake: the case manager sends it from the CRM, an `agent` click. Make the trigger a block prop that defaults from the workflow's intake channel, and let a scenario override it. The precondition is the same either way: the PA is denied.

## Where it goes (verified in the code)

- `client/workflows/catalog/blocks.ts`: add the variant to the `cash_offer` entry, with steps and a plain summary.
- `client/engine/workflow/components.ts`: the `cash_offer` props type and contract (`needs`, `sets`, tracker steps). Declare `needs` and `sets` (rule 4).
- `client/workflows/coassist/modules/cash_offer.ts`: today `DENY_PA` and `SEND_CASH_OFFER` are scoped to `variant: "pa_denied"`. Add the `bridge` rules. Do not copy the cash-offer rules. Share what is common.
- `client/workflows/coassist/forks.ts`: the `pa` fork's `denied` exit `requires: ["cash_offer"]`. Confirm it accepts any variant of `cash_offer`, so a `bridge` recipe can pick denied.
- `client/workflows/catalog/forks.ts`: the `denied` exit's `leadsTo` omits `income_qualification` and `financial_assistance`. Add `income_qualification` so PAP after a denial is not greyed out on the canvas.
- Screens (rule 13), Field events, tracker rungs, and stage-jump ladder for the new patient text and screen.
- Tests: a headless run from a denied PA through the bridge supply to the end state, and the rule 12 invariant over the new rules.

## Known risks

- The assistance fork's `self_pay` exit requires `cash_offer:sms`, so it does not offer self-pay after a `pa_denied` cash offer. A `bridge` recipe has no cash pay, so this does not apply to it, but do not change the exit without a test.
- Fax workflows (`standard`, `pap`) have no recipes or blocks today. The fax trigger path only works in a workflow that runs on blocks. Do not build it for Fax until Andy decides how Fax gets blocks.
- Do not change any existing fixture. If one moves, stop and read the diff.

## Stop and ask Andy

- How long is the free supply (days, or one fill)?
- After the supply, what decides the next step: the appeal outcome (approved goes to coverage, denied goes to PAP), or the patient's choice?
- What are Abivax Direct's address and phone? `program.specialtyPharmacy` in `brands/abivax/brand.json` is empty. It is the field the APA scenario already reads. Confirm it is the right place.
- Does the Bridge show in the CRM and Field as its own stage?
