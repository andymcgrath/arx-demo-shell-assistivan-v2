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

## Approach

Replace each check with a read from the scenario definition. Work in order of risk, one tag per step. Run `pnpm test` and `pnpm typecheck:ratchet` before and after each.

1. **Inventory.** List every check and what it decides. Group by decision: stage list, copy text, panel visibility, start portal, ladder, patient screen behavior. Commit the list as a table in this file.
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
