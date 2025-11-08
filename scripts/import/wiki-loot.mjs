#!/usr/bin/env node
import {
  isoNow,
  logBatchResult,
  parseArgs,
  toSlug,
  updatePassMeta,
  writeBatches
} from './_shared.mjs';

const args = parseArgs({ 'batch-size': 2, dry: false, approve: false });
const batchSize = Number(args['batch-size']) || 2;
const dryRun = Boolean(args.dry || args['dry-run']);
const approve = Boolean(args.approve);

const LOOT_ROWS = [
  {
    name: 'Recovered ARC Battery',
    rarity: 'Rare Component',
    category: 'Power',
    sell: 680,
    recycle: [
      { itemId: 'mat-conductor-wire', name: 'Conductor Wire', qty: 6 },
      { itemId: 'mat-spare-cells', name: 'Spare Cells', qty: 2 }
    ],
    keep: { quests: 2, workshop: 1 },
    wikiSlug: 'Recovered_ARC_Battery',
    notes: 'Used to calibrate uplink towers during seasonal questlines.'
  },
  {
    name: 'Advanced ARC Powercell',
    rarity: 'Epic Component',
    category: 'Power',
    sell: 840,
    recycle: [
      { itemId: 'mat-arc-sparks', name: 'ARC Sparks', qty: 4 },
      { itemId: 'mat-energy-coil', name: 'Energy Coil', qty: 2 }
    ],
    keep: { quests: 3, workshop: 2 },
    wikiSlug: 'Advanced_ARC_Powercell',
    notes: 'Primary ingredient for late-game ARC weapon upgrades.'
  },
  {
    name: 'Frayed Wiring Bundle',
    rarity: 'Common Salvage',
    category: 'Electronics',
    sell: 65,
    recycle: [{ itemId: 'mat-copper-strand', name: 'Copper Strand', qty: 5 }],
    keep: { quests: 1, workshop: 4 },
    wikiSlug: 'Frayed_Wiring_Bundle',
    notes: 'Frequent drop in residential zones; feeds multiple crafting trees.'
  },
  {
    name: 'Rusted Tools',
    rarity: 'Uncommon Salvage',
    category: 'Utilities',
    sell: 110,
    recycle: [
      { itemId: 'mat-metal-scrap', name: 'Metal Scrap', qty: 7 },
      { itemId: 'mat-bolts', name: 'Bolts', qty: 3 }
    ],
    keep: { quests: 2, workshop: 0 },
    wikiSlug: 'Rusted_Tools',
    notes: 'Quest givers in Dam and Spaceport require these for repairs.'
  }
];

const seededAt = isoNow();

const seeds = LOOT_ROWS.map((row, index) => {
  const slug = toSlug(row.name);
  return {
    id: `item-${slug}`,
    name: row.name,
    slug,
    rarity: row.rarity,
    category: row.category,
    sell: row.sell,
    recycle: row.recycle,
    needs: row.keep,
    wikiUrl: `https://arcraiders.wiki/wiki/${row.wikiSlug}`,
    notes: row.notes,
    stageHistory: [
      {
        pass: 'A',
        indexedAt: seededAt,
        rowNumber: index + 1,
        source: 'wiki-loot'
      }
    ]
  };
});

const batches = await writeBatches('pass-a', seeds, { batchSize, dryRun });
logBatchResult('Pass A', batches);

await updatePassMeta('A', {
  batches: batches.length,
  records: seeds.length,
  lastRunAt: seededAt,
  approved: approve && !dryRun,
  notes: dryRun ? 'Dry run — no stage files written' : null
});

if (approve && dryRun) {
  console.warn('Approval ignored because this was a dry run. Re-run without --dry to approve.');
} else if (approve) {
  console.log('Pass A marked as approved.');
}
