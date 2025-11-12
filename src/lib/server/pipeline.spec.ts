import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCanonicalDataset } from './pipeline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

async function readJson<T = unknown>(...segments: string[]): Promise<T> {
  const fullPath = path.join(projectRoot, ...segments);
  const raw = await fs.readFile(fullPath, 'utf8');
  return JSON.parse(raw) as T;
}

describe('buildCanonicalDataset', () => {
  it('matches the current canonical artifacts', async () => {
    const rawItems = await readJson('static', 'data', 'raw', 'items.json');
    const rawQuests = await readJson('static', 'data', 'raw', 'quests.json');
    const rawModules = await readJson('static', 'data', 'raw', 'hideoutModules.json');
    const rawProjects = await readJson('static', 'data', 'raw', 'projects.json');

    const fallbackItems = await readJson('static', 'data', 'items.json');
    const fallbackQuests = await readJson('static', 'data', 'quests.json');
    const fallbackUpgrades = await readJson('static', 'data', 'workbench-upgrades.json');
    const fallbackProjects = await readJson('static', 'data', 'projects.json');
    const fallbackVendors = await readJson('static', 'data', 'vendors.json');
    const fallbackChains = await readJson('static', 'data', 'chains.json');

    const dataset = await buildCanonicalDataset(
      {
        items: rawItems as any,
        quests: rawQuests as any,
        modules: rawModules as any,
        projects: rawProjects as any
      },
      {
        items: fallbackItems as any,
        quests: fallbackQuests as any,
        upgrades: fallbackUpgrades as any,
        projects: fallbackProjects as any,
        vendors: fallbackVendors as any,
        chains: fallbackChains as any
      }
    );

    expect(dataset.items).toEqual(fallbackItems);
    expect(dataset.quests).toEqual(fallbackQuests);
    expect(dataset.upgrades).toEqual(fallbackUpgrades);
    expect(dataset.projects).toEqual(fallbackProjects);
    expect(dataset.vendors).toEqual(fallbackVendors);
    expect(dataset.chains).toEqual(fallbackChains);
  });
});
