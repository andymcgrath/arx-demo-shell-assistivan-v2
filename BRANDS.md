# Brands

One brand per client. Each client has one Netlify site that builds from `main`.

## Add or change a brand

1. Create `brands/<slug>/brand.json`. Copy an existing one. The type is `BrandConfig` in `client/brand/schema.ts`.
2. Put images in `public/brands/<slug>/` and refer to them as `/brands/<slug>/<file>`.
3. Set `title` (the browser tab title) and `demos`. The first demo is where a new session starts.
4. Run `pnpm test`. The brand test checks required fields, real flow ids, and that every local image exists.

## Colors

A brand sets up to three colors under `program.colors`. Only `brand` is required.

```json
"colors": {
  "brand": "#1B3764",
  "accent": "#5DB37E",
  "action": "#EE4B6E",
  "source": "https://example.com"
}
```

- `brand`: the logo color. Headings, footer, links. Dark, light, and wash shades derive from it.
- `accent`: the second brand color. Pairs with `brand` in gradients. Optional.
- `action`: the button color. Defaults to `brand`.
- `source`: where the values came from. Read them from the live site's CSS or the logo file, not from a screenshot.

Buttons keep white text. When white misses WCAG AA on `action`, the fill darkens a little (same hue) until it passes. If that takes a big change, the color stays and the text turns near-black. Buttons use `action`. Headings, links, icons, bars, and confirmation screens use `brand`. Button hover shades derive from `action`. The brand test fails when button text misses AA. Logo and hero images go in `program.assets` (`logoColor`, `logoWhite`, optional `hero` and `background`). Logos must be transparent files. Do not use a CSS filter.

`surfaces` holds style choices for the screens that use these colors. They are not colors, so brand, accent, and action stay the three-color standard. Every key is optional and a missing key takes its default. "Accent" below means the accent color, or the brand color when the brand has no accent.

```json
"colors": {
  "brand": "#15355E",
  "accent": "#59B47D",
  "surfaces": { "confirmation": "gradient", "strip": "accent" }
}
```

| Key | Options (default first) | What it controls |
|---|---|---|
| `confirmation` | `brand`, `accent`, `gradient` | Background of the full-color confirmation screens. `gradient` runs brand to accent. |
| `strip` | `none`, `accent`, `brand` | The 3px line under the header. `none` leaves it white. |
| `tiles` | `tint`, `accent` | Icon tiles. `tint` is a light brand tint with a brand icon. `accent` is a solid tile with a readable icon. |
| `stepRow` | `brand`, `accent` | Fill of the active step in the order tracker. |
| `marker` | `accent` (`white` with no accent), `white`, `brand` | The number circle on the active step. It shows white when it would match its row. |
| `headings` | `brand`, `dark` | Color of headings and links. `dark` is the darker brand shade. |

Text on a confirmation screen, the step row, and a solid tile is white or near-black, whichever scores better. On a gradient it scores across the text area (the middle of the span, not the ends). A typo in a key or option fails the brand test.

### Preview and score a choice

Run `pnpm dev` and open `/brand-lab`. It is dev only and left out of client builds. Pick brand, accent, action, and each surface style. The mock screens and the contrast table update as you type. Each pair shows its ratio and the four WCAG levels (AA large 3.0, AA 4.5, AAA large 4.5, AAA 7.0). Text pairs need AA 4.5. Large text and UI parts need AA large 3.0. Copy the JSON into `program.colors` when you like it.

Two pairs are required and fail `pnpm test`: button text on the action color, and the confirmation heading (large text). The rest show as warnings in the Lab. Fix a warning by adjusting the color, not by editing the test.

Code reads these as CSS variables. Brand: `--arx-primary` (same as `--arx-brand`), `--arx-primary-dark`, `--arx-primary-80`, `--arx-primary-30`, `--arx-accent`, `--arx-gradient`. Buttons: `--arx-action`, `--arx-action-hover`, `--arx-on-action`. Use the `bg-arx-action` family of Tailwind classes on buttons and `arx-primary` for everything else. Derivation lives in `client/brand/theme.ts`.

## Start from another brand

A brand that looks like the default but shows different flows needs only a short file:

```json
{
  "extends": "assistivan",
  "slug": "hikma",
  "name": "Hikma",
  "title": "Hikma Demo",
  "demos": [
    { "id": "fax-qs-pa-approved", "flow": "Fax_QS_PA_Approved", "label": "Standard" },
    { "id": "iassist-pa-approved", "flow": "iAssist_PA_Approved", "label": "iAssist" }
  ]
}
```

The build merges it over the parent. Objects merge field by field. Arrays and values replace the parent's, so a child's `demos` replaces the whole list. Change only what differs. A change to the parent reaches every child. The brand test checks the merged result.

## Demos

`demos` is the dropdown a client uses. Each entry is a story: a flow plus the branch to take at each fork.

```json
"demos": [
  { "id": "coa-dme-pharmacy-covered", "flow": "CoA_DME",
    "label": "DME: Pharmacy Coverage",
    "description": "The pharmacy benefit covers it and needs a PA.",
    "choices": { "bi": "pharmacy_covered" } },
  { "id": "coa-dme-no-coverage", "flow": "CoA_DME",
    "label": "DME: No Coverage (Cash)",
    "choices": { "bi": "no_coverage" } }
]
```

- `id` is unique in the brand. `flow` is a real flow id. `label` is what the client sees.
- `choices` maps a fork id to an exit id. Forks are declared in `client/workflows/<workflow>/forks.ts`. A demo can only pick declared exits, so a typo fails the brand test instead of building a bad path. Leave out a fork to take the scenario's default.
- Selecting a demo switches to its flow. If the running flow is on different branches, it restarts with the demo's. Otherwise it keeps its progress. Reset restarts the selected demo.
- The CRM also shows branch buttons for any presenter fork, so a presenter can switch branch mid-demo.
- To show one flow several ways, list it more than once with different `choices`. The brand test rejects two demos with the same flow and choices.

## Images stay with their client

The build keeps only the active brand's image folder, plus the folders of any brand it extends. Other clients' folders are deleted from the build, so their URLs return nothing on that site. A brand may therefore point only at images in its own folder or a parent's. The brand test checks this. `pnpm dev` still serves every folder.

## Pick a brand

Set `BRAND=<slug>` in the Netlify site settings. The default is `assistivan`. The build fails when the slug has no `brands/<slug>/brand.json`.

```
BRAND=dexcom pnpm build:client
BRAND=dexcom pnpm dev
```

A brand change costs one redeploy. There is no runtime fetch, no Netlify Blobs, and no admin screen.

## Not in the brand file yet

Some brand and drug names still sit in source (patient copy, sample patients, the provider portal). See `REFACTOR_AUDIT.md`, Step 10.

## Pharmacy transfer and the Brand Lab Demos tab

`program.transferPartner` sets the pharmacy a transfer shows (name, address, city, state, zip, phone). It applies to the `pharmacy_transfer` exit of the CoA_DME `bi` fork. The patient does not pick a pharmacy on that branch. When the brand names no partner, a placeholder pharmacy shows.

The CRM has no branch buttons. The demo dropdown picks the branch. A fresh session starts on the selected demo's choices.

The Brand Lab at `/brand-lab` has two tabs. Colors previews and scores a palette. Demos picks a workflow and a branch for each fork, shows the journey, and copies the `demos` JSON. Forks are read only there. A new fork needs rule code.

`brands/_template/brand.json` lists every field. Required: `slug`, `name`, `title`, at least one demo, `manufacturer`, `program` with `drugDisplayName` and `colors.brand`, `manufacturer.legal.privacyUrl`, and `chatbotIcon`. Everything else is optional. The tests also need every local image path to point at a committed file.
