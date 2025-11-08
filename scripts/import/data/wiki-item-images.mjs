import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(__dirname, '.cache', 'wiki-item-images');
const DEFAULT_HOST = 'https://arcraiders.wiki';

export async function fetchItemImage({ slug, wikiUrl }) {
  if (!wikiUrl) {
    return null;
  }
  const safeSlug = (slug ?? wikiUrl.split('/').pop() ?? 'item').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const cachePath = path.join(cacheDir, `${safeSlug}.json`);
  const cached = await readCache(cachePath);
  if (cached?.url) {
    return cached.url;
  }

  try {
    const response = await fetch(wikiUrl, {
      headers: {
        'user-agent': 'arc-companion-importer/1.0 (+https://github.com/)',
        accept: 'text/html'
      }
    });
    if (!response.ok) {
      throw new Error(`Wiki responded with ${response.status}`);
    }
    const html = await response.text();
    const url = extractImage(html);
    await writeCache(cachePath, { url, fetchedAt: new Date().toISOString(), wikiUrl });
    return url ?? null;
  } catch (error) {
    console.warn(`[wiki-item-images] Failed to fetch image for ${wikiUrl}: ${error.message}`);
    return cached?.url ?? null;
  }
}

function extractImage(html) {
  const root = parseHtml(html);
  const selectors = [
    '.infobox img',
    '.va-infobox img',
    '.pi-image-thumbnail',
    '.pi-item.pi-image img',
    '.mw-parser-output img'
  ];
  for (const selector of selectors) {
    const img = root.querySelector(selector);
    if (!img) continue;
    const src = img.getAttribute('data-src') ?? img.getAttribute('src');
    if (src) {
      return normalizeSrc(src);
    }
  }
  return null;
}

function normalizeSrc(src) {
  if (src.startsWith('//')) {
    return `https:${src}`;
  }
  if (src.startsWith('/')) {
    return `${DEFAULT_HOST}${src}`;
  }
  return src;
}

async function readCache(file) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeCache(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
