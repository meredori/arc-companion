import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.join(__dirname, 'wiki-loot.json');
const overridesPath = path.join(__dirname, 'wiki-loot-overrides.json');
const cacheDir = path.join(__dirname, '.cache');
const cachePath = path.join(cacheDir, 'wiki-loot.json');
const WIKI_URL = 'https://arcraiders.wiki/wiki/Loot';

/**
 * Load the loot dataset, preferring a live fetch but falling back to cache or snapshot data.
 * Options:
 *   - refresh: boolean — force a live fetch or throw if it fails.
 *   - source: 'auto' | 'cache' | 'remote' — control fetch strategy (default: 'auto').
 */
const SOURCE_MODES = new Set(['auto', 'cache', 'remote']);

export async function loadLootRecords(options = {}) {
  const { refresh = false } = options;
  const requestedSource = refresh ? 'remote' : options.source ?? 'auto';
  const source = typeof requestedSource === 'string' ? requestedSource.toLowerCase() : 'auto';
  if (!SOURCE_MODES.has(source)) {
    throw new Error(`Unsupported loot source mode: ${requestedSource}`);
  }

  if (source === 'remote') {
    const records = await fetchAndNormalize();
    await writeJson(cachePath, records);
    return records;
  }

  if (source === 'auto') {
    try {
      const records = await fetchAndNormalize();
      await writeJson(cachePath, records);
      return records;
    } catch (error) {
      console.warn(
        `[wiki-loot] Remote fetch failed (${error.message}). Falling back to cached snapshot.`
      );
    }
  }

  const cached = await readJson(cachePath);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  const snapshot = await readJson(snapshotPath);
  if (Array.isArray(snapshot) && snapshot.length > 0) {
    return snapshot;
  }

  throw new Error('Loot dataset unavailable. Re-run with --refresh when online to prime the cache.');
}

export async function refreshLootSnapshot() {
  const records = await fetchAndNormalize();
  await writeJson(snapshotPath, records);
  return records;
}

async function fetchAndNormalize() {
  const html = await fetchHtml(WIKI_URL);
  const baseRecords = parseLootTable(html);
  if (!Array.isArray(baseRecords) || baseRecords.length === 0) {
    throw new Error('Loot table parse returned no rows.');
  }
  const overrides = (await readJson(overridesPath)) ?? {};
  return applyOverrides(baseRecords, overrides);
}

async function fetchHtml(url) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node runtime.');
  }
  const response = await fetch(url, {
    headers: {
      'user-agent': 'arc-companion-importer/1.0 (+https://github.com/)',
      accept: 'text/html'
    }
  });
  if (!response.ok) {
    throw new Error(`Wiki responded with ${response.status}`);
  }
  return response.text();
}

function parseLootTable(html) {
  const root = parseHtml(html);
  const table = root.querySelector('table.wikitable');
  if (!table) {
    throw new Error('Could not locate loot table in wiki response.');
  }
  const rows = table.querySelectorAll('tr').slice(1); // skip header
  const records = [];
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) continue;
    const nameCell = cells[0];
    const name = cleanText(nameCell);
    if (!name) continue;
    const slug = toSlug(name);
    const wikiSlug = extractWikiSlug(nameCell.querySelector('a')?.getAttribute('href')) ?? name.replace(/\s+/g, '_');
    const rarity = cleanText(cells[1]);
    const recycle = parseRecycleCell(cells[2]);
    const sell = parseInteger(cells[3]?.innerText);
    const category = cleanText(cells[4]);
    const keep = parseKeepCell(cells[5]);

    records.push({
      name,
      slug,
      rarity,
      category,
      sell,
      recycle,
      keep,
      wikiSlug,
      notes: null
    });
  }
  return records;
}

function parseRecycleCell(cell) {
  if (!cell) return [];
  const text = cell.innerText.trim();
  if (!text || /cannot be recycled/i.test(text)) {
    return [];
  }
  const fragments = cell.innerHTML
    .split(/<br\s*\/?>/gi)
    .map((fragment) => fragment.trim())
    .filter(Boolean);

  const entries = [];
  for (const fragment of fragments) {
    const node = parseHtml(fragment);
    const rawText = node.innerText.replace(/\s+/g, ' ').trim();
    if (!rawText) continue;
    const quantityMatch = rawText.match(/^\s*(\d+)\s*x?/i);
    const qty = quantityMatch ? Number(quantityMatch[1]) : 1;
    const nameText = quantityMatch
      ? rawText.slice(quantityMatch[0].length).trim()
      : rawText.replace(/cannot be recycled/i, '').trim();
    if (!nameText || /cannot be recycled/i.test(nameText)) continue;
    const anchor = node.querySelector('a');
    const recycledName = anchor?.innerText.trim() || nameText;
    if (!recycledName) continue;
    entries.push({
      itemId: `mat-${toSlug(recycledName)}`,
      name: recycledName,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1
    });
  }

  return entries;
}

function parseKeepCell(cell) {
  const keep = { quests: 0, workshop: 0 };
  if (!cell) return keep;
  const normalized = cell.innerText.replace(/\s+/g, ' ').trim();
  if (!normalized) return keep;
  const pattern = /(\d+)\s*x?\s*(quests?|quest|workshop|expedition)/gi;
  for (const match of normalized.matchAll(pattern)) {
    const qty = Number(match[1]);
    if (!Number.isFinite(qty)) continue;
    const bucket = /workshop/i.test(match[2]) ? 'workshop' : 'quests';
    keep[bucket] += qty;
  }
  return keep;
}

function parseInteger(value) {
  if (!value) return 0;
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function cleanText(node) {
  if (!node) return '';
  return node.innerText.replace(/\s+/g, ' ').trim();
}

function extractWikiSlug(href) {
  if (!href) return null;
  const idx = href.indexOf('/wiki/');
  if (idx === -1) return null;
  const slug = href.slice(idx + 6).split('#')[0];
  return decodeURIComponent(slug);
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function applyOverrides(records, overrides) {
  if (!overrides || typeof overrides !== 'object') {
    return records;
  }
  const map = new Map(Object.entries(overrides));
  return records.map((record) => {
    const override = map.get(record.slug);
    if (!override) return record;
    return {
      ...record,
      notes: override.notes ?? record.notes,
      details: override.details ?? record.details,
      metaforge: override.metaforge ?? record.metaforge,
      keep: mergeKeep(record.keep, override.keep),
      recycle: Array.isArray(override.recycle) ? override.recycle : record.recycle
    };
  });
}

function mergeKeep(base = { quests: 0, workshop: 0 }, override) {
  if (!override) return base;
  return {
    quests: override.quests ?? base.quests ?? 0,
    workshop: override.workshop ?? base.workshop ?? 0
  };
}

async function readJson(file) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
