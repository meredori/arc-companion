import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  loadCanonicalData,
  normalizeItems,
  normalizeProjects,
  normalizeQuests,
  normalizeUpgrades
} from './pipeline';

const staticRoot = path.resolve('static');

const readJsonFileIfExists = <T>(relativePath: string): T | null => {
  const absolute = path.join(staticRoot, relativePath);
  try {
    return JSON.parse(readFileSync(absolute, 'utf-8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const readJsonDirectory = <T>(relativeDir: string): T[] => {
  const directory = path.join(staticRoot, relativeDir);
  try {
    return readdirSync(directory)
      .filter((file) => file.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => JSON.parse(readFileSync(path.join(directory, file), 'utf-8')) as T);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const loadRawCollection = <T>(directory: string, legacyPaths: string[] = []) => {
  const fromDirectory = readJsonDirectory<T>(directory);
  if (fromDirectory.length > 0) {
    return fromDirectory;
  }

  for (const legacyPath of legacyPaths) {
    const legacy = readJsonFileIfExists<T[]>(legacyPath);
    if (legacy && legacy.length > 0) {
      return legacy;
    }
  }

  return [];
};

const toItemId = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (lower.startsWith('item-')) return lower;
  const cleaned = lower.replace(/^item[_-]/, '');
  return `item-${cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
};

const toQuestId = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (lower.startsWith('quest-')) return lower;
  return `quest-${lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
};

describe('pipeline normalization', () => {
  const rawItems = loadRawCollection<Parameters<typeof normalizeItems>[0][number]>(
    'items',
    ['data/raw/items.json']
  );
  const normalizedItems = normalizeItems(rawItems);
  const rawQuests = loadRawCollection<Parameters<typeof normalizeQuests>[0][number]>(
    'quests',
    ['data/raw/quests.json']
  );
  const rawModules = loadRawCollection<Parameters<typeof normalizeUpgrades>[0][number]>(
    'hideout',
    ['data/raw/hideout-modules.json']
  );
  const rawProjects = loadRawCollection<Parameters<typeof normalizeProjects>[0][number]>(
    'projects',
    ['projects.json', 'data/raw/projects.json']
  );

  it('normalizes items solely from raw exports', () => {
    const expectedIds = new Set(
      rawItems.map((item) => toItemId(item.id)).filter((value): value is string => Boolean(value))
    );
    expect(new Set(normalizedItems.map((item) => item.id))).toEqual(expectedIds);

    const magnetic = normalizedItems.find((entry) => entry.id === 'item-magnetic-accelerator');
    expect(magnetic).toBeDefined();
    expect(magnetic?.craftsFrom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'item-advanced-mechanical-components', qty: 2 }),
        expect.objectContaining({ itemId: 'item-arc-motion-core', qty: 2 })
      ])
    );
    expect(magnetic?.notes).toContain('Used to craft advanced weapons.');
    expect(magnetic?.imageUrl).toBe('/images/items/magnetic_accelerator.png');

    const arcCore = normalizedItems.find((entry) => entry.id === 'item-arc-motion-core');
    expect(arcCore?.craftsInto).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: 'item-magnetic-accelerator' })
      ])
    );
  });

  it('derives quest chains, rewards, and requirements from raw data', () => {
    const { quests, chains } = normalizeQuests(rawQuests, { rawItems, items: normalizedItems });

    const expectedIds = new Set(
      rawQuests.map((quest) => toQuestId(quest.id)).filter((value): value is string => Boolean(value))
    );
    expect(new Set(quests.map((quest) => quest.id))).toEqual(expectedIds);
    expect(chains.length).toBeGreaterThan(0);

    const shaniChain = chains.find((chain) => chain.stages.includes('quest-ss1'));
    expect(shaniChain).toBeDefined();

    const ss1 = quests.find((quest) => quest.id === 'quest-ss1');
    expect(ss1).toBeDefined();
    expect(ss1?.chainId).toBe(shaniChain?.id);
    expect(ss1?.chainStage).toBe(0);
    expect(ss1?.nextQuestIds).toEqual(expect.arrayContaining(['quest-ss2', 'quest-ss3']));

    const ss2 = quests.find((quest) => quest.id === 'quest-ss2');
    expect(ss2).toBeDefined();
    expect(ss2?.previousQuestIds).toEqual(expect.arrayContaining(['quest-ss1']));
    expect(ss2?.chainStage ?? 0).toBeGreaterThan(ss1?.chainStage ?? -1);
    expect(ss2?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ itemId: 'item-arc-alloy', qty: 3 })])
    );
    expect(ss2?.rewards).toEqual(
      expect.arrayContaining([expect.objectContaining({ itemId: 'item-backpack-black-hiker-color' })])
    );
  });

  it('normalizes workbench upgrades from module levels', () => {
    const upgrades = normalizeUpgrades(rawModules);
    const ids = new Set(upgrades.map((upgrade) => upgrade.id));
    expect(ids).toContain('upgrade-scrappy-level-5');

    const scrappyThree = upgrades.find((upgrade) => upgrade.id === 'upgrade-scrappy-level-3');
    expect(scrappyThree?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'item-lemon', qty: 3 }),
        expect.objectContaining({ itemId: 'item-apricot', qty: 3 })
      ])
    );
  });

  it('normalizes expedition projects without fallbacks', () => {
    const projects = normalizeProjects(rawProjects);
    const expedition = projects.find((project) => project.id === 'project-expedition-project');
    expect(expedition).toBeDefined();
    expect(expedition?.description).toContain('Embark on a dangerous expedition');

    const foundation = expedition?.phases.find((phase) => phase.order === 1);
    expect(foundation?.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'item-metal-parts', qty: 150 }),
        expect.objectContaining({ itemId: 'item-rubber-parts', qty: 200 })
      ])
    );
  });

  it('loads canonical data from raw feeds', async () => {
    const fetchStub = vi.fn<typeof fetch>();

    const result = await loadCanonicalData(fetchStub, {
      items: true,
      quests: true,
      chains: true,
      upgrades: true,
      projects: true
    });

    expect(fetchStub).not.toHaveBeenCalled();
    expect(result.items?.length).toBe(normalizedItems.length);
    const arcCore = result.items?.find((item) => item.id === 'item-arc-motion-core');
    expect(arcCore?.craftsInto).toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: 'item-magnetic-accelerator' })])
    );
    expect(result.chains?.length).toBeGreaterThan(0);
    expect(result.workbenchUpgrades?.length).toBeGreaterThan(0);
    expect(result.projects?.length).toBeGreaterThan(0);
  });
});
