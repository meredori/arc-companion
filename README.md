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

Key routes (`src/routes/`) already exist for:
- `/what-to-do`
- `/track`
- `/blueprints`
- `/run`
- `/runs`
- `/admin/passes`

Each page contains descriptive placeholder copy to guide future implementation work.

## Continuous Integration

GitHub Actions workflows (`.github/workflows/ci.yml`) execute on pull requests and pushes to `main`:
- Install dependencies (`npm install`)
- Run `npm run lint`, `npm run check`, and `npm test`
- Build the static site (`npm run build`)
- Upload the `build/` directory as a GitHub Pages artifact for preview deployments

Artifacts generated on pull requests can be previewed using GitHub Pages environments. Pushes to
`main` publish an artifact suitable for production deployment.

## TailwindCSS Usage

Global Tailwind layers are imported through `src/app.postcss` and activated in the root layout. When
adding new components, reference the Tailwind configuration in `tailwind.config.cjs`.

## Import Pipeline Stubs

`scripts/import/` contains executable placeholders for the staged import passes described in the
design document. Replace the console output with real fetch/transform/approve logic when
implementing the data tooling.
