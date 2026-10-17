# iAssist Appeal workflow summary

The iAssist Appeal flow is **WF5 (`iAssist_PAP`)**. It's an XState machine in `client/workflows/iAssistPap.ts`. It's a structural clone of WF4 (`iAssist.ts`), but it follows a denial and appeal path instead of an approval path.

## Steps

1. **Enrollment.** The Rx is submitted and the `ENROLL` event fires. The patient lands in `invited` with the welcome text already sent. The patient then moves through `VERIFY_SMS`, `VERIFY_OTP`, and `CONFIRM_CONSENT` to reach `consented`.

2. **Benefits Investigation and Prior Authorization.** The provider completes the PA (`COMPLETE_PROVIDER_PA`). This flow is meant to be walked to a denial, not an approval.

3. **PA denied.** `DENY_PA` sets `paStatus: 'denied'`. `paStatus` stays `denied` for the whole flow and never becomes `approved`. The CRM PA stage reads "PA Denied — Appeal initiated". A task tells the agent that an appeal is recommended and to review the denial reason with the prescriber.

4. **Appeal rule gate.** `INITIATE_APPEAL` is a plain event that can be dispatched at any time. The CRM page (`crm/pages/Index.tsx`) controls when it fires. It dispatches the event automatically only when all of these are true:
   - The presenter has created and activated the "Initiate Appeal — Upon PA Denial" rule in the Rules portal (`appealRuleActive` in `rulesPortalStore.ts`).
   - `paStatus` is denied.
   - `appealStatus` is still `none`.

   The rule exists so the demo can show a gap ("no rule exists to initiate an appeal") and then fix it live.

5. **Appeal initiated.** `updateInitiateAppeal` sets `appealStatus: 'initiated'` and `dispatchStatus: 'pending_selection'`. The second change unlocks fulfillment right away. The guard `canFillRX` passes when `paStatus === 'approved'` or `appealStatus !== 'none'`. A task named "Appeal Filed with Payer" opens (`LIVE-APPEAL-REVIEW`), and a message reads "Appeal Filed - {patient}".

6. **Payer response (cosmetic).** The agent opens the Appeals stage tab (A-14275). About 2.5 seconds later the CRM dispatches `APPROVE_APPEAL`, and `appealStatus` becomes `approved`. This gates nothing. It only gives the Appeals stage a resolved detail view. The appeal task closes and a message reads "Appeal Approved - {patient}".

7. **Infusion scheduling.** After the approval, the patient picks a date on `InfusionDate.tsx`. `PATIENT_SELECTS_INFUSION_DATE` stores `infusionDate`. The iAssist dashboard then shows "Infusion Scheduled". This replaces the pharmacy shipping chain (`READY_RX`, `SHIP_RX`, `DELIVER_RX`), which stays in the machine for parity but isn't on the real path.

## Design notes

- The machine is `parallel` with regions for enrollment, PA, order, and so on. Most actions are root-level handlers.
- Every action pushes an undo snapshot. The machine keeps the last 20 and strips nested history to stay under the sessionStorage quota.
- The WF4 post-approval chain is still in the machine but unreachable here. That chain covers pricing, self-pay, address, ship date, and payment.
- In the engine, `appealStatus` is `none` for every other flow, so the appeal task and stage only appear in WF5.
- A reset ladder can jump from `DENY_PA` straight to `INITIATE_APPEAL`. The CRM guards against this so the appeal doesn't show as approved when nobody opened the tab.

## Sources

- `client/workflows/iAssistPap.ts`
- `client/engine/WorkflowEngine.ts`
- `client/portals/crm/pages/Index.tsx`
- `client/store/rulesPortalStore.ts`
