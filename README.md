# arx-demo-shell

Single-app demo shell that hosts all ArxConnect portal UIs under one tab bar with shared state.

## How it works

- **One Vite app** — all portals are React components mounted at different routes
- **One Zustand store** — `client/store/demoStore.ts` is the single source of truth for all portals
- **No Supabase** — state is in-memory (sessionStorage) and shared instantly across tabs since it's one app
- **No Builder.io** — plain React + Vite + TailwindCSS

## Routes

| Tab | Path | Source |
|-----|------|--------|
| HUB / CRM | `/` | `client/portals/crm/` |
| Patient | `/patient` | `client/portals/patient/` |
| Analytics | `/analytics` | `client/portals/analytics/` |
| Field Portal | `/field` | `client/portals/field/` (placeholder) |
| Provider | `/provider` | `client/portals/provider/` (placeholder) |

## Setup (run once)

```bash
cd arx-demo-shell
pnpm install
```

## Run

```bash
pnpm dev
```

Open `http://localhost:8080` — click tabs to switch portals. All portals reflect the same state.

## Adding a new portal repo

When `arx-prototype-field` or `arx-prototype-provider` is ready:

1. Copy its `client/` directory into `client/portals/<name>/`
2. Overwrite its `hooks/useDemoState.ts` with:
   ```ts
   export * from '@/hooks/useDemoState';
   ```
3. Create `client/portals/<name>/index.tsx` wrapping its routes in a `<MemoryRouter>`
4. The portal will automatically share state with all other portals

## State bridge

Every portal's `useDemoState.ts` is replaced with `client/hooks/useDemoState.ts`.
This hook returns the **same interface** as the Supabase version but reads from Zustand:

```ts
const { state, events, loading, actions } = useDemoState('Analytics')

// state.workflow_step  — same snake_case field names as Supabase version
// state.pa_status
// actions.approvePA()
// etc.
```

## Advancing demo state

Use the HUB / CRM tab — it has the full workflow action panel.
Switch to any other tab to see that portal's view of the same state.

## Resetting

Use the **Reset** button in the header, or the **Flow selector** to switch to a different workflow variant.
