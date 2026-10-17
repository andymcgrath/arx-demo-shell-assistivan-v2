# Project instructions

Sales demo shell. One browser tab shows several apps (CRM, Patient, Provider, Field, iAssist, Rules, Analytics) driven by one XState actor. All data is representative. Nothing calls a real payment provider, EHR, or database.

`REFACTOR_AUDIT.md` explains the reasoning behind the rules below. `ARCHITECTURE.md` describes the current (pre-refactor) code. Where they differ, the refactor target below wins on the `Refactor` branch.

## Vocabulary

- **Workflow:** the platform choreography. Which apps take part, which app starts, the stage spine, and which app owns each interaction. Example: CoAssist.
- **Scenario:** a variant that runs on a workflow. Different outcomes and content, same apps and spine. Example: CoAssist DTP, Copay, DME.
- **Step module:** a reusable step shared by scenarios. Example: payment, pharmacy selection, address and ship date, enrollment with SMS and OTP.
- **Legacy scenario:** a scenario marked `legacy: true` (for example PrES). Keep it working and tested. Add no new features to it.
- **Brand:** client identity (names, logos, colors, copy). Separate from workflow and scenario.

## Workflow rules

1. One XState machine per workflow, built by a shared factory. Do not copy a machine to make a new scenario.
2. A scenario is data: outcomes, step order, content overrides. It contains no machine code. It enters the machine as XState `input`.
3. A step module bundles a machine fragment, its screens per app, and metadata (stage label, Field email events, entry and exit points). Scenario values such as price or pharmacy name arrive as props.
4. Each module declares what it needs and what it sets. Payment needs a selected pharmacy and a price, and sets `paymentVerified`. A test must fail when a scenario orders modules wrongly.
5. Branching belongs to the scenario. A small decision step (for example, the BI result) picks the next module. A module never knows what follows it.
6. Extract a module only when two or more scenarios use it. Keep one-off steps inline until a second scenario needs them.
7. Do not add `flowType ===` checks in UI code. Read `workflow` and `scenario` from the definition.
8. Every scenario ships with a headless test: an event list that must reach a named end state.
9. Keep XState. Its parallel regions, delayed transitions, and undo are the reason to keep it.
10. Auto-advance timers that decide scenario outcomes (BI result, PA approve or deny, appeal) belong in the machine as `after` transitions, not in React `setTimeout` effects. Today they live in `portals/crm/pages/Index.tsx`. Move them as each workflow migrates.
11. Ordering rules live in the workflow definition as preconditions (an event is allowed only when a condition holds) and automation triggers (when X happens and a condition holds, fire Y after a delay). Example: a PA needs a completed BI whose outcome says a PA is required. Never encode ordering in a UI effect. Mark each automated step `system` or `agent`. The trigger for a step (system fires it, an agent clicks, or a provider acts after an email) is a parameter of the step module. The precondition stays the same across triggers.
    Intake channel (`erx`, `fax`, or `esign`) defaults from the workflow and a scenario may override it. `erx` workflows (CoAssist, iAssist) already hold everything the PA needs, so a PA starts automatically once BI completes and says a PA is required. `fax` workflows need a manual PA: an email asks the provider, and the provider's submission starts the PA.
12. One invariant test runs over every scenario and checks that each precondition rejects its event wherever it does not hold.
13. The workflow definition owns screen order for every app as an ordered list of rules (screen plus the condition that selects it, first match wins). Step modules contribute their screens. A scenario may add, skip, or replace entries. Generate `derivePatientRoute`, the CRM stage list, and the patient hamburger menu from it. Do not hand-edit a shared `if` chain or a per-flow menu list. A test checks that every screen a scenario visits appears in its menu.

## Test rules

- Run `pnpm test` before and after every refactor step. It must stay green.
- Machine tests live in `client/engine/__tests__/`. They drive machines with event lists and assert on `workflowData`, emitted events, and `derivePatientRoute()`. Do not assert on internal state names.
- Expected output lives in `__fixtures__/*.json`. If behavior changes on purpose, run `RECORD=1 pnpm test`, review the fixture diff, and commit it with the change. Never record to make a failing test pass without reading the diff.
- Add or update a scenario in `scenarios.ts` whenever a flow or branch is added.
- Checkpoint tags: when a refactor step is finished and `pnpm test` and `pnpm typecheck:ratchet` both pass, commit, then tag it `refactor/NN-short-name` (annotated, numbered in order, for example `refactor/01-coassist-machine`). Put the test count and type-error baseline in the tag message. Never tag a red build. To go back, `git switch -c <name> <tag>`.
- `pnpm typecheck:ratchet` fails if the type-error count rises above `.typecheck-baseline`. Lower the baseline with `--update` whenever the count drops. At zero, switch to plain `pnpm typecheck`.

## Brand and deploy rules

- Brand lives in committed JSON under a brand folder. Brand and drug names never appear in source code.
- Each client has one Netlify site pointing at `main`. The `BRAND` environment variable selects the brand at build time. Per-client screens come from `enabledFlows` in config.
- Do not create long-lived client branches. Feature branches are short-lived and merge back.
- No runtime brand fetch and no Netlify Blobs for brand config.
- `/admin` and admin functions must not ship in client-facing builds.

## Code rules

- One UI kit at `client/ui/`. Do not add a `components/ui` folder inside a portal.
- One `@/` alias. No import-rewriting Vite plugins.
- One persistence helper with a versioned key and one reset-everything path. Do not call `sessionStorage` directly.
- Keep files under about 600 lines. Split along existing seams.
- Do not commit logs, `.fuse_hidden*` files, or generated Netlify state.
- One lockfile: `pnpm-lock.yaml`. Do not add `package-lock.json` or `deno.lock`. Use pnpm for every install and script.
- Pin `NODE_VERSION` in `netlify.toml` to a version Vite supports (20.19+ or 22.12+).

## Style

Follow the user's global writing rules. Short sentences. No em dashes. Sentence-case headings.
