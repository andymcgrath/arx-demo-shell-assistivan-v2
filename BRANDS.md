# Brands

One brand per client. Each client has one Netlify site that builds from `main`.

## Add or change a brand

1. Create `brands/<slug>/brand.json`. Copy an existing one. The type is `BrandConfig` in `client/brand/schema.ts`.
2. Put images in `public/brands/<slug>/` and refer to them as `/brands/<slug>/<file>`.
3. Set `title` (the browser tab title) and `enabledFlows`. The first entry is the flow a new session starts on.
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

Code reads these as CSS variables. Brand: `--arx-primary` (same as `--arx-brand`), `--arx-primary-dark`, `--arx-primary-80`, `--arx-primary-30`, `--arx-accent`, `--arx-gradient`. Buttons: `--arx-action`, `--arx-action-hover`, `--arx-on-action`. Use the `bg-arx-action` family of Tailwind classes on buttons and `arx-primary` for everything else. Derivation lives in `client/brand/theme.ts`.

## Start from another brand

A brand that looks like the default but shows different flows needs only a short file:

```json
{
  "extends": "assistivan",
  "slug": "hikma",
  "name": "Hikma",
  "title": "Hikma Demo",
  "enabledFlows": ["Fax_QS_PA_Approved", "iAssist_PA_Approved"]
}
```

The build merges it over the parent. Objects merge field by field. Arrays and values replace the parent's, so a child's `enabledFlows` replaces the whole list. Change only what differs. A change to the parent reaches every child. The brand test checks the merged result.

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
