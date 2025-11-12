#!/usr/bin/env node
import {
  isoNow,
  logBatchResult,
  parseArgs,
  updatePassMeta,
  writeBatches
} from './_shared.mjs';

const args = parseArgs({ 'batch-size': 3, dry: false, approve: false });
const batchSize = Number(args['batch-size']) || 3;
const dryRun = Boolean(args.dry || args['dry-run']);
const approve = Boolean(args.approve);

const importedAt = isoNow();

const quests = [];

const chains = [];

const upgrades = [
  {
    id: 'upgrade-uplink-relay',
    name: 'Uplink Relay',
    bench: 'Workshop',
    level: 2,
    items: [
      { itemId: 'item-recovered-arc-battery', qty: 1 },
      { itemId: 'item-frayed-wiring-bundle', qty: 3 }
    ]
  },
  {
    id: 'upgrade-power-matrix',
    name: 'Power Matrix',
    bench: 'MetaForge',
    level: 3,
    items: [
      { itemId: 'item-advanced-arc-powercell', qty: 1 },
      { itemId: 'item-frayed-wiring-bundle', qty: 2 }
    ]
  },
  {
    id: 'upgrade-field-maintenance',
    name: 'Field Maintenance Kit',
    bench: 'Workshop',
    level: 1,
    items: [{ itemId: 'item-rusted-tools', qty: 2 }]
  }
];

const vendors = [
  {
    id: 'vendor-laila',
    name: 'Laila',
    location: 'Dam Outpost',
    stock: [
      { itemId: 'item-frayed-wiring-bundle', name: 'Frayed Wiring Bundle', price: 140 },
      { itemId: 'item-recovered-arc-battery', name: 'Recovered ARC Battery', price: 980 }
    ]
  },
  {
    id: 'vendor-dax',
    name: 'Dax',
    location: 'MetaForge Hub',
    stock: [
      { itemId: 'item-advanced-arc-powercell', name: 'Advanced ARC Powercell', price: 1320 }
    ]
  }
];

const stagedRecords = [
  ...quests.map((quest) => ({ type: 'quest', data: quest })),
  ...chains.map((chain) => ({ type: 'chain', data: chain })),
  ...upgrades.map((upgrade) => ({ type: 'upgrade', data: upgrade })),
  ...vendors.map((vendor) => ({ type: 'vendor', data: vendor }))
].map((record, index) => ({
  ...record,
  stageHistory: [
    { pass: 'D', indexedAt: importedAt, source: 'metaforge+wiki', order: index + 1 }
  ]
}));

const batches = await writeBatches('pass-d', stagedRecords, { batchSize, dryRun });
logBatchResult('Pass D', batches);

await updatePassMeta('D', {
  batches: batches.length,
  records: stagedRecords.length,
  lastRunAt: importedAt,
  approved: approve && !dryRun,
  notes: dryRun ? 'Dry run — no stage files written' : null
});

if (approve && dryRun) {
  console.warn('Approval ignored because this was a dry run. Re-run without --dry to approve.');
} else if (approve) {
  console.log('Pass D marked as approved.');
}
