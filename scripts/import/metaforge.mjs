#!/usr/bin/env node
import {
  conflictNote,
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

const METAFORGE_ITEMS = new Map([
  [
    'item-recovered-arc-battery',
    {
      id: 'mf-1138',
      sell: 700,
      zones: ['dam', 'spaceport'],
      provenance: { wiki: true, api: true },
      notes: 'MetaForge canonical entry reconciled with wiki values.'
    }
  ],
  [
    'item-advanced-arc-powercell',
    {
      id: 'mf-1422',
      sell: 840,
      zones: ['spaceport', 'industrial'],
      provenance: { wiki: true, api: true }
    }
  ],
  [
    'item-frayed-wiring-bundle',
    {
      id: 'mf-0870',
      sell: 65,
      zones: ['residential', 'industrial'],
      provenance: { wiki: true, api: true }
    }
  ],
  [
    'item-rusted-tools',
    {
      id: 'mf-0904',
      sell: 115,
      zones: ['spaceport', 'dam'],
      provenance: { wiki: true, api: true }
    }
  ]
]);

const mergedAt = isoNow();

const passBRecords = await readStage('pass-b');

if (passBRecords.length === 0) {
  console.warn('Pass C aborted — no Pass B stage files found.');
  process.exit(1);
}

const merged = passBRecords.map((record) => {
  const api = METAFORGE_ITEMS.get(record.id);
  const conflicts = [];
  if (api) {
    const sellConflict = conflictNote('sell', record.sell, api.sell);
    if (sellConflict) {
      conflicts.push({ ...sellConflict, resolvedAt: mergedAt, strategy: 'prefer-api' });
    }
  }

  return {
    ...record,
    sell: api?.sell ?? record.sell,
    zones: api?.zones ?? record.zones,
    metaforgeId: api?.id ?? null,
    provenance: api?.provenance ?? { wiki: true, api: false },
    conflicts,
    stageHistory: [
      ...(record.stageHistory ?? []),
      { pass: 'C', indexedAt: mergedAt, source: 'metaforge', apiId: api?.id ?? null }
    ]
  };
});

const batches = await writeBatches('pass-c', merged, { batchSize, dryRun });
logBatchResult('Pass C', batches);

await updatePassMeta('C', {
  batches: batches.length,
  records: merged.length,
  lastRunAt: mergedAt,
  approved: approve && !dryRun,
  notes: dryRun ? 'Dry run — no stage files written' : null
});

if (approve && dryRun) {
  console.warn('Approval ignored because this was a dry run. Re-run without --dry to approve.');
} else if (approve) {
  console.log('Pass C marked as approved.');
}
