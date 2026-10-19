# CRM-driven model: draft v2

Status: draft for review. Nothing in `CLAUDE.md` or the code has changed.

## Principle

Define the components once. Let the demo author wire them into a scenario. The system does not decide which scenarios exist. It only rejects combinations that cannot work.

## The recipe

A scenario is a recipe with three parts.

```ts
interface Scenario {
  source: SourceId;                     // the scaffold
  choices: Record<ForkId, ExitId>;      // which outcome at each fork
  modules: ModuleSpec[];                // which patient modules run, in order, with props
}
```

Example: a sales rep asks for "CoAssist, pharmacy coverage, PA approved, patient picks a pharmacy, no payment."

```ts
{
  source: "coassist",
  choices: { bi: "pharmacy_coverage", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "pharmacy_selection" },
    { id: "tracking" },
  ],
}
```

Another rep asks for "iAssist, pharmacy coverage, PA denied, appeal approved, copay, mail order."

```ts
{
  source: "iassist",
  choices: { bi: "pharmacy_coverage", pa: "denied", appeal: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "financial_assistance", props: { variant: "copay" } },
    { id: "scheduling" },
    { id: "tracking" },
  ],
}
```

Same components. Different recipe. No new code.

## Components

### 1. Sources

Scaffold only. Each declares intake channel, participating apps, first actor, and opening data.

CoAssist, iAssist, Fulfillment Center, PrES (legacy), PES (legacy).

### 2. Forks

System outcomes the presenter or story picks. Each exit sets data.

| Fork | Exits | Precondition |
|---|---|---|
| `bi` | `pharmacy_coverage`, `medication_coverage`, `no_coverage` | BI started |
| `pa` | `approved`, `denied` | BI complete and says a PA is required |
| `appeal` | `approved`, `denied` | PA denied |
| `triage` | `commercial`, `non_commercial`, `transfer` | PA approved, or BI said no PA needed |

### 3. Modules

Each module declares what it needs, what it sets, and what it adds to the tracker. The recipe supplies props.

| Module | Lane | Needs | Sets | Props | Tracker steps |
|---|---|---|---|---|---|
| `enrollment` | patient | referral received | `consentVerified` | none | Enrolled |
| `financial_assistance` | patient | an entry point (below) | `assistanceApplied`, `assistanceOutcome` | `variant`: `pap` (outcome Free) or `copay` | PAP qualified or Copay enrolled |
| `pharmacy_selection` | patient | `consentVerified` | `selectedPharmacy` | none | Pharmacy selected, Rx transferred |
| `scheduling` | patient | `consentVerified` | `address`, `shipDate` | none | Delivery scheduled |
| `payment` | patient | pharmacy (selected or assigned), price; `scheduling` when `method` is `mail_order` | `paymentVerified` | `price`, `method`: `retail` or `mail_order` | Payment received |
| `tracking` | patient | at least one other module ran | none | none | Combines steps from modules that ran |

Tracker steps come from the modules that ran. The tracker shows the path taken.

## Financial Assistance entry points

Financial Assistance is not a fixed stage. Fork exits send the patient into it. Each entry point is data on the exit that leads there.

| Entry point | Fork exit | Variant | Patient choice |
|---|---|---|---|
| 1 | `bi.no_coverage` | `pap` (Free) | PAP qualification step |
| 2 | `appeal.denied` (no coverage) | `pap` (Free) | PAP qualification step |
| 3 | commercial pharmacy benefit coverage | `copay` | Patient chooses to enroll for a reduced price |

```ts
interface ForkExit {
  // existing fields stay
  enters?: { module: "financial_assistance"; props: { variant: "pap" | "copay" }; optional?: boolean };
}
```

Entry 3 is `optional`. If the patient declines, `price` is the full price and `payment` becomes required.

After Financial Assistance the patient continues into the Triage components. Copay can lead to:

- Pharmacy selection, then Rx transfer, then tracking.
- Pharmacy selection, shipping, payment, then tracking.

The final outcome is a combination of fork picks, one entry point, and the Triage modules.

## Payment and shipping

`payment.method` is a prop: `retail` or `mail_order`.

- `mail_order` requires `scheduling` (address and ship date). This is a module contract.
- `retail` does not.
- `scheduling` may still run without `payment`, for example a free shipment. That keeps your flexibility for the Free path.

## Triage stage

Triage is a stage with its own components. Four modules live inside it: `pharmacy_selection`, `scheduling`, `payment`, and `tracking`. `enrollment` and `financial_assistance` sit in other stages.

The Triage fork (Commercial, Non-commercial, Transfer) is the first choice in the stage. Each exit carries rules for the four components. The rules decide what the final scenario outcome can be. The author still picks inside those rules.

Each exit sets a rule per component:

- `required`: the module must be in the recipe.
- `forbidden`: the module must not be in the recipe.
- `optional`: the author decides. The exit may supply a default.

Triage runs after coverage resolves. It chooses the path, not the payer. There is no separate `payer` field. Commercial coverage is the BI result: pharmacy coverage and medication coverage are both subsets of it, and `no_coverage` means non-commercial. The Triage exit is pre-selected from the BI exit. The author can still pick Transfer.

| Component | Commercial | Non-commercial | Transfer |
|---|---|---|---|
| `pharmacy_selection` | optional (default on) | optional | optional |
| `scheduling` | optional | optional | forbidden |
| `payment` | optional | optional (default on) | forbidden |
| `tracking` | required | required | required |

Your two examples fit these rules:

- Commercial, patient selects pharmacy, Rx transferred, no scheduling, no payment: pharmacy selection on, the rest off. Valid.
- Admin-only transfer: no scheduling, no payment. Valid, and the rules enforce it.

Exits may also add preconditions across components. Example: `payment` needs a price. `scheduling` needs a mail-order fulfillment prop. Enforcement is the same as for any module contract.

```ts
interface TriageExit extends ForkExit {
  rules: Record<TriageModuleId, "required" | "forbidden" | "optional">;
  defaults?: TriageModuleId[];   // pre-ticked in the builder
}
type TriageModuleId = "pharmacy_selection" | "scheduling" | "payment" | "tracking";
```

## What the system enforces

Choice is free. Contracts are not.

- **Needs and sets.** A recipe that orders modules wrongly fails. Example: `payment` before any pharmacy.
- **Fork preconditions.** An event is rejected wherever its precondition does not hold (rule 12).
- **Valid choices.** A choice that names no declared exit fails the brand test (rule 14).
- **No dead ends.** A recipe must reach a named end state.

## Defaults

Forks may suggest modules, and the builder pre-ticks them. The author can override every one. Free skipping scheduling is a default, not a rule. Switching it on is one click.

## Checkpoints

Each stage transition snapshots state for reset and undo. A module boundary is a checkpoint too.

## Builder UI

A presenter or author picks, in order:

1. Source.
2. BI outcome.
3. PA outcome, then appeal if denied.
4. Triage outcome.
5. Modules to include, with props. Defaults pre-ticked.

The controls draw from the declarations. Nothing is hand-built per source.

## Proposed vocabulary changes

- **Workflow:** one CRM-driven machine. Owns the stage spine and the two swimlanes.
- **Source:** the scaffold. Replaces "workflow" for CoAssist, iAssist, and so on.
- **Scenario:** a recipe (source, fork picks, module list). Pure data.
- **Module:** a reusable patient or system block with needs, sets, props, and tracker steps.
- **Checkpoint:** a stage or module transition where state is snapshotted.
- **Swimlane:** `system` (never seen by the patient) or `patient` (reached by notification).

Rule changes:

- Rule 1: one machine for the CRM workflow. Sources are data.
- Rule 3: modules declare needs, sets, props, and tracker steps.
- Rule 5: branching lives in forks. The recipe lists modules.
- Rule 6: extract a module only when two scenarios need it. Every module above already has two or more.
- Rule 11: steps are marked `system`, `agent`, or `patient`.
- Rule 14: remove `scenarios: [...]` filters on forks. A source declares which forks it uses.

## Dropped from v1

`payment_method` and `fulfillment_method` forks, the exit-to-module table, and `availableWhen`. Payment method is now a module prop. Fulfillment is just which modules the recipe includes.

## Open questions

None open. Next step is the migration plan below.

## Migration plan

One source at a time. `pnpm test` and `pnpm typecheck:ratchet` stay green at every step. Tag each finished step `refactor/NN-short-name`.

1. Add the component types: module contracts (needs, sets, props, tracker steps), `enters` on fork exits, and Triage rules. No behavior change.
2. Move CoAssist onto the recipe. It already has forks and golden paths, so it is the reference.
3. Add the headless tests: module-order, precondition invariant, and one golden path per recipe. (Done. Module order is `recipes.test.ts`. The precondition invariant is `coassist.invariants.test.ts` and covers CoAssist only. Golden paths now name an end state in `END_STATES` and must reach it, and a test fails if a scenario has no golden path. The invariant extends to each source as step 4 moves it.)
4. Move the next source onto the recipe. Repeat for each remaining source.
5. Collapse the per-source machines into the one CRM machine once the last source moves.
6. Update `CLAUDE.md` vocabulary and rules. This lands with step 5, so the docs match the code.
