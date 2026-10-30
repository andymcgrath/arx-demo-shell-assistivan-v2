# Plan: remove `flowType ===` checks from the UI (rule 7)

Status: draft for review. No code has changed.

CLAUDE.md rule 7: do not add `flowType ===` checks in UI code. Read `workflow` and `scenario` from the definition. Rule 14: a scenario's path changes at forks, not at flow checks. The UI still breaks both rules in about 24 files. Two earlier plans (the medical transfer plans) deferred this as a follow-up.

## Why it matters

- Every new scenario needs edits in several UI files, and a missed branch shows the wrong screen.
- The checks hide behavior from the headless tests. The tests cover the machine and `derivePatientRoute()`, not what the CRM or shell shows.
- The two largest files break the 600-line limit: `client/portals/crm/pages/Index.tsx` (4,011 lines) and `client/shell/DemoShell.tsx` (1,487 lines).

## Where the checks are

Counts from `rg "flowType ===|isCoverageFlow|isCoaFlow"` on 27 Oct 2026. Re-run it before starting.

| File | Hits |
|---|---|
| `client/shell/DemoShell.tsx` | 33 |
| `client/portals/crm/pages/Index.tsx` | 32 |
| `client/portals/client/pages/Index.tsx` (copy of the CRM page) | 27 |
| `client/portals/patient/pages/*` (13 files; `DeliveryDate` 9, `DeliveryPayment` 7, `DeliveryAddress` 7, `PADenied` 6) | 48 |
| `client/portals/provider/index.tsx` | 8 |
| `client/shell/*Ladders.ts` | 5 |
| `FulfilmentCenter.tsx` (CRM and Client), `NewCasePatient.tsx`, `patient/index.tsx` | 7 |

The CRM page defines `isFaxFlow`, `isPapFlow`, `isIAssistPapFlow`, `isCoaFlow` (DTP and Copay only), and `isCoverageFlow`. They drive the stage list, quick view text, the PA panel, and the fulfillment step.

## Inventory (step 1, 30 Oct 2026, on `ryzup` at `ryzup/08`)

A wider search (`flowType ===`, `flow_type ===`, and the local flags below) finds 256 lines in 27 files under `client/portals`, `client/shell`, `client/hooks`, and `client/components`. Largest: CRM page 69, Client page 64, `DemoShell` 55, provider 26, `DeliveryDate` 14, `DeliveryPayment` 9, `PADenied` 8, `DeliveryAddress` 7, field 6. 86 lines compare against a literal flow id. `CoA_Copay`, `Fax_PAP_Audit`, and `PrES_PAP` are named most.

**The checks are a few predicates, copied into many files.** Each file re-defines the same flag with a local `const`. Some definitions differ under the same name, which is the main risk.

| Flag | Meaning today | Defined in | Reads from the scenario instead |
|---|---|---|---|
| `isCoaFlow`, `isCoA` | `CoA_DTP` or `CoA_Copay` | `DemoShell` (2), CRM, Client page, `DeliveryDate`, `DeliveryPayment`, `DeliveryAddress`, `PADenied`, `PAApproved`, `CopayEnroll` | recipe forks include `pricing` |
| `isCoA` (provider) | every CoAssist flow, from `COASSIST_FLOWS` | `provider/index.tsx` | `source === "coassist"`. **Same name, different meaning.** |
| `isCoverageFlow` | `CoA_Coverage` | `DemoShell` (2), CRM, Client page, `DeliveryDate`, `DeliveryAddress`, `DeliveryPayment`, `PADenied`, `PaApprovedSms`, and the engine | recipe has `cash_offer:sms` and `provider_transfer` |
| `isPapFlow` | `Fax_PAP_Audit` and `PrES_PAP` (`Fax_PAP_Audit` only in `DemoShell:171` and `Signature`) | `DemoShell` (2), CRM, Client page, both `FulfilmentCenter` pages, field, `DeliveryDate`, `DeliveryAddress` | intake channel is fax or esign and no PA runs |
| `isFaxFlow` | `Fax_QS_PA_Approved` and `Fax_PAP_Audit` | CRM, Client page, field | `intake` is `fax` |
| `isIAssistFlow` | member of `IASSIST_FLOWS` | `DemoShell` (3), CRM | `source === "iassist"` |
| `isIAssist` | `iAssist_PA_Approved` only | `DeliveryDate`, `DeliveryPayment`, `DeliveryAddress`, `CopayEnroll` | source plus recipe forks |
| `isIAssistPapFlow` | `iAssist_PAP`, plus free drug | `DemoShell` (2), CRM, `PADenied`, `PAApproved`, `MedicationDelivered` | recipe has `financial_assistance:pap` |
| `isCopayRetailFlow`, `isCopayWorkflow` | `CoA_Copay` plus a pricing pick | `DemoShell`, CRM, `CopayEnroll` | recipe forks include `copay` |
| `isPres`, `isWideFlow` | `PrES_PAP` (legacy) | provider, `MedicationDelivered` | `legacy` and `intake: "esign"` |

Already migrated to `scenarioHasModule`: `isBuyAndBill`, `isFreeDrug`, `isPapProgram`, and the `CoA_PAP` step bar and CRM stages.

**What the flags decide** (from the names and nearby comments; not every use is traced): the step bar labels and done state, the stage-jump list, the CRM stage list and quick view, the PA panel, the fulfillment step, patient screen copy, and which events a patient page sends.

**Outside this plan:** `WorkflowEngine.ts` also branches on `isCoverageFlow` (lines 410 to 548) for copy. It is engine code, so the guard test in step 7 does not cover it. Track it separately.

**What this changes about the approach.** Because the same ten predicates repeat, a better first move than the plan's `ui` block is one shared module, `scenarioFacts(flowType)`, that returns each predicate from the recipe and workflow. Each file then imports it. A file's local `const` disappears without changing what it decides, which is the safest way to keep fixtures identical. Resolve the `isCoA` name clash first, with two predicates that cannot be confused.

## Approach

Replace each check with a read from the scenario definition. Work in order of risk, one tag per step. Run `pnpm test` and `pnpm typecheck:ratchet` before and after each.

1. **Inventory.** Done, see the table above. A finer pass (each use, grouped by decision) can wait until a step touches that file.
2. **Scenario UI facts as data.** Add a typed `ui` block to `ScenarioDefinition` for facts the UI reads today by flow: starting portal, visible portals, stage list source, panels. Move `FLOW_START_PORTAL` and the portal-visibility filter in `DemoShell` onto it. Add a test that every scenario declares it.
3. **Stage lists and ladders.** Generate the CRM stage list from the workflow's screen and rule definition, as rule 13 intends for the stage list. Replace the per-flow ladder selection in `DemoShell` with one lookup on the scenario.
4. **Patient pages.** Replace `flowType` checks in patient pages with reads of `workflowData` (pricing option, intake channel, benefit statuses) or scenario `content`. Most of these decide copy or a field, so the data usually exists already.
5. **CRM page.** Replace `isCoaFlow` and `isCoverageFlow` with reads of the recipe (`panels`, modules) and fork choices. Split `Index.tsx` along existing seams as each section loses its flow checks: stage panels, the benefits panel, the fulfillment step.
6. **Client portal copy.** `portals/client/pages/Index.tsx` duplicates the CRM page. Decide first whether to share the CRM sections or keep the copy. Do not migrate the same checks twice.
7. **Guard test.** Add a test that fails when a `flowType ===` check appears in `client/portals` or `client/shell`, with an allowlist for any that remain on purpose. Lower the allowlist as steps land.

## Constraints

- Behavior does not change. Golden-path fixtures and `derivePatientRoute()` output stay identical. Any fixture diff needs a written reason.
- Legacy scenarios (`PrES_PAP`) keep working. No new features.
- Do not add presenter branch buttons.
- No brand or drug names in source.

## Open questions

- Should the `ui` block live on the scenario, the recipe, or the workflow? Default: the scenario, with workflow defaults.
- Keep the Client portal as a separate copy, or share sections with the CRM? Default: share, since it already copies the page.
- UI behavior has no headless test today. Add component tests for the CRM stage list first, or rely on fixtures? Default: add a small stage-list test in step 3.

## Final check

- `rg "flowType ===" client/portals client/shell` returns only allowlisted lines.
- `pnpm test` and `pnpm typecheck:ratchet` pass.
- Every file touched is under about 600 lines or has a split planned.
