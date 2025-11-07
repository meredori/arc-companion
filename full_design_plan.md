# ARC Raiders Companion Project Design Document

## Overview
This document defines the complete technical design, data architecture, and feature scope for the **ARC Raiders Companion Tool**, a personal web app that helps players optimize gameplay, manage loot, and analyze run performance.

It is intended for **AI code-generation (Codex)** or human engineers to implement directly. It includes the deterministic data logic, import pipeline, UI structure, and system behavior required for an offline-first single-page app (SPA) using a single tech stack (SvelteKit, Next.js, or Nuxt).

---

## 1. Goals and Core Features

### Primary Objectives
- Provide deterministic recommendations for each loot item: **save**, **keep**, **salvage**, or **sell**.
- Use authoritative data from **MetaForge API** and the **ARC Raiders Wiki**.
- Persist user state locally (offline-friendly, no login).
- Offer dynamic, personalized **run tracking and analytics**.
- Allow users to track quests, blueprints, and goals to feed into item recommendations.

### Core Features
1. **Item Recommendation Lookup** — Shows what to do with each item and why.
2. **Quest & Upgrade Tracker** — Mark off completed objectives to update needs.
3. **Blueprint Management** — Track which blueprints you own.
4. **Goal Tracker** — Track progress toward crafting or collecting items.
5. **Run Analyzer** — Record XP, loot value, deaths, and receive dynamic tips during play.
6. **Run History Dashboard** — Summaries and KPIs: XP/hour, value/hour, success rate, etc.
7. **Offline Persistence** — Local storage for user data and settings.

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
- Parse all rows from the Loot wiki page.
- Extract columns: Name, Category, Rarity, Sell Price, Recycles To, Keep for Quests/Workshop.
- Add `wikiItemUrl` for enrichment.

**Pass B — Wiki Item Enrichment**
- For each item, crawl its wiki page.
- Parse structured sections:
  - **Sources** (enemy, zone, vendor)
  - **Crafting** (input/output)
  - **Recycle/Salvage** (outputs, yields, base vs in-raid)
  - **Vendors** (names, locations)
  - **Sell Price** (verify)
- Output structured item enrichment JSON.

**Pass C — MetaForge Merge**
- Fetch MetaForge data for items, quests, vendors.
- Merge and normalize fields with wiki data.
- Prefer MetaForge IDs; keep provenance flags.

**Pass D — Quest & Quest Chain Importer**
- Use MetaForge and wiki quest data.
- Build `quests.json` and `chains.json` with ordered questline structure.
- Extract required items per quest.
- Include upgrades/workbench packs.

**Pass E — Conflict Resolution & Versioning**
- Resolve field conflicts (e.g., sell price, salvage outputs).
- Add metadata: `{ generatedAt, sourceURLs, conflicts[] }`.

**Pass F — Output Files**
```
data/items.json
 data/quests.json
 data/upgrades.json
 data/vendors.json
 data/chains.json
 data/meta/index.json
```

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
| **Runs** | Metrics + historical runs table |

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
```

---

## 10. Acceptance Criteria
1. Data importers produce enriched JSON files with merged wiki + MetaForge data.
2. Items have verified **sell**, **recycle**, **sources**, **vendors**, **crafting uses**.
3. Deterministic recommendation logic yields consistent results for each item.
4. Run Analyzer correctly records, persists, and displays metrics.
5. Tips adapt to current quests, free loadout, and goals.
6. Entire app functions offline after first load.

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

