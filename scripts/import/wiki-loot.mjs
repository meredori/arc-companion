#!/usr/bin/env node
import {
  isoNow,
  logBatchResult,
  parseArgs,
  toSlug,
  updatePassMeta,
  writeBatches
} from './_shared.mjs';
import { loadLootRecords } from './data/load-loot-data.mjs';

const args = parseArgs({
  'batch-size': 50,
  dry: false,
  approve: false,
  refresh: false,
  source: 'auto'
});
const batchSize = Number(args['batch-size']) || 50;
const dryRun = Boolean(args.dry || args['dry-run']);
const approve = Boolean(args.approve);
const refresh = Boolean(args.refresh);
const cacheOnly = Boolean(args.cache || args['cache-only']);
const sourceArg = typeof args.source === 'string' ? args.source : undefined;
const source = refresh ? 'remote' : cacheOnly ? 'cache' : sourceArg ?? 'auto';

const lootRows = await loadLootRecords({ refresh, source });

const seededAt = isoNow();

if (!Array.isArray(lootRows) || lootRows.length === 0) {
  console.error('Pass A aborted — loot dataset returned no rows.');
  process.exit(1);
}

const seeds = lootRows.map((row, index) => {
  const slug = row.slug ?? toSlug(row.name);
  const wikiSlug = row.wikiSlug ?? row.name.replace(/\s+/g, '_');
  const wikiUrl = row.wikiUrl ?? `https://arcraiders.wiki/wiki/${wikiSlug}`;
  return {
    id: row.id ?? `item-${slug}`,
    name: row.name,
    slug,
    rarity: row.rarity,
    category: row.category,
    sell: row.sell,
    recycle: row.recycle ?? [],
    needs: row.keep ?? { quests: 0, workshop: 0 },
    wikiUrl,
    notes: row.notes ?? null,
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
