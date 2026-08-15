# Branding Admin: how it works and how to use it

This covers the `/admin` branding screen: what it does, why it's built the way it is, and the exact steps to use it without losing work. Read the "Mental model" section first, most confusion comes from treating this like the old system, which it isn't anymore.

## Mental model

There are two separate places brand data can live, and they don't talk to each other automatically:

1. **Git** — the code itself, plus three brands (Assistivan, Boehringer Ingelheim, TG Therapeutics) that are hardcoded into the app as permanent defaults. Anything here moves normally with `git merge` / `git push` / a Netlify deploy.
2. **Netlify Blobs** — a small database-like storage layer built into Netlify. Every brand you create or edit through the `/admin` screen (beyond the three defaults) lives here, not in a file, not in git.

Blobs storage is **separate per environment**. Your local dev environment has its own private Blobs store. The live production site has a completely different one. This means:

- A brand you save while testing locally will *never* show up on the production site on its own.
- Merging a branch to `main` and deploying does **not** move any brand data, only code.
- The only way to move a brand from dev to production is the **Promote to Prod** button.

If you remember nothing else: **git moves code, Promote moves brands.**

## One-time setup (per machine)

1. Install dependencies: `pnpm install`
2. Log into Netlify and link this folder to the real site (only needs doing once per machine):
   ```
   pnpm exec netlify login
   pnpm exec netlify link
   ```
   Pick the site when prompted (e.g. `assistivan-demo`).
3. Create your local environment file:
   ```
   cp .env.example .env
   ```
4. For **every** site you want to be able to promote to (your main production site, plus any additional per-branch sites), generate a distinct secret with `openssl rand -hex 32` and set it as `PROMOTE_SECRET` in that site's own Netlify dashboard → Project configuration → Environment variables. Each site gets its own value, don't reuse one secret across multiple sites, a leaked secret would then let someone write to all of them instead of just one.
5. In your local `.env`, list every site you can promote to under `PROMOTE_TARGETS` as a JSON array, using the matching secret for each:
   ```
   PROMOTE_TARGETS=[{"name":"Production","url":"https://assistivan-demo.netlify.app","secret":"<that site's PROMOTE_SECRET>"},{"name":"PharmaEssentia","url":"https://pharmaessentia-demo.netlify.app","secret":"<that site's PROMOTE_SECRET>"}]
   ```
   Do **not** set `PROMOTE_TARGETS` on any deployed site, only in your local dev `.env`. A site has nowhere further to promote to, and leaving this unset there is what makes the Promote button correctly refuse to run if someone clicks it on a live site by mistake.

## Running it locally

Always use:
```
pnpm run dev:netlify
```
Not `pnpm run dev`. The plain `dev` script only starts the frontend, it has no working `/admin` API at all. `dev:netlify` runs everything through Netlify's local proxy, which is what gives you a working (and safely sandboxed) Blobs store to test against.

## Editing or creating a brand

1. Go to `/admin` in whichever environment you're working in.
2. Pick an existing brand from **Load brand**, or click **New Brand** to start blank.
3. Edit the Manufacturer and Program tabs, upload logos/favicon/chatbot icon as needed.
4. Type a name in **Preset name** if you want this saved as a reusable brand (not required if you're just editing the currently active one).
5. Click **Save Changes**.

Save always makes the brand **live immediately in whatever environment you're currently in.** There's no separate "activate" step, saving *is* activating, for that environment only.

## Getting a brand from dev onto production

1. Build and save the brand in your local dev environment until it looks right.
2. If you have more than one promote destination configured, a dropdown appears next to the Promote button, pick which site you're sending to. With only one configured, it's used automatically.
3. Click **Promote to Prod**.
4. This copies the brand's data *and* any logo/favicon files it references to that site's own storage, without changing anything else already live there.
5. Load `/admin` on that site's actual URL to confirm it landed.

If **Promote to Prod** says it's "not configured," your local `.env` is missing `PROMOTE_TARGETS`, go back to the one-time setup above. If it says "unknown promote target" or "more than one target configured, specify which one," pick a destination from the dropdown first.

## Uploading logos and images

- Upload, Asset Library, and Paste URL all work the same as before.
- Uploaded files are stored per-environment, same rule as brands. An image uploaded in dev won't appear in production's Asset Library until a brand that references it gets promoted.
- If an Asset Library shows "0 assets" on a site you haven't promoted anything to yet, that's expected, not a bug.

## Making a brand a permanent built-in

The three defaults (Assistivan, Boehringer Ingelheim, TG Therapeutics) are different from everything else: they're written into the code itself, so they exist even on a totally empty Blobs store, and they can't be deleted from the admin screen.

If a brand needs that same permanence (survives regardless of Blobs state, ships with every deploy automatically), that's a code change, not something you can do from `/admin`. Ask for that specifically, it takes adding the brand's JSON as a real file in the codebase, not just saving it through the UI.

## Troubleshooting

| What you see | What it means |
|---|---|
| `pnpm run dev:netlify` times out waiting for a port | `netlify.toml` is missing or misconfigured, it tells the CLI which port your app actually runs on. |
| `MissingBlobsEnvironmentError` | Your local machine isn't logged into Netlify or this folder isn't linked to a site. Run `pnpm exec netlify login` then `pnpm exec netlify link`. |
| Same error even after linking | Old CLI/package versions can have this bug. Run `pnpm add -D netlify-cli@latest` and `pnpm add @netlify/blobs@latest`, then fully restart the dev server. |
| A brand you saved isn't showing up somewhere else | Check which environment you saved it in. Brands don't move between dev and prod on their own, only via Promote. |
| Asset Library is empty | Normal on any environment nothing's been promoted to yet. |
| `brands.map is not a function` or a blank/crashed `/admin` page | The backend request failed (check the Network tab for the actual error in the response body) — this isn't a data problem, something's misconfigured or down. |
| A brand added by editing a `.json` file directly and merging to git doesn't appear | That workflow doesn't apply anymore. Create brands through the `/admin` screen, or ask for it to be added as a permanent built-in (see above). |

## Quick reference

- **Local dev command:** `pnpm run dev:netlify`
- **Save Changes** → live in your current environment only
- **Promote to Prod** → copies current brand + its images to whichever site you pick
- **Git** → moves code and the 3 built-in defaults only, never Blobs data
- **PROMOTE_SECRET** → a distinct value per receiving site, set on that site's own Netlify env vars
- **PROMOTE_TARGETS** → dev `.env` only, a JSON list of every site + its secret, never set on any deployed site
