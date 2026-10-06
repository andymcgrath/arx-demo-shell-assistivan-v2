# ArxConnect demo: a beginner's guide

This guide explains what this demo is, how to run it, and what each of the 8 built-in workflows shows. It's written for anyone who needs to run or present the demo, not just developers.

## What this demo actually is

ArxConnect is AssistRx's patient-hub platform. It has several separate apps: a CRM for hub agents, a patient-facing app, a provider portal, a field team app, and more.

This demo puts all of them in one browser tab. Click a tab at the top and you jump between portals. Every portal reads from the same shared data, so an action in one portal shows up everywhere else immediately. Approve a prior authorization in the CRM, and the Patient portal updates on its own, no refresh needed.

Nothing here touches a real database. All data lives in your browser's session for the length of the demo. Reset at any time and start clean.

## The portals (tabs)

| Tab | What it's for |
|---|---|
| HUB / CRM | The hub agent's workspace. Runs the case: enrollment, benefits checks, prior authorization, dispatch, and more. Most demos start and stay here. |
| Patient | What the patient sees on their phone or laptop: enrollment, verification, consent, and order status. |
| Provider | The doctor's office view. Some workflows start here instead of the CRM. |
| iAssist | AssistRx's internal case-intake platform. Opens a new case: patient search, clinical info, insurance, prescription, and prior authorization, all in one guided flow. |
| Field | The field team's task list: patients, site-of-care visits, and shipments tied to the active case. |
| Workforce | Call center dashboards: team performance, quality scores, and KPIs. Not tied to the active case. |
| Analytics | A placeholder for a future reporting view. No live data yet. |
| Rules | A Salesforce-style "Product Mgmt" app for building automation rules, such as "file an appeal automatically when a PA is denied." |

## Getting started

From the project root, run it once:

```bash
pnpm install
```

Start it:

```bash
pnpm dev
```

Open `http://localhost:8080`. You'll land on the HUB tab.

## Running a demo

Two controls matter most, both in the header:

- **Flow dropdown** — picks which of the 8 workflows is active. Switching flows resets the case to that workflow's starting point and opens its correct starting portal automatically.
- **Reset** — clears the current case back to the beginning. Use it between run-throughs so you're not explaining leftover state from the last one.

The step bar under the header shows exactly where the active case stands, stage by stage, for whichever workflow is running. Click any stage in the reset menu to jump straight to it instead of clicking through every step live.

A **Config** drawer lets you show or hide portals when you want a two- or three-portal split view, and toggle behavior like auto-advance and undo support.

## The 8 workflows

Every workflow follows the same patient, Keanu Dixon, through a different real-world scenario. Pick the one that matches the story you need to tell.

### 1. Standard — standard referral, insurance covers it

**Starts in:** HUB / CRM

The baseline, happy-path story. A referral comes in by fax, the patient enrolls (SMS and one-time-passcode verification, then consent), AssistRx runs a benefits check, submits a prior authorization, and the payer approves it. The prescription gets dispatched to a pharmacy, fills, ships, and arrives.

Stages: Referral Received → Patient Enrolled → Benefits Investigation → Prior Authorization → Dispatch to Triage → Rx Processing → Rx Shipped → Medication Delivered.

Use this one to show the core pipeline before layering on a more specific story.

### 2. PAP — no insurance, free-goods program, then an audit

**Starts in:** HUB / CRM

The patient has no insurance, so instead of a prior authorization, AssistRx enrolls them in a Patient Assistance Program (PAP) and the medication ships free. Ninety days later, a routine audit checks whether the patient has since gotten insurance.

Stages: Referral Received → Patient Enrolled → Benefits Investigation → PAP Enrolled → Dispatch to Triage → Rx Processing → Rx Shipped → Medication Delivered.

Use this one to show the free-goods path and the compliance audit that follows it.

### 3. CoAssist DTP — cash pay, direct to patient

**Starts in:** Provider

CoAssist is AssistRx's cash-pay track for patients who'd rather not wait on insurance, or whose insurance doesn't cover the drug. After enrollment and a benefits check, the patient (or their provider) chooses how to pay: through insurance with a prior authorization, or a cash-pay option fulfilled through CoAssist's own pharmacy. A "Cash Offer" stage sits between the PA decision and dispatch, showing the price the patient would pay out of pocket.

Stages: Referral Received → Patient Enrolled → Benefits Investigation → Prior Authorization → Cash Offer → Dispatch to Triage → Rx Processing → Rx Shipped → Medication Delivered.

### 4. CoAssist Copay — adds a copay assistance option

**Starts in:** Provider

Same shape as CoAssist DTP, with one more choice at the pricing step: a Copay Program that lowers what the patient pays at retail or mail order, instead of switching them to cash pay outright. Today this flow runs the same stages as CoAssist DTP; the copay option is layered onto the same pricing screen.

### 5. CoAssist DME — durable medical equipment, three coverage outcomes

**Starts in:** Provider

This one's for medical equipment, not a drug. Think a Dexcom CGM sensor. There's no prior authorization step at all here. Instead, one benefits check can land in three different places:

- **Pharmacy covers it** — the patient gets a text, confirms, and picks a pharmacy from AssistRx's network.
- **Medical benefit covers it (or both do)** — the case hands off to an outside DME provider, Advanced Diabetes Supply, who takes it from there.
- **Neither covers it** — the patient pays cash through CoAssist's own pharmacy.

Stages: Referral Received → Patient Enrolled → Benefits Investigation → Pharmacy Coverage Confirmed → Pharmacy Selected → Rx Processing → Rx Shipped → Medication Delivered.

Use this one to show how a single benefits check can branch three ways depending on what's covered.

### 6. iAssist — internal case intake, PA approved

**Starts in:** iAssist

This flow starts differently: instead of a referral landing in the CRM, a hub agent opens the iAssist app and builds the case by hand, screen by screen (patient search, clinical details, insurance, prescription, prior authorization). Once submitted, the PA gets approved and the case flows into the same pricing, dispatch, and shipping pipeline as the other workflows.

Stages: Referral Received → eRx Submitted (benefits check complete, PA submitted) → Patient Enrolled → PA Approved → Dispatch to Triage → Rx Shipped → Medication Delivered.

Use this one to demo iAssist's case-creation screens, not just the downstream fulfillment.

### 7. iAssist Appeal — PA denied, then appealed

**Starts in:** iAssist

Same case-intake flow as #6, but the payer denies the prior authorization instead of approving it. An appeal gets filed, and once it's approved, fulfillment moves forward anyway.

Stages: Referral Received → eRx Submitted → Patient Enrolled → PA Denied → Appeal Filed → Dispatch to Triage (Keanu to Facility).

This is the one built to pair with the Rules portal: create and activate the rule named "Initiate Appeal, Upon PA Denial," and the appeal files itself the moment the denial happens, instead of a hub agent doing it by hand. Use #6 and #7 back to back to contrast a clean approval against a denial that needs intervention, then show the Rules portal automating that intervention.

### 8. PrES PAP — provider e-signature intake (early build)

**Starts in:** Provider

A provider starts the referral by signing it electronically instead of faxing it in, and the patient goes through the same income-qualification and PAP enrollment as workflow #2. The actual e-signature capture screens aren't built yet, so this flow currently reuses the PAP workflow's steps end to end. Treat it as a placeholder for where that intake experience is headed, not a finished story.

Stages: Referral Received → Patient Enrolled → Benefits Investigation → PAP Enrolled → Dispatch to Triage → Rx Processing → Rx Shipped → Medication Delivered.

## Quick reference

| # | Name | Starts in | One-line story |
|---|---|---|---|
| 1 | Standard | HUB / CRM | Referral to delivery, insurance approves the PA |
| 2 | PAP | HUB / CRM | No insurance, free-goods program, later audited |
| 3 | CoAssist DTP | Provider | Cash-pay option alongside the insurance path |
| 4 | CoAssist Copay | Provider | Adds a copay-assistance pricing option |
| 5 | CoAssist DME | Provider | Medical equipment, three coverage outcomes |
| 6 | iAssist | iAssist | Internal case intake, PA approved |
| 7 | iAssist Appeal | iAssist | PA denied, appeal filed and approved |
| 8 | PrES PAP | Provider | E-signature intake (placeholder), PAP path |

## Tips for presenting

Reset before each run-through so the audience isn't confused by stage numbers left over from the last demo. Use the stage-jump menu to skip ahead when you only need to show one part of a flow, rather than clicking through every step live. If you're short on time, workflows #1, #5, and #7 cover the three most distinct stories: the standard path, a benefits check that branches three ways, and a denial that needs an automated response.

## Where to go next

This guide covers what the demo shows and how to run it. For how it's built underneath, see `ARCHITECTURE.md` at the project root.
