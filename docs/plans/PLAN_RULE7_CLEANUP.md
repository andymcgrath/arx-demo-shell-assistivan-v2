# Plan: remove `flowType ===` checks from the UI (rule 7)

Status: in progress on branch `rule7-cleanup`. Steps 1 to 5 and the guard test (step 8) are done and tagged. Step 6 (CRM page) has its flags done and its file split started. Step 7 (Client portal copy) is open, see the progress notes at the end.

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

## Progress notes (30 Oct 2026)

Tags run `refactor/59` to `refactor/63`, because `refactor/51` to `refactor/58` were already taken by earlier work. Plan step N is tag N+58.

| Plan step | Tag | What landed |
|---|---|---|
| Oracle | `59-ui-predicates-oracle` | Test that copies every UI flag verbatim and records it per flow (`__fixtures__/ui/predicates.json`). |
| Facts | `60-scenario-facts` | `client/workflows/scenarioFacts.ts`: every flag derived from the recipe, intake, and `legacy`. No `ui` block was needed. `isCoA` is now `isCoassistSource` and `hasPricingFork`. `isPapFlow` is now `isFaxPap` and `isNoPaIntake`. |
| Shell | `61-shell-step-bar` | Step bar moved to `shell/stepBar.ts` (pure, fixture `ui/stepBar.json`). DemoShell reads `scenarioFacts`. Intended change: CoA_PAP's Rx rings now sit on its Delivery step. |
| Patient | `62-patient-pages` | Every patient page and `patient/index.tsx`. New fact `isStandardFaxPa`. |
| Provider and rest | `63-provider-field-ladders` | Provider, field, both FulfilmentCenter pages, iAssist NewCasePatient, hooks, ladders. New `scenarioFor` lookup. Provider's `isCoA` is `isCoassistSource`. |

Fixtures stayed identical except the two new ones and the CoA_PAP ring change.

**Left to do**

- Step 6, CRM page (tag `65-crm-flags-and-stage-builder`): flags done, file split not finished.
  - Done: the stage builder is a pure function (`crm/stages/buildStages.ts`) with a fixture along every golden path (`ui/crmStages.json`, unchanged by the flag swap). `crm/stages/flags.ts` derives the page's flags from `scenarioFacts`. The page has no `flowType` comparison, and its guard allowlist entries are gone. Also split out unchanged: `SfControls`, `StageCard`, `CaseListView`, `caseData.ts`. The page went from 4,160 to 2,984 lines.
  - Left: the `Index` component is still about 2,760 lines of JSX over about 80 local values (stage panels, benefits panel, fulfillment step, tabs). No jsdom or testing-library, so a render-level check does not exist. Each panel needs its props listed by hand. Split one panel per commit and check the CRM by eye after each, or add a render test setup first.
- Step 7, Client portal copy (`client/pages/Index.tsx`, 3,713 lines, 6 lines). Ask first: share the CRM sections or keep the copy. Wait for step 6, since sharing removes most of the work.
- Step 8, guard test: done early, tag `64-guard-test`. `client/engine/__tests__/ui.noFlowChecks.test.ts` scans `client/portals` and `client/shell` for `flowType ===`, `flow_type ===`, and quoted flow ids. The allowlist (reason per entry, matched by file and line text) holds the Client page (9 lines), the Brand Lab picker list, and two ladder flow-id types. Fax, provider and shell code have no entries. A stale entry fails the test, so removing a line from the CRM or Client page means deleting its entry. Step 7 must empty the Client entries. The CRM entries are gone.
- `WorkflowEngine.ts` still branches on `isCoverageFlow` for copy (lines 410 to 548). Separate follow-up, outside the guard.
- CoA_PAP and iAssist_PAP step bars: iAssist_PAP keeps its Rx ring on the last dot, as before. It has no Rx steps, so this may be the same fault CoA_PAP had. Check by eye before changing.
- `FLOW_START_PORTAL` in `DemoShell.tsx` is still a map keyed by flow id. The plan's `ui` block would replace it.
