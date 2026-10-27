# ARX Demo Shell architecture

**Core principle:** XState is the single source of truth for workflow state. Zustand's `demoStore` holds only shell state: which flow and demo are active, and a few UI and reset flags.

This document describes the code on `main`. `REFACTOR_AUDIT.md` explains why it is built this way and logs each refactor step. `CLAUDE.md` holds the rules.

## Vocabulary

- **Workflow:** the platform choreography. Which apps take part, which app starts, the stage spine. One machine per workflow. Four exist: Standard, PAP, CoAssist, iAssist.
- **Scenario:** a variant on a workflow, defined as data. It is the registry id and the `FlowType`. Ten exist.
- **Module:** a reusable step (payment, pharmacy selection, scheduling, tracking) with its rules, screens, and metadata.
- **Fork:** a point with a default branch and named exits, declared by the workflow.
- **Demo:** an entry in the brand file's `demos` list. A scenario plus the fork choices it starts with. It is what the client picks in the dropdown.
- **Brand:** client identity (names, logos, colors, copy, demos). Separate from workflow and scenario.

## Workflows and scenarios

| Workflow | Folder | Scenarios (`FlowType`) |
|---|---|---|
| Standard | `client/workflows/standard/` | `Fax_QS_PA_Approved` |
| PAP | `client/workflows/pap/` | `Fax_PAP_Audit`, `PrES_PAP` (legacy) |
| CoAssist | `client/workflows/coassist/` | `CoA_DTP`, `CoA_Copay`, `CoA_Coverage`, `CoA_Medical_Transfer` |
| iAssist | `client/workflows/iassist/` | `iAssist_PA_Approved`, `iAssist_PAP`, `iAssist_Medical_Transfer` |

`iAssist_PAP` is labeled "iAssist Appeal" in the UI. `PrES_PAP` is a legacy scenario: it stays working and tested, with no new features.

Each workflow folder holds the same pieces:

- `index.ts` builds the machine with `createWorkflowMachine`.
- `rules.ts` is the ordered rules table: preconditions and automation triggers on `workflowData`.
- `scenarios.ts` holds each scenario as data: `intake` channel, default `choices`, `recipe`, `content` (pharmacies, prices), and patient overrides.
- `forks.ts` declares forks and their exits (CoAssist and iAssist).
- `recipes.ts` lists the ordered modules per scenario (CoAssist and iAssist).
- `modules/` holds the step modules.
- `screens.ts` holds the screen catalog and route rules for every app.

Shared pieces live in `client/workflows/shared/` (`bi.ts`, `assignment.ts`, `intake.ts`). `client/workflows/screenMaps.ts` looks up a scenario's screen map.

## Engine

**Factory:** `client/engine/workflow/createWorkflowMachine.ts` turns a rules table, forks, and scenarios into an XState machine. The machine has one state. Every precondition reads `workflowData`, so nothing depends on state names. The scenario enters as XState `input: { flowType }` and stays in `workflowData.flowType`, so saved snapshots restore with it.

Supporting files in `client/engine/workflow/`:

| File | Purpose |
|---|---|
| `types.ts` | `Rule`, `ScenarioDefinition`, `WorkflowDefinition`, `ForkDefinition` |
| `baseData.ts` | Shared initial `WorkflowData` |
| `components.ts` | Module contracts (what each needs and sets) and sources |
| `recipe.ts` | `recipeProblems()`: validates module order against the contracts |
| `forks.ts` | Pure fork helpers: `exitFor`, `forkStageList`, `choiceProblems` |
| `scope.ts` | Scopes a rule or screen to a module or fork instead of a hand-written scenario list |
| `screens.ts` | Screen catalog and route-rule types, `routeFor`, `menuFor` |

**Preconditions and automation:** a rule allows an event only when a condition holds. An automation trigger fires an event after a delay (`after`) when a condition holds. Triggers are marked `system` or `agent`. The BI result, PA decision, and appeal all fire from the machine, not from React `setTimeout` effects. The CRM only sends `VIEW_STAGE` and `LEAVE_STAGE`.

**Intake channel:** `erx`, `fax`, or `esign`. It defaults from the workflow and a scenario may override it. On `erx`, a PA starts on its own once BI completes and says one is required. On `fax`, an email asks the provider and the provider's submission starts the PA.

**Undo:** each machine keeps up to 20 snapshots. The CoAssist scenarios do not handle `UNDO` (pinned by `client/engine/__tests__/__fixtures__/undo/`).

**Context:**

```typescript
interface MachineContext {
  workflowData: WorkflowData;   // All progression fields, including `choices` (fork picks)
  events: DemoEvent[];          // Audit trail
  _snapshots: MachineContext[]; // Undo history
}
```

### Runtime wiring

- **`WorkflowRegistry.ts`** registers each machine under its `FlowType`. CoAssist registers one machine four times, iAssist three, PAP two. Exposes `registerWorkflow`, `getWorkflow`, `listWorkflows`.
- **`actorSingleton.ts`** holds the module-level actor. `switchWorkflow(flowType)` snapshots the outgoing flow, then starts or restores the new one. `resetCurrentWorkflowActor()` resets the active flow. `resetAllWorkflowSnapshots()` wipes every flow's progress.
- **`WorkflowProvider.tsx`** gives React the actor: `useWorkflowActor`, `useSwitchWorkflow`, `useActiveWorkflowId`, `usePersonaState(portal)`, `useWorkflowDispatch`.
- **`WorkflowEngine.ts`** holds `derivePatientRoute(context)`. It looks up the scenario's screen map and returns the first matching route rule.
- **`snapshotChoices.ts`** drops a saved session whose fork choices disagree with the selected demo.
- **`stageInspectorConfig.ts`** configures the stage inspector.

## Screen order

Each workflow owns screen order for every app in `workflows/<name>/screens.ts`: a catalog in menu order, and route rules (screen plus condition, first match wins). Modules contribute screens. A scenario may add, skip, or replace entries. The patient route, the CRM stage list, and the patient hamburger menu all derive from it. Do not hand-edit an `if` chain or a per-flow menu list.

## Forks and demos

A fork has a default branch and named exits. Each exit carries the data it sets, the modules it requires, and its stage-jump rungs. Who chooses (story or patient) is part of the declaration. The pick lives in `workflowData.choices`.

The presenter never picks a branch. Each outcome is a demo: an entry in `brands/<slug>/brand.json` naming a flow and its starting choices. The brand test rejects any choice that names no declared exit. `client/shell/flowOptions.ts` exposes `BRAND.demos` as the dropdown (`DEMO_OPTIONS`).

## Shell

- **`DemoShell.tsx`** hosts the portals: header, portal tabs, one to three panels, the demo dropdown, reset, and the stage-jump menu. `FLOW_START_PORTAL` maps each `FlowType` to its opening portal.
- **Stage ladders** (`coassistLadders.ts`, `faxLadders.ts`, `iassistLadders.ts`, `transferLadders.ts`) are pure modules that list the events to replay for each stage jump. Tests use the same modules.
- **`DemoConfigurator.tsx`** is the runtime drawer: portal visibility, auto-advance, undo, progress display.
- **`demos.ts`** starts and restarts a demo: it applies the demo's fork choices to the machine.

### Portals

`client/portals/`: `crm`, `client` (a copy of the CRM tab that can diverge; shown only when a brand sets `showClientTab` and the flow is an iAssist flow), `patient`, `provider`, `iassist`, `field`, `insights` (tab label "Analytics", a placeholder), `analytics` (tab label "Workforce"), and `rules` (Salesforce-style Product Mgmt). Portals never import each other. They share state through the actor and `demoStore`. The provider tab is hidden for iAssist flows and for `Fax_PAP_Audit`. The iAssist tab shows only for iAssist flows.

## Shell state: Zustand

`client/store/demoStore.ts` holds four things:

- `flowType`: the active scenario. Drives which machine `actorSingleton.ts` runs.
- `demoId`: the selected brand demo.
- `enrollmentFormTabOpen`: CRM tab state.
- `resetNonce`: bumped on every `resetDemo()`. The patient portal's `StateDrivenNav` watches it to navigate back on reset.

It persists to `sessionStorage`. On restore, `DemoShell` calls `switchWorkflow()` to match the actor. The other files in `client/store/` (`fieldStore.ts`, `rulesPortalStore.ts`, `patientStore.ts`, and similar) hold per-portal data. They hold no workflow state.

## Patient navigation

`StateDrivenNav` (`client/portals/patient/index.tsx`) subscribes to the actor with `useSelector`, computes `derivePatientRoute(snapshot.context)`, and navigates when the target changes.

## Brand

Brand is committed JSON at `brands/<slug>/brand.json`, with images in `public/brands/<slug>/`. The `BRAND` environment variable selects it at build time, one Netlify site per client. Code in `client/brand/` resolves it (`schema.ts`, `resolve.ts`, `theme.ts`, `documents.ts`). See `BRANDS.md`.

## Data flow

```
UI action (for example, "Approve PA" in the CRM)
  ↓
1. useWorkflowDispatch() sends an event to the actor
2. The machine checks the rule's precondition, updates workflowData, snapshots for undo
3. Automation triggers whose conditions now hold schedule their follow-up events
4. usePersonaState() or useSelector() reads the new context
5. Portals re-render
6. derivePatientRoute() recomputes and StateDrivenNav navigates if the route changed
```

## Tests

Machine tests live in `client/engine/__tests__/`. They drive machines with event lists and assert on `workflowData`, emitted events, and `derivePatientRoute()`. Never assert on internal state names. Expected output lives in `__fixtures__/*.json`. Re-record with `RECORD=1 pnpm test` only after reading the diff.

Each scenario has a headless test. Invariant tests check every precondition, recipe order, route and menu coverage, and fork exits. Brand tests (`client/brand/__tests__/`) check required fields, real flow ids, and declared exits.

## How to add a scenario

1. Add the flow name to `FlowType` in `client/engine/types.ts`.
2. Add a `ScenarioDefinition` to the workflow's `scenarios.ts`: `intake`, default `choices`, `recipe`, `content`.
3. Add a recipe to `recipes.ts` from existing modules. Extract a new module only when two scenarios need it (CLAUDE.md rule 6). `recipeProblems()` fails the test when order is wrong.
4. Declare a fork in `forks.ts` when the scenario branches. Do not use `scenarios: [...]` filters or `flowType ===` checks.
5. Add the scenario to the workflow's `index.ts` scenario map, and register it in `WorkflowRegistry.ts`.
6. Add screens and route rules in `screens.ts`.
7. Add an entry to `FLOW_START_PORTAL` in `DemoShell.tsx`, and a stage ladder if the scenario needs stage jumps.
8. Add a demo to each brand's `brand.json` that should show it.
9. Add a golden-path test and fixture, then run `pnpm test` and `pnpm typecheck:ratchet`.

## How to add a workflow

Only when the apps or the stage spine differ. Create `client/workflows/<name>/` with `index.ts` (call `createWorkflowMachine`), `rules.ts`, `scenarios.ts`, and `screens.ts`. Register each scenario in `WorkflowRegistry.ts`. Then follow the scenario steps above.

## Code layout

| Path | Purpose |
|---|---|
| `client/engine/workflow/` | Factory, rule and scenario types, recipes, forks, screens |
| `client/engine/` | Registry, actor singleton, provider, `derivePatientRoute`, `FlowType` and `WorkflowData` types |
| `client/workflows/` | One folder per workflow, plus `shared/` |
| `client/shell/` | `DemoShell`, configurator, stage ladders, demo dropdown |
| `client/store/` | `demoStore` and per-portal data stores |
| `client/portals/` | The apps |
| `client/brand/` | Brand schema, resolver, theme, documents |
| `client/ui/` | The one shared UI kit |
| `brands/` | Per-client `brand.json` |
| `docs/` | This file, `BRANDS.md`, `REFACTOR_AUDIT.md`, `plans/`, `archive/` |

For what each scenario demonstrates, see `README.md`.
