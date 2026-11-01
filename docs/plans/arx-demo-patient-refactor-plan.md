# Plan: patient view in the reference shell (v2)

Status: plan only. No code in either project has changed.

## Decision summary

- The reference (`arx-demo-shell-assistivan-v2`) is the base. The patient project (`arx-demo-patient`) is not ported into. Its look and feel moves into the reference as a skin.
- The patient look applies only in the `patient` view. The full view is unchanged.
- View is a runtime choice, not a build flag. It is independent of `BRAND`. A client brand such as celldex can show both.
- The view toggle shows only for brands that list `enabledViews`. A brand without it stays on the full view with no toggle.
- The patient project is retired after the move. Tag it `archive/patient-fork` first.

## Why this direction

The reference is 25+ tagged steps ahead of the fork (tests, factory, recipes, forks, brand JSON, about 580 tests). The patient project has no tests and the old machines. Its real differences are small and sit in presentation:

- `Header.tsx` (223 changed lines), Tailwind and global CSS.
- Two-factor screens: `TwoFactorShell`, `OtpBoxes`, Phone, OTP, PA-approved SMS and OTP pages.
- `MedicationDelivered` (268 changed lines).
- New pages: `Articles`, `ReVerification`, `RequestRefill`, and the `BiTracker` home component.
- Presenter chrome: `PhaseNav`, `standardPhaseNav`, `StepExplainer`, `TriggerPanel`, patient-only `DemoShell`.

## Vocabulary addition (add to CLAUDE.md)

**View:** how a demo is presented. `full` shows every portal. `patient` shows only the patient experience, with the Trigger panel and PhaseNav standing in for the CRM. A view is shell state. It is not workflow, scenario, or brand, and it never enters the machine.

## Rules for presentation changes

1. Shared logic (engine, workflows, rules, recipes, forks, screen catalogs, brand schema) changes both views. Fix behavior there, never inside a skinned page. Expect fixtures to move, and read the diff before re-recording.
2. One resolver, `client/shell/skin.ts`, returns the component for each slot (Header, Footer, TwoFactorShell, MedicationDelivered, and so on) from the current view. Pages render a slot and never check the view. A test fails when a view check appears outside the resolver.
3. Patient-view components live in `client/portals/patient/skins/patient/`. Default components stay untouched.
4. Patient CSS sits under `[data-shell="patient"]`, set on the root at runtime. Edits to `tailwind.config.ts` are additive only.
5. Leave `client/ui/` alone. Restyle through classes or CSS variables inside the skin.
6. The skin reads brand tokens (`arx-primary`, `arx-action`). No hardcoded colors.
7. `TriggerPanel`, `PhaseNav`, and `StepExplainer` mount only in the patient view. `DemoShell` behavior in the full view does not change.
8. Engine fixtures must not change during skin work. If one does, behavior changed.

## How views work

- `demoStore` holds `view` (`full` or `patient`). It persists through the one persistence helper with a versioned key. It is not in the machine, so saved sessions survive and switching view keeps progress.
- A demo may pin a view in `brand.json`:

  ```json
  { "id": "coa-dtp-patient-view", "flow": "CoA_DTP", "view": "patient",
    "label": "CoAssist DTP: patient's view" }
  ```

  A demo without `view` starts in `full`.
- `enabledViews` (optional, brand level) lists the views the brand allows, for example `["full", "patient"]`. The header Full / Patient toggle appears only when a brand lists it. A brand that lists only `["patient"]` opens patient-only with no toggle. A brand without the field gets `full` and no toggle.
- A demo that pins a view the brand does not enable fails the brand test. So does an unknown view.
- `?view=patient` opens that view, when the brand enables it.
- Reset restarts the selected demo and keeps the current view.

## Steps

Each step is one commit and one annotated tag, `patient-view/NN-name`, with test count and type-error baseline in the message. Work on a branch off `main`. Never tag a red build.

0. **Baseline.** Confirm `pnpm test` and `pnpm typecheck:ratchet` are green on `main`. Tag `patient-view/00-baseline`. Tag the patient repo `archive/patient-fork`. Record a render test of the main patient pages with the default view. It is the leak guard for every later step.
1. **View plumbing.** Add `view` to `demoStore`, `enabledViews` and demo `view` to the brand schema, the brand test rules, and `?view=`. Add `skin.ts` returning default components for both views. No visual change. Add the rule 2 test.
2. **Patient shell layout.** In the patient view, `DemoShell` hides the other portal tabs and shows the patient portal alone. Add the header toggle, gated on `enabledViews`.
3. **Skin: look and feel.** Port the CSS under `[data-shell="patient"]` and the skinned slots: Header, Footer, TwoFactorShell and OtpBoxes, the two-factor pages, MedicationDelivered. Diff each page against the fork and keep visual changes only. Compare the full view against `main` after the step.
4. **Trigger panel.** Rebuild it from the workflow definition. It lists the events each rule allows now, marks each `system` or `agent`, and for `agent` steps fires `VIEW_STAGE` and the manual events in place of the CRM. Machines stay unchanged. Test: every `agent` step in every scenario is reachable from the panel.
5. **PhaseNav and StepExplainer.** Build phases from each workflow's stage list so they work for every scenario, not only Standard. Test: every phase maps to a real stage. `StepExplainer` reads module metadata.
6. **New pages.** Add `Articles`, `ReVerification`, `RequestRefill` as screens in module or catalog entries, so only scenarios that list them show them. Add each to the patient menu test.
7. **Demos and brands.** Add patient-view demos and `enabledViews` to the brands that should show them (start with celldex). Update `docs/BRANDS.md`, `docs/ARCHITECTURE.md`, and CLAUDE.md. Add a progress entry to `docs/REFACTOR_AUDIT.md`.
8. **Verify.** `pnpm test`, `pnpm typecheck:ratchet`, `BRAND=celldex pnpm build:client`, then click each flow in both views in a browser.

## Risks and open checks

- A skin leak is visual and easy to miss. The reference's CRM and patient rendering has not been browser-checked for several steps. Compare the full view to `main` after steps 3 and 6.
- The fork's denied-PA dead-end fix (commit 3b382ef) must be checked against the reference rules. If the reference still has the bug, fix it in the workflow, not the skin.
- Some fork page changes may be logic, not visual. Each one goes to the shared module (rule 1), or is dropped.
- Both skins ship in one bundle. That is acceptable for a demo.
- `agent` steps stall without `VIEW_STAGE`. Step 4 covers it. Until then the patient view cannot advance BI or PA on its own.

## Not in scope

- Per-scenario patient identity at runtime (the reference audit lists it as a separate step).
- A build-time default view. `enabledViews: ["patient"]` covers a patient-only client site.
