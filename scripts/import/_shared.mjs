import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, '../..');
export const dataDir = path.join(projectRoot, 'static', 'data');
export const stagingDir = path.join(dataDir, '_staging');
const metaDir = path.join(dataDir, 'meta');
const metaFile = path.join(metaDir, 'index.json');

const defaultMeta = {
  version: 1,
  generatedAt: null,
  passes: {
    A: defaultPassMeta('Pass A — Wiki Loot Seed'),
    B: defaultPassMeta('Pass B — Wiki Enrichment'),
    C: defaultPassMeta('Pass C — MetaForge Merge'),
    D: defaultPassMeta('Pass D — Quests + Chains'),
    E: defaultPassMeta('Pass E — Conflict Resolution'),
    F: defaultPassMeta('Pass F — Finalization')
  },
  final: {
    items: 0,
    quests: 0,
    upgrades: 0,
    vendors: 0,
    chains: 0,
    updatedAt: null
  }
};

function defaultPassMeta(label) {
  return {
    label,
    batches: 0,
    records: 0,
    lastRunAt: null,
    approved: false,
    notes: null
  };
}

export function parseArgs(defaults = {}) {
  const args = { ...defaults };
  for (const token of process.argv.slice(2)) {
    if (!token.startsWith('--')) continue;
    const [flag, rawValue] = token.slice(2).split('=');
    if (!flag) continue;

    if (rawValue === undefined) {
      args[flag] = true;
    } else if (rawValue === 'false') {
      args[flag] = false;
    } else if (rawValue === 'true') {
      args[flag] = true;
    } else if (!Number.isNaN(Number(rawValue))) {
      args[flag] = Number(rawValue);
    } else {
      args[flag] = rawValue;
    }
  }
  return args;
}

export function chunk(array, size) {
  if (size <= 0) throw new Error('Batch size must be greater than zero');
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJson(file, fallback) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(file, value) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

export function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isoNow() {
  return new Date().toISOString();
}

export function stagePath(passName, ...segments) {
  return path.join(stagingDir, passName.toLowerCase(), ...segments);
}

export async function readStage(passName) {
  const dir = stagePath(passName);
  await ensureDir(dir);
  const files = await fs.readdir(dir);
  const payload = [];
  for (const file of files.filter((file) => file.endsWith('.json'))) {
    const records = await readJson(path.join(dir, file), []);
    payload.push(...records);
  }
  return payload;
}

export async function writeBatches(passName, records, { batchSize, dryRun = false } = {}) {
  const batches = chunk(records, batchSize);
  const dir = stagePath(passName);
  if (dryRun) {
    console.log(`[${passName}] Dry run — calculated ${batches.length} batches`);
    return batches.map((batch, index) => ({
      batchNumber: index + 1,
      size: batch.length
    }));
  }

  await ensureDir(dir);
  const results = [];
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const batchNumber = index + 1;
    const file = path.join(dir, `batch-${String(batchNumber).padStart(3, '0')}.json`);
    await writeJson(file, batch);
    results.push({ batchNumber, size: batch.length, file });
  }
  return results;
}

export async function ensureMeta() {
  await ensureDir(metaDir);
  const meta = await readJson(metaFile, null);
  if (!meta || typeof meta !== 'object' || meta.version !== defaultMeta.version) {
    await writeJson(metaFile, defaultMeta);
    return { ...defaultMeta };
  }

  meta.passes = { ...defaultMeta.passes, ...(meta.passes ?? {}) };
  meta.final = { ...defaultMeta.final, ...(meta.final ?? {}) };
  return meta;
}

export async function updatePassMeta(passKey, partial) {
  const meta = await ensureMeta();
  const key = passKey.toUpperCase();
  if (!meta.passes[key]) {
    meta.passes[key] = defaultPassMeta(passKey);
  }
  meta.passes[key] = {
    ...meta.passes[key],
    ...partial,
    lastRunAt: partial.lastRunAt ?? meta.passes[key].lastRunAt
  };
  meta.generatedAt = isoNow();
  await writeJson(metaFile, meta);
  return meta.passes[key];
}

export async function updateFinalMeta(summary) {
  const meta = await ensureMeta();
  meta.final = { ...meta.final, ...summary, updatedAt: isoNow() };
  meta.generatedAt = isoNow();
  await writeJson(metaFile, meta);
  return meta.final;
}

export async function markApproval(passKey, approved) {
  return updatePassMeta(passKey, { approved, lastRunAt: isoNow() });
}

export function logBatchResult(passName, results) {
  console.log(`\n${passName} — wrote ${results.length} batches:`);
  results.forEach((result) => {
    const target = result.file ?? `${result.size} records (dry run)`;
    console.log(`  batch ${String(result.batchNumber).padStart(3, '0')}: ${target}`);
  });
  console.log('');
}

export function summarizeRecords(records, mapper) {
  const summary = records.reduce(
    (acc, record) => mapper(acc, record),
    { count: 0 }
  );
  summary.count = records.length;
  return summary;
}

export async function readMeta() {
  return ensureMeta();
}

export function resolveStaticPath(...segments) {
  return path.join(dataDir, ...segments);
}

export function conflictNote(field, wikiValue, apiValue) {
  if (wikiValue === apiValue) return null;
  return {
    field,
    wikiValue,
    apiValue,
    resolvedTo: apiValue ?? wikiValue
  };
}
