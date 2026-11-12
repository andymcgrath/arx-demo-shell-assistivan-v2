# Plan: Web HCP and patient (PrES + PES), rebuilt from blocks

Rebuild `CoA_Web_HCP_Patient` so it runs the story of the default PrES PAP, with Abivax-branded screens for the HCP and the patient. The legacy screens are the model. The new screens replace them for this scenario only. `PrES_PAP` stays as it is (`legacy: true`, no new features).

Read `CLAUDE.md` first. Its workflow and test rules apply to every step here.

## The story (confirmed 12 Nov 2026)

1. **HCP site.** The HCP completes the Abivax-branded enrollment form and submits. The page says the patient will get a link. The submit is the referral, and BI starts.
2. **CRM, BI.** The agent opens the BI stage. BI returns no coverage and the case moves to the patient assistance program. This is a legacy step: nothing sends the patient a text yet.
3. **CRM, Fulfillment Center.** The agent opens Send via Fulfillment Center, picks Application Update, and adds it to the order. That sends the patient a text.
4. **Patient text.** The text arrives on a phone, the same SMS screen every other scenario uses (Patient tab). The patient taps it and the Patient tab opens the PES website. There is no code screen.
5. **Patient tab, the PES website (Abivax-branded).**
   1. Income verification consent (Yes or No, typed signature)
   2. Income verification (household size, annual household income)
   3. Patient assistance program terms (Yes or No). Submitting is the PAP enrollment.
   4. Shipment address (after the PAP submission)
   5. Ship date
   6. Confirmation. The patient's part ends here.
6. **CRM, fulfillment.** The agent triages to the pharmacy and works the last two stages. The patient tracker updates at each step until delivered.

## Decisions

- **Two tabs, as in the default PrES PAP.** The PrES website (the HCP form) is on the Provider tab. The PES website (the patient pages) is on the Patient tab. The scenario has no separate web tab.
- **Both sides are Abivax-branded.** The HCP site and the patient pages read the brand's tokens and logo. No raw colors.
- **Modernize, do not edit.** The legacy PES pages (Pes income consent, income submission, program terms, confirmation) are the model. The new web screens live in `portals/web/`. The legacy pages stay for `PrES_PAP`.
- **The agent sends the text.** It is an `agent` step from the Fulfillment Center, not a timer. The precondition is the same as for any trigger (rule 11).
- **No phone code.** The patient's tap on the text is the verification. The PrES rules already have no code step.
- **The story ends at the confirmation.** The agent continues in the CRM.
- **Rule 6.** Build the web screens inline in this scenario. Extract a block only when a second scenario uses them.

## What exists

- `portals/web/`: `HcpSite` (the Abivax HCP form and its thank-you page) and `ConsumerWebPortal` (the patient steps: HIPAA, details, Rx). These are the starting point.
- `workflows/coassist/modules/hcp_patient.ts`: the `hcp_patient` enrollment variant. Today the HCP's submit texts the patient for a code and consent in the phone app, and BI starts after the patient's Rx submit.
- `workflows/shared/income.ts`: `income_qualification`. Its update text (`SEND_PAP_SMS`) is an `agent` step when the recipe sets no `trigger`. That is the Fulfillment Center send. `START_INCOME_QUALIFICATION`, `VERIFY_INCOME`, `PATIENT_SETS_ADDRESS` and `PATIENT_SELECTS_SHIP_DATE` already exist.
- `portals/crm/pages/FulfilmentCenter.tsx`: the Application Update item.
- The `bi` exit `no_coverage_pap` requires `pap_transfer`, `income_qualification` and `pharmacy_selection:assigned`.

## Steps

Each step ends green (`pnpm test`, `pnpm typecheck:ratchet`), is committed, and is tagged. Ask which tag prefix to use before the first tag. Work on a short-lived feature branch. Keep files under about 600 lines.

### 1. Machine

- `hcp_patient`: the HCP's submit is the referral and starts BI (system). It no longer texts the patient for a code, and the patient's Rx submit goes away. Consent moves to the income consent screen.
- `pap_transfer`: add a variant for an agent-sent text. The system `REFER_TO_PSP` and the transfer text do not fire. The agent's Fulfillment Center send (`SEND_PAP_SMS`) is the only text, and the patient's tap (`VERIFY_PAP_SMS`) opens the page. The `no_coverage_pap` exit still finds the block it requires.
- Recipe: `enrollment:hcp_patient`, `pap_transfer` (the new variant), `income_qualification` (no `trigger`, so the agent sends), `pharmacy_selection:assigned`, `scheduling`, `tracking`.
- Headless test: an event list from the HCP submit to delivered, with the agent steps in order. Each precondition rejects its event where it does not hold (rule 12).
- Update the catalog (new variant, steps) and the stage-jump ladder.

### 2. Patient web screens

- Build the five steps in `portals/web/` as an Abivax-branded patient flow: consent, income, terms and enrollment submitted, address, date, confirmation. Each reads the route from the workflow data, not a local step.
- Tokens only. Add the screens to the token tests.
- The text: the Patient tab shows the text message, and tapping it opens the web page.

### 3. HCP site and CRM

- Check that the HCP thank-you page matches the story (the patient will get a link) and starts BI.
- CRM stages: BI, PAP enrollment, triage and pharmacy status. The Fulfillment Center shows the Application Update item once BI is back with no coverage.
- Step bar: Referral, BI, PAP enrolled, triage, processing, shipped, delivered.

### 4. Demo and fixtures

- Point Abivax demo 4 back at `CoA_Web_HCP_Patient`, with `bi: no_coverage_pap`. Today it points at `PrES_PAP`.
- Review the fixture diff before recording. Only this scenario should move.
- Check in the browser: the whole story, both brands, Undo at each agent step.

## Out of scope

- Changes to `PrES_PAP` or the legacy Pes pages.
- A phone version of the patient steps.
- Income rules. Any entered income qualifies, as in the legacy screens.

## Answered questions

1. The text shows on the Patient tab as a phone SMS, identical to the other SMS screens. Tapping it opens the PES website.
2. After the income form comes the program terms. Submitting them is the PAP enrollment.
3. The PES website carries the address and date, after the PAP submission. The PrES website is on the Provider tab.

## Open question

The HCP's submit marks the patient's phone as verified and the authorization as given, as the legacy PrES does with its attestation. The patient's own signature is the income consent. Say if the patient's consent should be its own step.
