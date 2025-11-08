# Workbench Upgrade Data Guide

This document explains how to capture workbench upgrade information from the ARC Raiders wiki and keep
the companion data in sync. The goal is to list every bench, each of its upgrade levels, and the
required components so the **What I Have** page (and the recommendation engine) can accurately decide
when to keep or free up loot.

## Source Of Truth

- Use the official wiki pages such as <https://arcraiders.wiki/wiki/Workshop>.
- Each workbench typically has three upgrade levels. Record the level number, the exact requirement
  list, and any crafts/unlocks the level grants (if relevant).
- Add the data to `static/data/upgrades.json`. Every entry follows the existing `UpgradePack`
  structure:

```jsonc
{
  "id": "upgrade-gunsmith-level-1",
  "name": "Gunsmith · Level 1",
  "bench": "Gunsmith",
  "level": 1,
  "items": [
    { "itemId": "item-metal-parts", "qty": 20 },
    { "itemId": "item-rubber-parts", "qty": 30 }
  ]
}
```

Keep IDs predictable (`upgrade-{bench}-{level}`) so they remain stable between runs.

## Example: Gunsmith

| Level | Requirements                                                                 | Crafts |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 1     | 20× Metal Parts, 30× Rubber Parts                                            | –      |
| 2     | 3× Rusted Tools, 5× Mechanical Components, 8× Wasp Driver                    | –      |
| 3     | 3× Rusted Gear, 5× Advanced Mechanical Components, 4× Sentinel Firing Core   | –      |

Translate the table directly into `upgrades.json` entries. Once saved, refresh the app and open the
**What I Have → Workbench upgrades** section to mark each level as owned.

## Workflow

1. Copy the requirement table from the wiki.
2. Convert each row into one `UpgradePack` entry (bench name, level number, items).
3. Run the dev server or reload the site so the new data is hydrated.
4. Visit **What I Have** and toggle the completed levels/benches. Finished levels immediately stop
   flagging their materials as “keep” on the What To Do page.

If you need to share updates with the team, commit the modified `static/data/upgrades.json` file or
paste the relevant tables into this chat so Codex can convert them for you.

## Using the merge script

When new bench data lands in the shared `temp/` folder (for example when we pull a raw dump from
RaidTheory) you can let the merge helper generate the `upgrades.json` records automatically:

```bash
node scripts/data/merge-temp-data.mjs
```

The script reads:

- `temp/hideoutModules.json` for bench levels and requirements.
- `static/images/items/` to rewrite image paths (used elsewhere in the UI).

It rewrites `static/data/upgrades.json` with the normalized entries (`upgrade-{bench}-level-{n}`) and
preserves any bespoke upgrades that are not part of the temp feed. You can still hand-edit
`static/data/upgrades.json` when a bench appears on the wiki but hasn’t landed in the temp export yet;
just remember to re-run the merge script afterwards so nothing regresses.
