# Workbench Upgrade Data Guide

This document explains how to capture workbench upgrade information from the ARC Raiders wiki and keep
the companion data in sync. The goal is to list every bench, each of its upgrade levels, and the
required components so the **What I Have** page (and the recommendation engine) can accurately decide
when to keep or free up loot.

## Source Of Truth

- Use the official wiki pages such as <https://arcraiders.wiki/wiki/Workshop>.
- Each workbench typically has three upgrade levels. Record the level number, the exact requirement
  list, and any crafts/unlocks the level grants (if relevant).
- Add the data to `static/data/raw/hideout-modules.json`. Each module entry mirrors the upstream
  export and lists its levels plus item requirements:

```jsonc
{
  "id": "gunsmith",
  "name": { "en": "Gunsmith" },
  "maxLevel": 3,
  "levels": [
    { "level": 1, "requirementItemIds": [] },
    {
      "level": 2,
      "requirementItemIds": [
        { "itemId": "rusted_tools", "quantity": 3 },
        { "itemId": "mechanical_components", "quantity": 5 },
        { "itemId": "wasp_driver", "quantity": 8 }
      ]
    }
  ]
}
```

Keep the raw `itemId` strings intact (`rusted_tools`, `mechanical_components`, etc.); the runtime
pipeline handles slugging (`item-rusted-tools`) and joins item names from the raw item feed.

## Example: Gunsmith

| Level | Requirements                                                                 | Crafts |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 1     | 20× Metal Parts, 30× Rubber Parts                                            | –      |
| 2     | 3× Rusted Tools, 5× Mechanical Components, 8× Wasp Driver                    | –      |
| 3     | 3× Rusted Gear, 5× Advanced Mechanical Components, 4× Sentinel Firing Core   | –      |

Translate the table directly into the module entry. Once saved, refresh the app and open the **What I
Have → Workbench upgrades** section to mark each level as owned.

## Workflow

1. Copy the requirement table from the wiki.
2. Convert each row into one `UpgradePack` entry (bench name, level number, items).
3. Run the dev server or reload the site so the new data is hydrated.
4. Visit **What I Have** and toggle the completed levels/benches. Finished levels immediately stop
   flagging their materials as “keep” on the What To Do page.

If you need to share updates with the team, commit the modified `static/data/raw/hideout-modules.json`
file or paste the relevant tables into this chat so Codex can convert them for you.
The SvelteKit loaders now normalize hideout modules through `src/lib/server/pipeline.ts`, so there is
no separate merge step—updating the raw file is enough.
