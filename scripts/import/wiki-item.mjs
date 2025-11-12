#!/usr/bin/env node
import {
  isoNow,
  logBatchResult,
  parseArgs,
  readStage,
  toSlug,
  updatePassMeta,
  writeBatches
} from './_shared.mjs';
import { loadLootRecords } from './data/load-loot-data.mjs';
import { fetchItemImage } from './data/wiki-item-images.mjs';

const args = parseArgs({ 'batch-size': 50, dry: false, approve: false });
const batchSize = Number(args['batch-size']) || 50;
const dryRun = Boolean(args.dry || args['dry-run']);
const approve = Boolean(args.approve);

const lootRows = await loadLootRecords({ source: 'cache' });
const DETAILS = new Map(
  lootRows.map((row) => {
    const slug = row.slug ?? toSlug(row.name);
    const id = row.id ?? `item-${slug}`;
    const detail = row.details ?? {};
    return [
      id,
      {
        sources: detail.sources ?? [],
        vendors: detail.vendors ?? [],
        craftsFrom: detail.craftsFrom ?? [],
        craftsInto: detail.craftsInto ?? [],
        zones: detail.zones ?? [],
        wikiSections: detail.wikiSections ?? [],
        imageUrl: detail.imageUrl ?? row.imageUrl ?? null
      }
    ];
  })
);

const enrichedAt = isoNow();

const passARecords = await readStage('pass-a');

if (passARecords.length === 0) {
  console.warn('Pass B aborted — no Pass A stage files found.');
  process.exit(1);
}

const enriched = [];

for (const record of passARecords) {
  const detail = DETAILS.get(record.id) ?? {
    sources: [],
    vendors: [],
    craftsFrom: [],
    craftsInto: [],
    zones: [],
    imageUrl: null,
    wikiSections: []
  };

  let imageUrl = detail.imageUrl ?? record.imageUrl ?? null;
  if (!imageUrl) {
    imageUrl = await fetchItemImage({
      slug: record.slug ?? toSlug(record.name),
      wikiUrl: record.wikiUrl ?? `https://arcraiders.wiki/wiki/${record.slug ?? toSlug(record.name)}`
    });
  }

  enriched.push({
    ...record,
    imageUrl,
    sources: detail.sources,
    vendors: detail.vendors,
    craftsFrom: detail.craftsFrom,
    craftsInto: detail.craftsInto,
    zones: detail.zones,
    stageHistory: [
      ...(record.stageHistory ?? []),
      { pass: 'B', indexedAt: enrichedAt, source: 'wiki-item', sections: detail.wikiSections ?? [] }
    ]
  });
}

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
