#!/usr/bin/env node
import {
  isoNow,
  parseArgs,
  readMeta,
  readStage,
  resolveStaticPath,
  updateFinalMeta,
  updatePassMeta,
  writeJson
} from './_shared.mjs';

const args = parseArgs({ dry: false });
const dryRun = Boolean(args.dry || args['dry-run']);
const finalizedAt = isoNow();

const meta = await readMeta();
const requiredApprovals = ['A', 'B', 'C', 'D'];
const missing = requiredApprovals.filter((key) => !meta.passes[key]?.approved);

if (missing.length > 0) {
  console.error(`Cannot finalize — missing approvals for passes: ${missing.join(', ')}`);
  process.exit(1);
}

const items = await readStage('pass-c');
const auxiliary = await readStage('pass-d');

const quests = [];
const chains = [];
const upgrades = [];
let ignoredVendors = 0;

for (const record of auxiliary) {
  if (record.type === 'quest') {
    quests.push(record.data);
  } else if (record.type === 'chain') {
    chains.push(record.data);
  } else if (record.type === 'upgrade') {
    upgrades.push(record.data);
  } else if (record.type === 'vendor') {
    ignoredVendors += 1;
  }
}

const questNeeds = new Map();
for (const quest of quests) {
  for (const item of quest.items) {
    questNeeds.set(item.itemId, (questNeeds.get(item.itemId) ?? 0) + item.qty);
  }
}

const upgradeNeeds = new Map();
for (const upgrade of upgrades) {
  for (const item of upgrade.items) {
    upgradeNeeds.set(item.itemId, (upgradeNeeds.get(item.itemId) ?? 0) + item.qty);
  }
}

const conflictLog = [];
const finalItems = items.map((item) => {
  if (Array.isArray(item.conflicts)) {
    conflictLog.push(...item.conflicts);
  }
  const clean = { ...item };
  delete clean.stageHistory;
  delete clean.needs;
  delete clean.conflicts;

  clean.needsTotals = {
    quests: questNeeds.get(item.id) ?? 0,
    workshop: upgradeNeeds.get(item.id) ?? 0
  };

  if (!clean.provenance) {
    clean.provenance = { wiki: true, api: false };
  }

  return clean;
});

const summary = {
  items: finalItems.length,
  quests: quests.length,
  upgrades: upgrades.length,
  chains: chains.length
};

if (dryRun) {
  console.log('Finalization dry run complete. Summary:');
  console.table(summary);
  console.log(`Conflicts resolved: ${conflictLog.length}`);
  if (ignoredVendors > 0) {
    console.warn(`Ignored ${ignoredVendors} vendor record(s) during finalization.`);
  }
  process.exit(0);
}

await writeJson(resolveStaticPath('items.json'), finalItems);
await writeJson(resolveStaticPath('quests.json'), quests);
await writeJson(resolveStaticPath('workbench-upgrades.json'), upgrades);
await writeJson(resolveStaticPath('chains.json'), chains);

await updatePassMeta('E', {
  batches: 1,
  records: conflictLog.length,
  lastRunAt: finalizedAt,
  approved: true,
  notes: conflictLog.length ? `${conflictLog.length} conflict(s) resolved with prefer-api strategy` : 'No conflicts detected'
});

await updatePassMeta('F', {
  batches: 1,
  records: finalItems.length + quests.length + upgrades.length + chains.length,
  lastRunAt: finalizedAt,
  approved: true,
  notes: 'Canonical artifacts written to static/data'
});

await updateFinalMeta({ ...summary });

console.log('Pass F complete. Final artifacts written to static/data/.');
console.log(`Conflicts resolved: ${conflictLog.length}`);
if (ignoredVendors > 0) {
  console.warn(`Ignored ${ignoredVendors} vendor record(s) during finalization.`);
}
