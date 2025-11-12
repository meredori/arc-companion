# ARC Raiders Companion Project Design Document

## Overview
This document defines the complete technical design, data architecture, and feature scope for the **ARC Raiders Companion Tool**, a personal web app that helps players optimize gameplay, manage loot, and analyze run performance.

It is intended for **AI code-generation (Codex)** or human engineers to implement directly. It includes the deterministic data logic, import pipeline, UI structure, and system behavior required for an offline-first single-page app (SPA) using a single tech stack (SvelteKit, Next.js, or Nuxt).

---

## 1. Goals and Core Features

### Primary Objectives
- Provide deterministic recommendations for each loot item: **save**, **keep**, **salvage**, or **sell**.
- Use authoritative data from **MetaForge API** and the **ARC Raiders Wiki**.
- Persist user state locally (offline-friendly, no login) with tolerance for "lite offline" sessions that defer heavy sync/admin operations until connectivity returns.
- Offer dynamic, personalized **run tracking and analytics**.
- Allow users to track quests, blueprints, and goals to feed into item recommendations.

### Core Features
1. **Item Recommendation Lookup** — Shows what to do with each item and why (quests, workbenches, expedition projects, manual overrides).
2. **What I Have Dashboard** — Centralized controls for quests, workbench levels, blueprint ownership, and expedition project hand-ins (with hide-completed filters).
3. **Quest & Upgrade Tracker** — Legacy “Track” view for quick checklist-style progress.
4. **Blueprint Management** — Track which blueprints you own.
5. **Goal / Project Tracker** — Track workbench upgrades and expedition contributions; partial hand-ins are persisted locally.
6. **Run Analyzer** — Record XP, loot value, deaths, and receive dynamic tips during play.
7. **Run History Dashboard** — Summaries and KPIs: XP/hour, value/hour, success rate, etc.
8. **Offline Persistence** — Local storage for user data and settings.

---

## 2. Technology Stack
- **Framework:** SvelteKit (preferred) or Next.js/Nuxt.
- **Language:** TypeScript.
- **Styling:** TailwindCSS.
- **Persistence:** Browser localStorage.
- **Data Sources:**
  - [MetaForge API](https://metaforge.app/arc-raiders/api)
  - [ARC Raiders Wiki](https://arcraiders.wiki/wiki/Loot)
  - Linked item pages (e.g., https://arcraiders.wiki/wiki/Advanced_ARC_Powercell)

---

## 3. Data Pipeline

### 3.1 Source Integration
| Source | Role | Example |
|--------|------|----------|
| **Wiki Loot Page** | Seed items (name, sell, recycle, quest/workshop use) | `https://arcraiders.wiki/wiki/Loot` |
| **Wiki Item Pages** | Enrichment: sources, vendors, salvage, crafting | `https://arcraiders.wiki/wiki/Advanced_ARC_Powercell` |
| **MetaForge API** | Canonical structured data: items, quests, vendors, maps | `https://metaforge.app/arc-raiders/api/items` |


### 3.2 Pipeline Stages

**Pass A — Seed from Loot Table**
- Parse all rows from the Loot wiki page using a manual batching script that respects rate limits (configurable batch size with retry).
- Extract columns: Name, Category, Rarity, Sell Price, Recycles To, Keep for Quests/Workshop, and stage each batch to a temporary `staging/pass-a/` directory for preview in the protected admin tooling.
- Add `wikiItemUrl` for enrichment and surface deltas for admin approval before promotion to Pass B.

**Pass B — Wiki Item Enrichment**
- For each item, crawl its wiki page using the approved Pass A staging list (manual approval gate in admin dashboard).
- Parse structured sections:
  - **Sources** (enemy, zone, vendor)
  - **Crafting** (input/output)
  - **Recycle/Salvage** (outputs, yields, base vs in-raid)
  - **Vendors** (names, locations)
  - **Sell Price** (verify)
- Output structured item enrichment JSON batches, log fetch anomalies, and allow admins to review/override parsed values before merging.

**Pass C — MetaForge Merge**
- Fetch MetaForge data for items, quests, vendors using the admin-configured API keys.
- Merge and normalize fields with wiki data with a preview diff shown in the admin tooling to resolve mismatches.
- Prefer MetaForge IDs; keep provenance flags and record manual overrides during approval.

**Pass D — Quest & Quest Chain Importer**
- Use MetaForge and wiki quest data with manual batching controls identical to Pass A to prevent API exhaustion.
- Build `quests.json` and `chains.json` with ordered questline structure and present draft quest trees for admin validation.
- Extract required items per quest and flag missing items for admin decision in the protected tooling.
- Include upgrades/workbench packs with an approval checklist before they enter the canonical dataset.

**Pass E — Conflict Resolution & Versioning**
- Resolve field conflicts (e.g., sell price, salvage outputs) via the admin conflict-resolution UI that stores accepted resolutions.
- Add metadata: `{ generatedAt, sourceURLs, conflicts[] }` and record the approving admin plus timestamps for audit history.

**Pass F — Output Files**
- Generate final JSON artifacts only after admin approval, keeping rejected drafts stored under `data/_pending/` for re-review.
```
data/items.json
 data/quests.json
 data/workbench-upgrades.json
 data/vendors.json
 data/chains.json
 data/meta/index.json
```

### 3.3 Runtime normalization (current workflow)

Until the staged passes are fully automated against live endpoints, we maintain a
`static/data/raw/` directory containing the latest dumps from RaidTheory (`items.json`, `quests.json`,
`hideoutModules.json`, `projects.json`). The SvelteKit loaders normalize those feeds at request time
via `loadCanonicalData`, rewriting image URLs to `/static/images/items` and merging in the curated
records under `static/data/` (vendors, bespoke upgrades, quest objectives). This keeps the bridge
workflow aligned with the planned pipeline stages so the automated import queue can eventually slot
in without changing the downstream JSON shape.

---

## 4. Data Schemas

### Item Schema
```ts
interface Item {
  id: string;
  name: string;
  slug: string;
  rarity?: string;
  category?: string;
  sell: number;
  recycle: { itemId: string; name: string; qty: number }[];
  sources?: { type: 'enemy'|'scavenge'|'vendor'|'craft'|'quest'|'area'; ref?: string; note?: string }[];
  vendors?: { vendorId: string; name: string; price?: number }[];
  craftsInto?: { productId: string; productName: string; qty?: number }[];
  craftsFrom?: { itemId: string; name: string; qty: number }[];
  needsTotals?: { quests: number; workshop: number };
  wikiUrl?: string;
  metaforgeId?: string;
  zones?: ('dam'|'spaceport'|'buried-city'|'blue-gate'|'residential'|'industrial')[];
  notes?: string;
  provenance: { wiki: boolean; api: boolean };
}
```

`needsTotals` is computed client-side based on the user's quest and workshop progress; when the backend data omits the field, the UI falls back to recomputing totals from the canonical quest/upgrade datasets and documents the calculation path for transparency in the admin tooling.

### Quest Schema
```ts
interface Quest {
  id: string;
  name: string;
  chainId?: string;
  giver?: string;
  items: { itemId: string; qty: number }[];
  rewards?: { itemId?: string; name?: string; qty?: number; coins?: number }[];
  mapHints?: string[];
}
```

### Upgrade Schema
```ts
interface UpgradePack {
  id: string;
  name: string;
  bench: string;
  level: number;
  items: { itemId: string; qty: number }[];
}
```

### Vendor Schema
```ts
interface Vendor {
  id: string;
  name: string;
  location?: string;
  stock?: { itemId: string; name: string; price: number }[];
}
```

### Quest Chain Schema
```ts
interface QuestChain {
  id: string;
  name: string;
  stages: string[]; // quest IDs
}
```

---

## 5. Deterministic Recommendation Logic

### 5.1 Computations
```ts
function remainSaveQty(itemId): number;
function usedInCraft(itemId): boolean;
function salvageSellValue(item): number;
```

### 5.2 Recommendation
```ts
function recommend(item, context) {
  if (remainSaveQty(item.id) > 0)
    return { action: 'save', reason: 'Required for quest/upgrade.' };
  if (usedInCraft(item.id))
    return { action: 'keep', reason: 'Used in available craft recipe.' };
  const sv = salvageSellValue(item);
  if (sv > item.sell)
    return { action: 'salvage', reason: 'Recycling yields higher total value.' };
  return { action: 'sell', reason: 'No other use; sell for best value.' };
}
```

### 5.3 Context Inputs
- Quest and upgrade completion status.
- Blueprint ownership.
- Ignored recipes.
- Updated sell/recycle values.

---

## 6. Run Analyzer

_(section unchanged for brevity)_

---

## 7. Inventory & Project Coordination

The **What I Have** page serves as the authoritative source for player-specific state. It exposes:

1. **Quest progression**
   - Sorted by chain order with gating (a quest only appears once every prior stage in its chain is
     marked complete).
   - “Hide completed” toggle reduces noise once a questline is finished.

2. **Workbench upgrades**
   - Grouped by bench → level with per-level requirements listed.
   - Bench- and level-level toggles mark ownership; hide-completed works here as well.
   - Requirements feed directly into the recommendation context (`needs.workshop`).

3. **Blueprint catalog**
   - Grid view for quick ownership flips across benches/levels without scrolling the full bench
     hierarchy.

4. **Expedition projects**
   - Each project phase lists its item requirements plus the currently delivered quantity.
   - Inputs allow partial hand-ins (e.g., deliver 65 of 80 ARC Alloy today and the rest later).
   - “Mark complete” fills all requirements; “Reset” clears contributions if you misclick.
   - Hide-completed toggle keeps the list focused on unfinished phases.

All of the state above is persisted in the Svelte stores (`quests`, `blueprints`, `projectProgress`,
etc.) so the recommendation engine, Run Analyzer, and Track views see consistent inputs.

### Fields Recorded
| Field | Description |
|--------|--------------|
| XP | XP earned during run |
| Extracted Value | Sell value of extracted loot |
| Died | Boolean; true if run failed |
| Free Loadout | Checkbox flag |
| Duration | Auto-calculated |

### Features
- **Start/End Timer**: Tracks duration.
- **Auto-Tips Panel**:
  - Shows what items to prioritize based on current quest/goal data.
  - Adjusts dynamically for **Free Loadout** (tips for augment trade-ins, safe-pocket absence).
- **Runs History Dashboard**: Aggregates past runs for performance metrics.
- **History Management**: Inline edit/delete controls with undo to maintain accurate analytics and comply with admin retention policies.

### KPIs Calculated
| Metric | Formula |
|---------|----------|
| XP/hr | totalXP / (totalSec / 3600) |
| Value/hr | totalValue / (totalSec / 3600) |
| Success Rate | (#success / totalRuns) |
| Best Extract | max(extractedValue) |

---

## 7. UI/UX Structure

### Navigation
`[ What To Do | Track | Blueprints | Run | Runs ]`

### Page Breakdown
| Page | Description |
|-------|--------------|
| **What To Do** | Item lookup → recommendation card (action, reason, values, usage) |
| **Track** | Goals list with per-item progress and acquisition suggestions |
| **Blueprints** | Toggle ownership, affects crafting logic |
| **Run** | Run Analyzer live interface |
| **Runs** | Metrics + historical runs table with edit/delete history controls |

### Components
- **SearchBar** — global item search.
- **RecommendationCard** — displays computed action.
- **QuestChecklist** — mark quest/upgrades complete.
- **RunTimer** — handles run start/stop.
- **TipsPanel** — context-driven hints during runs.

---

## 8. Persistence and Storage
- **localStorage**: Save user state (`completedQuests`, `runs`, `ownedBlueprints`, etc.).
- **Debounced autosave** every 3 seconds on change.
- **Export/Import JSON**: backup or migrate state.

---

## 9. File Structure Example
The SPA reserves a dedicated admin workspace that is not exposed in the primary navigation; admin routes live under `src/routes/admin/` with their own layout guard and data loaders for the protected tooling referenced in the pipeline passes.
```
scripts/import/
  wiki-loot.mjs
  wiki-item.mjs
  metaforge.mjs
  quests.mjs
  finalize.mjs

static/data/
  items.json
  quests.json
  upgrades.json
  vendors.json
  chains.json
  meta/index.json

src/lib/
  types.ts
  persist.ts
  stores/app.ts
  recommend.ts
  tips.ts

src/routes/
  what-to-do/+page.svelte
  track/+page.svelte
  blueprints/+page.svelte
  run/+page.svelte
  runs/+page.svelte
  admin/
    +layout.svelte
    passes/+page.svelte
```

---

## 10. Acceptance Criteria
1. Data importers produce enriched JSON files with merged wiki + MetaForge data.
2. Items have verified **sell**, **recycle**, **sources**, **vendors**, **crafting uses**.
3. Deterministic recommendation logic yields consistent results for each item.
4. Run Analyzer correctly records, persists, and displays metrics.
5. Tips adapt to current quests, free loadout, and goals.
6. Entire app supports "lite offline" sessions (read and staged writes) while guaranteeing persistence sync once connectivity returns.

---

## 11. Phase 2 Extensions
- **Map Integration**: Use MetaForge map data for source tagging.
- **Shared Runs**: Export summary screenshots or JSON.
- **API Auto-Update Mode**: Periodically refresh item data.
- **Cloud Sync** (optional future feature).

---

## 12. References
- [MetaForge ARC Raiders API](https://metaforge.app/arc-raiders/api)
- [ARC Raiders Wiki – Loot](https://arcraiders.wiki/wiki/Loot)
- [ARC Raiders Wiki – Example Item](https://arcraiders.wiki/wiki/Advanced_ARC_Powercell)
- [PC Gamer Guide: Rusted Tools Location](https://www.pcgamer.com/games/third-person-shooter/arc-raiders-rusted-tools-locations/)

---

**Document Version:** v1.0  
**Author:** ChatGPT (for Codex integration)  
**Last Updated:** 2025-11-07

