# Refactor audit

Audited on `main` (same commit as `Refactor`), 17 Oct 2026. Numbers come from the repo, not estimates. Read-only audit: no code changed.

## Progress

### Step 01: CoAssist on the factory (tag `refactor/01-coassist-machine`)

Three machines (2,305 lines) became one rules table (`workflows/coassist/rules.ts`, 284 lines), three scenarios as data (48 lines), and a generic factory that every other workflow can reuse (`engine/workflow/`, 202 lines). CoAssist now totals 347 lines. Verification: all golden-path, undo, reset, and email fixtures recorded from the OLD machines pass unchanged against the new one. A second set of fixtures, the presenter's jump-to-stage replays, was recorded at `refactor/00-baseline` and also passes. New ordering tests (rule 12) fail when preconditions are weakened. Type errors stayed at 198.

Intentional differences from the old machines (none visible in the fixtures, all in edge cases):

- The machine has one state. Preconditions read `workflowData`. No code read the old state names.
- Onboarding events (SMS, OTP, consent) are accepted until done, in any order BI and PA are in. The old machines accepted them only up to the PA-approved sub-step.
- Repeat events are ignored (a second `RUN_BI`, `PATIENT_PAYS`, `VERIFY_PAYMENT`, address, or ENROLL). The old machines re-fired some of them and appended duplicate log entries.
- DME: the cash-offer SMS goes out whenever BI completes with neither benefit covered. The old machine sent it only if the machine happened to be in its BI-complete node, so a BI that finished before the patient's onboarding missed it.
- Snapshots saved in sessionStorage by the old machines cannot restore, so the snapshot key moved to `-v2` and a failed restore now starts fresh. Open demo sessions reset once.

Still true, pinned as-is: the three CoAssist flows do not support Undo.

Fixed after step 01 (tag `refactor/02-dme-ladder-fix`): the DME jump-to-stage menu never advanced past stage 6 because it sent `SHIP_RX` without `READY_RX`. The CoAssist ladders now live in `shell/coassistLadders.ts`, a pure module that both `DemoShell` and the tests use (the test used to mirror a copy, which hid the bug). Stage 7 now lands on shipped and stage 8 on delivered. A test fails if any ladder sends an event the machine ignores.

Not yet done for CoAssist: auto-advance timers still run in the CRM React component, preconditions for PA (BI says a PA is required) are not enforced for DTP and Copay, and screen order is still `derivePatientRoute`. Those are the next steps.

### Step 03: pricing options wait for enrollment (tag `refactor/03-pricing-after-enrollment`)

Found by a presenter run of CoAssist DTP: BI and PA run off the eRx, so the PA can be approved while the patient is still enrolling. The CRM then said "pricing options sent to patient", and after the patient finished enrollment they sat on the home screen. This was true before the refactor (the old and new machines behave identically here). Three causes:

- No rule said the patient's pricing SMS needs completed enrollment. Added as a precondition on `VERIFY_PA_APPROVED_SMS` (consent confirmed). A new golden path and an invariant test cover it.
- The CRM label ignored consent. It now says "pricing options will be sent once the patient completes enrollment" until consent is confirmed.
- Screen order lives in three places that disagree: `derivePatientRoute`, the patient portal's `DELIVERY_FLOW_PATHS` guard (it will not navigate away from `/enrollment-complete`), and hard-coded `navigate()` calls in pages. `UploadInsurance` fired consent and then hard-coded `/enrollment-complete`, which the guard then protected. The page now navigates to the state-derived route (still `/enrollment-complete` when nothing further is due). This is a patch. Screen order as one list in the workflow definition (rule 13) removes the class of bug.

## Short answers

**Simplify what?** Four things drive most of the complexity: customer variants kept as diverged branches, six near-identical workflow machines, three vendored copies of every portal UI kit, and a brand system whose live source of truth is per-site Netlify Blobs.

**Separate brand admin app?** Yes, but split it by contract, not by building a second full app yet. Committed brand JSON becomes the source of truth. The demo reads it at build time. Admin becomes an optional tool that writes that JSON, and it never ships on client-facing sites.

**Was Blobs the wrong choice?** Right primitive for uploaded images. Wrong source of truth for brand config. Per-site isolation is what forced the Promote feature and most of the redirect workarounds.

**Keep one Netlify site per client.** That gives clean deploys and an isolated share URL. Point every site at `main` and select the brand with a `BRAND` environment variable. Branches remain for short-lived feature work only.

**Better way to manage workflows?** Keep XState. Separate workflows (the platform choreography across apps) from scenarios (outcome variants on one workflow). One machine per workflow, scenarios passed in as data. CoAssist DTP, Copay, and DME become three scenarios of one workflow. See section 2.

## 1. Client variants live in branches instead of config

Context: each client gets its own Netlify site pulling a specific branch. The sales team demos from it, and sometimes the client receives the URL. That model is sound and stays. The issue is what sits on the branches.

| Branch | Ahead of main | Reality |
|---|---|---|
| Celldex, Edding, Hikma, MoonLake, PharmaEssentia | 0 | Branch in name only. No code difference from `main`, so these sites can point at `main` today. |
| wf2-PAP, wf3-coassist, wf3-coassist-v2, wf4-iassist, WF5-PrES-PAP, WF-All-Field-Portal, All-Field-Portal, builtin-brand-uploads-fix | 0 | Fully merged. Safe to delete. |
| Boehringer | 16 | Hand-edited copy across 32 files (Assistivan to Jascayd, dosage, patient name). Behind main by 88 commits. |
| Dexcom | 8 | Real feature work: new `CoA_DME` workflow (798 lines), `resetToStage.ts`, 9 new patient pages, +355 lines in `DemoShell`. |
| TG-Therapeutics | 4 | Copies the whole CRM into `portals/client/` (about 7,000 lines) to scope it to iAssist flows. |

Problems:

- Dexcom and TG hold features `main` lacks. A refactor off `main` will collide with them. Merge or port both first, or the refactor starts with known drift.
- Dexcom has 18 `.fuse_hidden*` junk files committed, about 9,000 lines of dead workflow copies. Remove them before merging.
- Boehringer proves brand copy is hardcoded. Brand and drug names still appear in about 12 source files (`CopayEnroll`, `provider/index`, `PADenied`, `samplePatients`, `caseWizardStore`, and others).
- Six remote `ai_main_*` branches look like generated leftovers.

**Fix:** keep one Netlify site per client, but point every site at `main`.

- Client identity becomes data: a brand JSON, plus a scenario file for patient name, drug, dosage, and sample data.
- Each site sets `BRAND=<slug>`. The build bundles that brand and scenario.
- Per-client behavior becomes config, for example an `enabledFlows` list. Dexcom shows `CoA_DME`. TG shows the iAssist flows and the scoped CRM view. This replaces the 7,000-line CRM copy in `portals/client/`.
- Do not serve all brands from one site by hostname or query string. A client could reach another client's brand. Separate sites keep isolation and a clean share URL.
- Changing a client's brand costs one redeploy. For a sales demo that is acceptable, and it removes the need for Promote.
- Branches stay for short-lived feature work and merge back. Long-lived client branches are what caused the drift (Boehringer is 88 commits behind).

## 2. Workflows: strong engine, copy-paste authoring

What works: XState as the single source of truth, delayed transitions, snapshot undo, a registry. `ARCHITECTURE.md` is accurate on this.

What hurts:

- `createEvent` is copy-pasted into 6 files. So is `INITIAL_WORKFLOW_DATA`.
- `coaCopay.ts` differs from `coaDtp.ts` by 99 of 719 lines. Its own header says it "started as a direct copy." `iAssistPap.ts` differs from `iAssist.ts` by 195 of 585.
- Per-workflow knowledge is spread across about 15 files through `flowType ===` checks: `DemoShell` (15), CRM `Index` (9), `WorkflowEngine` (9), `DeliveryDate` (6), provider (5), `DeliveryAddress` (5), plus many more. Adding a workflow touches six places in `ARCHITECTURE.md`'s own checklist, and Dexcom adds more (`resetToStage`).
- `README.md` says `PrES_PAP` reuses PAP steps end to end and `CoA_Copay` runs the same stages as DTP. Those are config differences carried by whole files.

**Fix: separate workflows from scenarios.**

The current `FlowType` list mixes two ideas. A **workflow** is a platform choreography: which apps take part (CRM, Patient, Provider, Field, iAssist), which app starts, the stage spine, and which app owns each interaction. A **scenario** is a variant that runs on that choreography: different outcomes and content, same apps and same spine.

The code already shows this. `CoA_DME` handles three coverage outcomes inside one machine, driven by `pharmacyBenefitStatus` and `medicalBenefitStatus`. `Fax_QS_PA_Approved` and `Fax_PAP_Audit` already share one machine. `CoA_Copay` is 86% `CoA_DTP`.

Proposed shape (the grouping below is my read of the current flows; confirm it):

| Workflow | Scenarios |
|---|---|
| Standard (fax) | PA approved (the machine also supports PA denied) |
| PAP | Fax PAP with 90-day audit, PrES (provider e-sign intake, legacy but supported) |
| CoAssist | DTP cash pay, Copay, DME (pharmacy covered, medical covered, no coverage) |
| iAssist | PA approved, PA denied with appeal (uses the Rules app) |

PrES is a scenario of the PAP workflow, not a workflow of its own. Its story: BI returns no coverage, the patient goes to the PES to apply for assistance, gets enrolled in the free-drug program, and the Rx goes to the pharmacy while the patient's tracker shows it processed, sent, and delivered. The only difference from Fax PAP is the intake (the provider e-signs instead of faxing). No PA is involved, so intake changes the opening screens and nothing else. Mark it `legacy: true` in its definition: keep it working and tested, label it in the picker, and invest no new features.

Build it in three layers:

1. **Workflow definition** (one per workflow): participating apps, entry app, stage spine and labels, route table per app, and the events each app can send. This is the platform-interaction model.
2. **Scenario** (small data object, many per workflow): outcome choices (BI result, PA approve or deny, pricing path, terminal state), extra or skipped stages, and content overrides. Scenarios do not contain state-machine code.
3. **One machine per workflow**, built by a shared factory. The scenario enters as XState `input` and guards read it from context. Where a scenario needs extra states (DME provider transfer, appeal), add them as state fragments that the factory includes only for that scenario.

### Findings from building the test harness (17 Oct 2026)

Driving every flow headless showed things the first pass missed:

- **The machines do not own the timing.** `ARCHITECTURE.md` said delayed transitions live in XState. They do not. BI completion, PA approve or deny, and appeal filing are `setTimeout` effects in `portals/crm/pages/Index.tsx`. The CRM component also picks the outcome (for example, which DME scenario, or deny instead of approve for `iAssist_PAP`). That is scenario logic living in UI code. There are 51 `setTimeout` calls across the portals. This is the strongest argument for the scenario model: outcomes and timers move into scenario data and machine `after` transitions.
- **Undo is inconsistent.** `CoA_DTP`, `CoA_Copay`, and `CoA_DME` ignore `UNDO`. The other five flows restore the previous step.
- **Pinned as-is, confirm intent.** After `DELIVER_RX`, the CoAssist flows stay on `/order-tracker` on purpose (a code comment in `derivePatientRoute` says so), and the iAssist approval flow does the same. The Fax and PAP flows go to `/medication-delivered`. The iAssist appeal flow stays on `/pa-approved` through delivery, which nothing explains.
- **Rules portal state lives outside the machine.** The iAssist Appeal scenario is the only one that uses the Rules tab. The story: the PA is denied and the CRM says a letter was sent to the provider (`statusLabel: "Letter sent"`, which is not true). The presenter opens Rules, builds a rule, and activates it. The appeal then files itself and gets approved. Today the rule's "active" flag is `appealRuleActive` in `rulesPortalStore` (a separate Zustand store). A CRM React effect watches it and dispatches `INITIATE_APPEAL` after 2.5 seconds. So the one cross-app interaction in this scenario bypasses XState: reset, undo, and persistence each treat it separately, and the machine accepts `INITIATE_APPEAL` with no rule at all. The golden-path test for this scenario skips the rule step for that reason.
- **Four missing `WorkflowData` fields** in five machines were fixed (they started as `undefined`).

The tests cover the machines and route logic only. They do not cover the React timers above. After those move into the machines, the same event lists can run with no UI.

### Ordering and automation rules

Real causal rules need to live in the workflow definition once and apply to every scenario. The example: the BI result decides whether a PA is required, so the PA cannot start until BI returns. In an automated workflow like CoAssist, the system fires BI at enrollment and fires the PA the moment BI says one is required. The delays that make this look like automation are pacing only, not logic.

What the code does today (probe run on 17 Oct 2026, limited to two checks):

- Right after `ENROLL`, no flow accepts `SUBMIT_PA`. The basic order holds.
- After BI reports no coverage, `CoA_DTP` and `CoA_Copay` still accept `SUBMIT_PA`. The Fax, DME, iAssist, and PrES machines do not. The same rule is enforced in some machines and not others.
- The iAssist machines put BI and PA in flight at the same instant, on `ENROLL`. A recent TG commit did that on purpose ("BI and PA both start waiting-for-response on eRx submit"). The real behavior is sequential: both start automatically, BI first, then the PA once BI returns. The machine does not model that order.
- Who fires BI and PA lives in CRM React effects, tied to which tab is open, not to the workflow.

Fix: declare two kinds of rule in the workflow definition, and let the factory generate the machine behavior:

1. **Preconditions.** An event is only allowed when its condition holds. Example: `SUBMIT_PA` requires `biStatus === "complete"` and `biOutcome.paRequired`. The scenario supplies the BI outcome, so the same rule covers DTP, Copay, DME, and the rest.
2. **Automation triggers.** When X happens and a condition holds, fire Y after a delay. Example: on BI complete with `paRequired`, fire `SUBMIT_PA` after 1.5 seconds. Each workflow marks steps as `system` (fires itself, as in CoAssist) or `agent` (waits for a person, as when an agent opens a tab). This replaces the React `setTimeout` effects.

Same precondition, two triggers. The cause is the **intake channel**, a workflow property:

| Intake channel | Workflows | Why | PA trigger after BI says a PA is required |
|---|---|---|---|
| `erx` | CoAssist, iAssist | The HCP already submitted everything in the enrollment application (eRx). | The system initiates the PA submission automatically (`system`). |
| `fax` | Fax intake (standard) | The fax lacks the information needed for the PA. | Manual. An email asks the provider to submit, and the provider's submission in the Provider portal sets PA submitted (`COMPLETE_PROVIDER_PA`). |

The channel defaults from the workflow and a scenario may override it (PrES uses `esign`; it never reaches a PA, because BI returns no coverage). Model the channel once and derive the trigger from it, so a new eRx workflow gets the automatic PA without anyone remembering to wire it. One `paSubmission` step module reads `workflow.intake`.

Decision (17 Oct 2026): for iAssist, BI starts first and the PA starts automatically once BI returns with "PA required". The CRM shows the PA as not started while BI runs. This replaces today's behavior, where both are in flight at `ENROLL`. The iAssist golden-path fixtures change with it, as an intentional re-record. If BI says no PA is required, no PA starts.

One generic invariant test then runs over every scenario: each precondition rejects its event at every point where it does not hold. New scenarios inherit the check for free.

### iAssist Appeal: apps as part of the scenario

The Rules app takes part in one scenario only. Model it as a scenario property, not a global tab:

- The scenario lists its participating apps (`apps: [..., "rules"]`). The shell shows the Rules tab only for scenarios that include it.
- Rule activation becomes a machine event (for example `ACTIVATE_RULE`, sent by the Rules app). The machine records active rules in its context. An `after` transition files the appeal when a rule is active and the PA is denied. `rulesPortalStore.appealRuleActive` goes away.
- The false "Letter sent" label is scenario content on purpose (the gap the rule closes). Store it as a named scenario field so no one "fixes" it.
- Two headless tests: no rule means the case stays at PA Denied; rule activated means the appeal files and is approved.
- The "new rule" form stays inline in the Rules app. Per rule 6, make it a step module only if a second scenario needs it.

### Screen order

The workflow definition owns screen order for every app. Today the patient route comes from one long `if` chain in `derivePatientRoute` (`WorkflowEngine.ts`).

- Order is state-driven, not a wizard. The route is recomputed from state on every change, which is what makes reset-to-stage and undo land on the right screen. Express it as an ordered list of rules: a screen plus the condition that selects it. The first match wins.
- Step modules contribute their screens per app (for example the patient payment page and the CRM payment card). The workflow's step order sets priority. Generate the route function from that list.
- A scenario can add, skip, or replace entries. PrES (`esign` intake) swaps the opening screens. CoAssist Copay with mail order skips the pharmacy pick. DME scenario 2 ends on the provider-transfer screens.
- The same list drives the CRM stage cards and stage bar, the Provider screens, and the patient routes.
- The golden-path fixtures record the patient route at every step. The generated function must reproduce them exactly, except for the intentional iAssist change.

### Step modules

Scenarios share steps, such as payment, pharmacy selection, address and ship date, and enrollment with SMS and OTP. Make each shared step a **step module**. A scenario adds modules to a workflow in order.

A module bundles:

- **Machine fragment:** states and events. Payment: `cashOfferSent`, `PATIENT_PAYS`, `VERIFY_PAYMENT`, `paymentVerified`.
- **Screens per app:** the patient payment page and the CRM stage card. Inputs such as price and pharmacy name arrive as props from the scenario. Payment is representative only. No real payment provider is called.
- **Metadata:** stage label, events that feed Field emails, entry and exit points.

Example: DTP cash pay runs consent, BI, cash offer, payment, ship date, fulfillment. DME scenario 2 runs consent, BI, provider transfer, and stops. DME scenario 3 reuses payment. Today that logic is copied.

Rules:

1. Each module declares what it needs and what it sets. Payment needs a selected pharmacy and a price, and sets `paymentVerified`. A test fails if a scenario orders modules wrongly.
2. Branching belongs to the scenario. A small decision step (for example, the BI result) picks the next module. Modules never know what follows them.
3. Extract a module only when two or more scenarios use it. One-off steps stay inline until a second scenario needs them.

These rules are also recorded in `CLAUDE.md` so every future change follows them.

What this removes:

- `createEvent` and `INITIAL_WORKFLOW_DATA` copies (6 each).
- The `flowType ===` checks in about 15 files. UI reads `workflow` and `scenario` instead.
- Separate files for `coaCopay`, `coaDme`, `coaDtp`. Roughly 2,300 lines become one machine plus three scenario objects (estimate).

What it adds:

- The picker becomes two selectors (workflow, then scenario). Persisted state and undo snapshots key on both.
- Each scenario doubles as a test: a list of events that must reach a named terminal state. Run it headless on every change. That catches the cross-app drift the `CONSISTENCY_*` docs try to prevent by hand.
- `README` scenario descriptions and the reset-to-stage menu can be generated from the same definitions.

Tradeoff: a workflow machine with many scenarios has more states than any one of today's machines. Keep it readable by building states from fragments, not by adding more `if` branches inside shared states.

Migration order: CoAssist first (three files into one, and the strongest evidence), then iAssist (two files), then Fax intake. Do not drop XState. The parallel regions, delayed transitions and undo are the reasons to have it.

## 3. Portals are vendored copies glued with a regex

The portals began as separate repos and were copied in.

- `crm`, `patient`, and `analytics` each contain 49 shadcn primitives. Spot checks show them byte-identical. That is 147 files for one UI kit. `use-toast.ts` is also identical in all three.
- `vite.config.ts` rewrites `@/` imports with a regex `transform` plugin (`portalAliasPlugin`) so each portal resolves its own files first. It also needs five extra aliases mirrored in `tsconfig.json`. This is fragile and hard to debug.
- `scripts/sync-portals.sh` and `setup-portals.mjs` expect sibling repos (`arx-prototype-crm` and others). The `crm` portal's `Index.tsx` is 3,780 lines. Confirm whether those repos are still the source of truth. If not, delete both scripts.
- Bridge hook files (`useDemoState`, `usePatientCase`, and others) exist per portal only to re-export shared hooks.

**Fix:** one `client/ui/` kit, one `@/` alias, a codemod to rewrite portal imports, then delete the Vite plugin and sync scripts. Move per-portal code under `client/portals/<name>/` with no local `components/ui`.

### Oversized files

| File | Lines |
|---|---|
| `portals/crm/pages/Index.tsx` | 3,780 |
| `portals/provider/index.tsx` | 3,269 (about 30 inline components) |
| `portals/field/index.tsx` | 2,201 |
| `portals/analytics/pages/Index.tsx` | 1,600 |
| `shell/DemoShell.tsx` | 1,516 |
| `engine/WorkflowEngine.ts` | 1,119 |

Split these along existing seams (stages in CRM, EHR shell and steps in provider). Test coverage today is three `utils.spec.ts` files. Add tests for the workflow definitions and `derivePatientRoute`; those give the best return.

## 4. State and persistence

- One XState actor plus six Zustand stores (`demo`, `patient`, `caseWizard`, `field`, `presPap`, `rulesPortal`), each persisting to `sessionStorage` under its own key.
- `sessionStorage` is touched in 10 files. `DemoShell` (14 calls) and `actorSingleton` (12) handle it by hand.
- `patientStore` carries a comment that a brand save must also write into the persisted store. Brand and patient data are coupled when they should not be.

**Fix:** one persistence helper with a versioned key and a single "reset everything" path. Move patient identity and sample data into the scenario file so it stops depending on brand state.

## 5. Brand administration

Footprint today: about 2,000 client lines (`Admin.tsx` plus `pages/admin/*`, `activeBrandCache`, `applyBrandCssVars`, `assetUrl`, `brandFilter`), about 850 function lines across 14 files, 12 redirect rules in `netlify.toml`, and 14 uploaded images committed in `public/uploads`.

What is already in place: three brands are committed as JSON, plus an `active-brand.json` fallback. What is not: those files are only a fallback. The live source of truth is Netlify Blobs. Every page load fetches `/.netlify/functions/brand-active` and blocks rendering for up to 3 seconds. Hardcoded brand copy also remains in about 12 source files, so the JSON does not yet control what the client sees.

The demo itself needs one brand JSON. Everything else is admin tooling.

**Separate it.** Reasons:

- Different users, release cadence, and risk. A demo runner should not ship an editor.
- **Security gap, made worse by client sharing:** `/admin` is reachable on every deployed site, including URLs given to clients. I found no auth check in the admin function code. `admin-branding`, `admin-brands`, `admin-assets`, and `admin-upload` are open writes. Only `admin-promote-receive` checks a secret. Unless Netlify site protection covers it, anyone with the URL can overwrite the live brand. Confirm this first.
- The boot path blocks on a network fetch before the app loads.

**How:**

1. Define a versioned brand schema (JSON Schema or Zod).
2. Finish the move: every brand and drug string comes from the brand JSON or scenario file. Remove the hardcoded names.
3. Demo reads `brands/<slug>.json` chosen by `BRAND` at build time. No function and no boot fetch.
4. Strip `/admin` and the admin functions from client-facing builds. Gate on an env flag at minimum.
5. Later, if non-developers need to edit brands, build admin as its own authenticated site that opens a pull request or writes JSON to a shared store.

Do steps 1 to 4 in the refactor. Defer step 5 until there is a clear need.

## 6. Was Netlify Blobs the wrong choice?

Blobs fits the data: small JSON, a few images, rare writes, no queries. The problem is the side effects, and the code comments document them.

- Stores are scoped per environment. That is why Promote exists: `admin-promote`, `admin-promote-receive`, `admin-promote-targets`, `promoteTargets`, `PROMOTE_TARGETS`, `PROMOTE_SECRET`, one secret per site.
- Local work needs `netlify dev`, not `vite`. Plain `pnpm dev` has no `/api`.
- Production quirks needed `force = true` on every rule, splat redirects instead of named params, raw `/.netlify/functions/...` paths that bypass the redirects, a custom `resolveAssetUrlsDeep` rewrite, and a regex that accepts two URL shapes (`admin-brand-detail.ts`). A rewrite that works locally and fails in production is a sign the platform is fighting the design.
- Brand images are stored twice: Blobs and `public/uploads`, plus `builtinUploads` to bridge them.

Options, simplest first:

| Option | Fits when | Tradeoff |
|---|---|---|
| **Git JSON plus `public/brands/<slug>/`, selected by `BRAND` per site** | Developers edit brands, one Netlify site per client. Default recommendation. | Needs a redeploy per brand change. Removes Promote, redirects, boot fetch, and most functions. |
| Shared hosted store (one Blobs site, object storage, or a DB) with a read-only public endpoint | Non-developers edit brands live | One store for all sites, so no Promote. Needs real auth. |
| Keep per-site Blobs | Not recommended | Keeps every cost listed above. |

## 7. Tooling and docs cleanup

- `build:server` points to `vite.config.server.ts`, which does not exist. `start` points to `dist/server/node-build.mjs`, never produced. `tsconfig.json` includes a missing `shared` folder. Remove all three.
- Three lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `deno.lock`). Keep pnpm only.
- Electron and `electron-builder` ship as devDependencies. If the desktop build is unused, drop it and `public/electron.js`.
- `netlify-cli` as a devDependency is heavy; consider a global install.
- `err.log`, `out.log`, and `client/portals/client/` (untracked) are clutter.
- Docs: 11 files. `CONSISTENCY_*` (4 files) and `ARCHITECTURE_ORDER_STORE.md` describe an architecture that no longer exists and say so in their own banners. Keep `README.md`, `ARCHITECTURE.md`, and a short brand guide. Archive the rest.

## Suggested order

1. **Freeze and merge.** Port Dexcom (`CoA_DME`) and TG (iAssist changes) into `main`. Delete the `.fuse_hidden*` files and the 8 merged branches. Confirm admin auth.
2. **Mechanical cleanup (low risk).** One UI kit, delete the alias plugin and sync scripts, fix dead scripts and lockfiles, prune docs.
3. **Brand as data.** Schema, JSON per brand, move hardcoded copy and patient data to brand and scenario files. Add `BRAND` and `enabledFlows`. Repoint each client's Netlify site at `main`. Retire long-lived client branches. Strip `/admin` from client builds.
4. **Workflow factory.** Build `WorkflowDefinition`, migrate `coaCopay` first (smallest diff from `coaDtp`), then the rest. Add tests as you go.
5. **Split the giants.** CRM, provider, field, `DemoShell`.
6. **Brand admin app.** Only if live editing by non-developers is still needed.

## Open questions

- Are the `arx-prototype-*` source repos still being edited? That decides whether sync scripts live or die.
- Who edits brands today, and how often? That decides step 6 and the storage option.
- Is the Electron build used?
- Does Netlify site protection (password or SSO) already cover client URLs?
- Which clients need workflows or screens that others should not see? That sets the `enabledFlows` defaults.
