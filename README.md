# ARC Raiders Companion (SvelteKit)

Baseline implementation scaffolding for the ARC Raiders Companion tool described in `full_design_plan.md`.
The project is configured for SvelteKit with TypeScript, TailwindCSS, ESLint, Prettier, and Vitest.

## Getting Started

> **Prerequisite:** Node.js 18.17+, 20.6+, or 22+ (see `.npmrc`).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:5173 by default.
3. Run quality checks:
   ```bash
   npm run lint
   npm run check
   npm test
   ```
4. Build the static site output:
   ```bash
   npm run build
   ```
   Static assets are emitted into the `build/` directory by `@sveltejs/adapter-static`.

### Environment Configuration

- `BASE_PATH` &mdash; Optional environment variable consumed by `svelte.config.js` to support GitHub
  Pages style deployments (e.g. `BASE_PATH=/project-name`). Local development ignores this value.

## Project Structure

```
├── scripts/import/          # Import pipeline placeholders for passes A–F
├── src/lib/                 # Shared types, persistence utilities, and stores
├── src/routes/              # Route placeholders that mirror the design document
├── static/data/             # Canonical data artifacts emitted by importers (placeholders for now)
└── static/                  # Static assets served directly (e.g. favicon)
```

Key routes (`src/routes/`) now include:

- `/what-to-do` — tokenized item recommendations that factor in quests, workbenches, and expedition projects.
- `/what-i-have` — the inventory control center for quest completion, workbench upgrades, blueprint ownership, and expedition project contributions.
- `/track` — streamlined quest + upgrade checklist (legacy view).
- `/blueprints` — focused blueprint ownership manager.
- `/run` / `/runs` — live run logger + historical dashboard.
- `/admin/passes` — import pipeline controls (rerun/approve/stage inspection).

Each section is wired to the shared stores so toggling a quest, bench, or project immediately influences the What To Do page.

## Workshop Upgrade Data

Instructions for capturing bench upgrade requirements live in `docs/workbench-upgrades.md`. Use that
guide when copying tables from the ARC Raiders wiki so the **What I Have** page and recommendation
engine stay accurate.

## Continuous Integration

GitHub Actions workflows (`.github/workflows/ci.yml`) execute on pull requests and pushes to `main`:
- Install dependencies (`npm install`)
- Run `npm run lint`, `npm run check`, and `npm test`
- Build the static site (`npm run build`)
- Upload the `build/` directory as a GitHub Pages artifact for preview deployments

Artifacts generated on pull requests can be previewed using GitHub Pages environments. Pushes to
`main` publish an artifact suitable for production deployment.

## Data ingestion & assets

### Base data

Raw multilingual exports from RaidTheory now live under `static/data/raw/` so the app can hydrate
directly from the source dumps:

- `static/data/raw/items.json`
- `static/data/raw/quests.json`
- `static/data/raw/hideoutModules.json`
- `static/data/raw/projects.json`

The server-side loaders call `loadCanonicalData` from `src/lib/server/pipeline.ts` to normalize
those feeds at request time (slugging IDs, wiring up recipes, enriching rewards, etc.). The
canonical artifacts under `static/data/` remain as fallbacks for fields that are still curated by
hand (vendors, quest objectives, bespoke upgrades). Refresh the raw files when new dumps land—no
separate merge script is required.

### Workbench upgrade capture

When new bench levels appear on the wiki, paste their requirement tables into
`docs/workbench-upgrades.md`. That guide explains the JSON structure expected by
`static/data/workbench-upgrades.json`, which now serves as the manual fallback merged with the raw
`static/data/raw/hideoutModules.json` feed at runtime.

### Expedition projects

`static/data/projects.json` describes expedition projects and their phases. The **What I Have** page
lets you record partial contributions; state is persisted in `localStorage` via the project progress
store. Once a phase reaches 100 %, the What To Do recommendations stop flagging its items as “keep.”

### Images

Drop loot art into `static/images/items/` using snake_case filenames (e.g. `advanced_arc_powercell.png`).
The runtime pipeline automatically rewrites `imageUrl` fields to `/images/items/<file>` when
possible.

> **Heads up:** When rendering those assets in Svelte components, resolve the stored path through
> `$app/paths`’ `base` helper (e.g. ```${base}${url}```) so prerendering in CI finds the images when the
> site is deployed under a subdirectory (GitHub Pages).

## TailwindCSS usage

Global Tailwind layers are imported through `src/app.postcss` and activated in the root layout. When
adding new components, reference the Tailwind configuration in `tailwind.config.cjs`.

## Import pipeline stubs

`scripts/import/` still mirrors the planned staged importer (Pass A–F). Replace the console output in
`scripts/import/*.mjs` with the real fetch/transform/approve logic as backend work progresses.
