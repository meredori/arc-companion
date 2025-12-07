# ARC Raiders Companion (SvelteKit)

Baseline implementation scaffolding for the ARC Raiders Companion tool described in `full_design_plan.md`.
The project is configured for SvelteKit with TypeScript, TailwindCSS, ESLint, Prettier, and Vitest.

© 2025 Meredori.

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
   Static assets are emitted into the `build/` directory by `@sveltejs/adapter-static`. The site assumes
   root-level hosting, so built pages and images resolve directly from `/` without any base path
   configuration.

## Project Structure

```
├── src/lib/                 # Shared types, persistence utilities, and stores
├── src/routes/              # Route placeholders that mirror the design document
├── static/data/             # Raw and normalized data artifacts committed with the app
└── static/                  # Static assets served directly (e.g. favicon)
```

Key routes (`src/routes/`) now include:

- `/what-to-do` — tokenized item recommendations that factor in quests, workbenches, and expedition projects.
- `/what-i-have` — the inventory control center for quest completion, workbench upgrades, and expedition project contributions.
- `/track` — streamlined quest + upgrade checklist (legacy view).
- `/run` / `/runs` — live run logger + historical dashboard.


Each section is wired to the shared stores so toggling a quest, bench, or project immediately influences the What To Do page.

> **Prerendering note:** Hash links in prerendered pages must point to elements that actually exist (e.g. `/what-to-do` links to section IDs on `/what-i-have`). When you remove or rename a section, update any cross-page anchors at the same time to avoid prerender failures like “no element with id=… exists.”

## Workshop Upgrade Data

Instructions for capturing bench upgrade requirements live in `docs/workbench-upgrades.md`. Use that
guide when copying tables from the ARC Raiders wiki so the **What I Have** page and recommendation
engine stay accurate.

## Continuous Integration

GitHub Actions workflows (`.github/workflows/ci.yml`) execute on pull requests and pushes to `main`:
- Install dependencies (`npm install`)
- Run `npm run lint`, `npm run check`, and `npm test`
- Build the static site (`npm run build`)

## Data ingestion & assets

### Base data

Raw data exports now live under per-entity folders in `static/`, with one JSON file per record to
match the upstream dumps:

- `static/items/`
- `static/quests/`
- `static/hideout/`
- `static/projects/` (falls back to `static/projects.json` until the folder arrives)

Legacy combined exports under `static/data/raw/*.json` are still supported for compatibility. At
runtime, `src/lib/server/pipeline.ts` normalizes the raw feeds (slugging IDs, mapping recipes to
`craftsFrom`, resolving local image paths, deriving quest chains, etc.). SvelteKit loads call the
pipeline helper so the UI always works directly off the raw dumps. Commit updates to the raw files
whenever a new export arrives.

### Workbench upgrade capture

When new bench levels appear on the wiki, paste their requirement tables into
`docs/workbench-upgrades.md`. That guide explains the JSON structure expected by the raw feed so the
normalization pipeline can ingest the updates automatically.

### Expedition projects

`static/projects/` (or the legacy `static/projects.json`) describes expedition projects and their
phases. The **What I Have** page
lets you record partial contributions; state is persisted in `localStorage` via the project progress
store. Once a phase reaches 100 %, the What To Do recommendations stop flagging its items as “keep.”

### Images

Drop loot art into `static/images/items/` using snake_case filenames (e.g. `advanced_arc_powercell.png`).
The normalization pipeline automatically rewrites `imageUrl` fields to `/images/items/<file>` when possible.

## Data attribution

This project ships with game data sourced from the [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data)
repository (also used by [arctracker.io](https://arctracker.io)). If you reuse these JSON exports elsewhere, please
attribute the data by linking back to the upstream repository and consider including a link to arctracker.io as well.

## TailwindCSS usage

Global Tailwind layers are imported through `src/app.postcss` and activated in the root layout. When
adding new components, reference the Tailwind configuration in `tailwind.config.cjs`.

