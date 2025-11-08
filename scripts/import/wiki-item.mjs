#!/usr/bin/env node
import {
  isoNow,
  logBatchResult,
  parseArgs,
  readStage,
  updatePassMeta,
  writeBatches
} from './_shared.mjs';

const args = parseArgs({ 'batch-size': 2, dry: false, approve: false });
const batchSize = Number(args['batch-size']) || 2;
const dryRun = Boolean(args.dry || args['dry-run']);
const approve = Boolean(args.approve);

const DETAILS = new Map([
  [
    'item-recovered-arc-battery',
    {
      sources: [
        { type: 'quest', ref: 'quest-signal-recovery', note: 'Quest reward' },
        { type: 'enemy', ref: 'arc-sentinel', note: 'High-tier patrols' }
      ],
      vendors: [
        { vendorId: 'vendor-laila', name: 'Laila (Dam Outpost)', price: 980 }
      ],
      craftsFrom: [
        { itemId: 'mat-conductor-wire', name: 'Conductor Wire', qty: 6 },
        { itemId: 'mat-spare-cells', name: 'Spare Cells', qty: 3 }
      ],
      craftsInto: [
        { productId: 'upgrade-uplink-relay', productName: 'Uplink Relay', qty: 1 }
      ],
      zones: ['dam', 'spaceport'],
      wikiSections: ['Sources', 'Crafting', 'Vendors']
    }
  ],
  [
    'item-advanced-arc-powercell',
    {
      sources: [
        { type: 'enemy', ref: 'arc-enforcer', note: 'Boss encounter drop' },
        { type: 'area', ref: 'blue-gate', note: 'Rare chest reward' }
      ],
      vendors: [
        { vendorId: 'vendor-dax', name: 'Dax (Metaforge Liaison)', price: 1320 }
      ],
      craftsFrom: [
        { itemId: 'mat-energy-coil', name: 'Energy Coil', qty: 2 },
        { itemId: 'mat-arc-sparks', name: 'ARC Sparks', qty: 6 }
      ],
      craftsInto: [
        { productId: 'upgrade-power-matrix', productName: 'Power Matrix', qty: 1 }
      ],
      zones: ['spaceport', 'industrial'],
      wikiSections: ['Sources', 'Crafting', 'Vendors']
    }
  ],
  [
    'item-frayed-wiring-bundle',
    {
      sources: [
        { type: 'scavenge', ref: 'residential-caches', note: 'Common salvage crates' },
        { type: 'vendor', ref: 'vendor-laila', note: 'Rotating daily stock' }
      ],
      vendors: [
        { vendorId: 'vendor-laila', name: 'Laila (Dam Outpost)', price: 140 }
      ],
      craftsFrom: [],
      craftsInto: [
        { productId: 'upgrade-workbench-kit', productName: 'Workbench Kit', qty: 1 }
      ],
      zones: ['residential']
    }
  ],
  [
    'item-rusted-tools',
    {
      sources: [
        { type: 'scavenge', ref: 'spaceport', note: 'Containers near docking area' },
        { type: 'quest', ref: 'quest-rust-and-shine', note: 'Turn-in requirement' }
      ],
      vendors: [],
      craftsFrom: [],
      craftsInto: [
        { productId: 'upgrade-field-maintenance', productName: 'Field Maintenance Kit', qty: 1 }
      ],
      zones: ['spaceport', 'dam']
    }
  ]
]);

const enrichedAt = isoNow();

const passARecords = await readStage('pass-a');

if (passARecords.length === 0) {
  console.warn('Pass B aborted — no Pass A stage files found.');
  process.exit(1);
}

const enriched = passARecords.map((record) => {
  const detail = DETAILS.get(record.id) ?? {
    sources: [],
    vendors: [],
    craftsFrom: [],
    craftsInto: [],
    zones: []
  };
  return {
    ...record,
    sources: detail.sources,
    vendors: detail.vendors,
    craftsFrom: detail.craftsFrom,
    craftsInto: detail.craftsInto,
    zones: detail.zones,
    stageHistory: [
      ...(record.stageHistory ?? []),
      { pass: 'B', indexedAt: enrichedAt, source: 'wiki-item', sections: detail.wikiSections ?? [] }
    ]
  };
});

const batches = await writeBatches('pass-b', enriched, { batchSize, dryRun });
logBatchResult('Pass B', batches);

await updatePassMeta('B', {
  batches: batches.length,
  records: enriched.length,
  lastRunAt: enrichedAt,
  approved: approve && !dryRun,
  notes: dryRun ? 'Dry run — no stage files written' : null
});

if (approve && dryRun) {
  console.warn('Approval ignored because this was a dry run. Re-run without --dry to approve.');
} else if (approve) {
  console.log('Pass B marked as approved.');
}
