import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  loadCanonicalData,
  normalizeItems,
  normalizeProjects,
  normalizeQuests,
  normalizeUpgrades
} from './pipeline';
import {
  fallbackChains,
  fallbackItems,
  fallbackProjects,
  fallbackQuests,
  fallbackUpgradePacks,
  fallbackVendors
} from './fallback';

const readJson = (relativePath: string) => {
  const absolute = path.resolve(relativePath);
  return JSON.parse(readFileSync(absolute, 'utf-8')) as unknown;
};

describe('pipeline normalization', () => {
  const rawItems = readJson('static/data/raw/items.json') as Parameters<typeof normalizeItems>[0];
  const normalizedItems = normalizeItems(rawItems);
  const rawQuests = readJson('static/data/raw/quests.json') as Parameters<typeof normalizeQuests>[0];
  const rawModules = readJson('static/data/raw/hideout-modules.json') as Parameters<typeof normalizeUpgrades>[0];
  const rawProjects = readJson('static/data/raw/projects.json') as Parameters<typeof normalizeProjects>[0];

  it('produces canonical item identities and attributes', () => {
    const expectedIds = new Set(fallbackItems.map((item) => item.id));
    expect(new Set(normalizedItems.map((item) => item.id))).toEqual(expectedIds);

    const fallbackById = new Map(fallbackItems.map((item) => [item.id, item]));
    for (const item of normalizedItems) {
      const baseline = fallbackById.get(item.id);
      expect(baseline).toBeDefined();
      expect(item.name).toEqual(baseline!.name);
      expect(item.slug).toEqual(baseline!.slug);
      expect(item.rarity ?? null).toEqual(baseline!.rarity ?? null);
      expect(item.category ?? null).toEqual(baseline!.category ?? null);
      expect(item.sell).toEqual(baseline!.sell);
      expect(item.notes ?? null).toEqual(baseline!.notes ?? null);
      expect(item.imageUrl ?? null).toEqual(baseline!.imageUrl ?? null);
    }

    const magnetic = normalizedItems.find((entry) => entry.id === 'item-magnetic-accelerator');
    expect(magnetic?.craftsFrom ?? []).not.toHaveLength(0);
  });

  it('derives quests and chains compatible with legacy data', () => {
    const { quests, chains } = normalizeQuests(rawQuests, { rawItems, items: normalizedItems });

    const fallbackQuestIds = new Set(fallbackQuests.map((quest) => quest.id));
    expect(new Set(quests.map((quest) => quest.id))).toEqual(fallbackQuestIds);

    const baselineById = new Map(fallbackQuests.map((quest) => [quest.id, quest]));
    for (const quest of quests) {
      const baseline = baselineById.get(quest.id);
      expect(baseline).toBeDefined();
      expect(quest.name).toEqual(baseline!.name);
      expect(quest.giver ?? null).toEqual(baseline!.giver ?? null);
      expect(quest.chainId ?? null).toEqual(baseline!.chainId ?? null);
      expect(quest.chainStage ?? null).toEqual(baseline!.chainStage ?? null);
      expect(quest.previousQuestIds).toEqual(baseline!.previousQuestIds);
      expect(quest.nextQuestIds).toEqual(baseline!.nextQuestIds);
    }

    expect(chains).toEqual(fallbackChains);
  });

  it('retains upgrade pack semantics', () => {
    const upgrades = normalizeUpgrades(rawModules);
    const fallbackById = new Map(fallbackUpgradePacks.map((upgrade) => [upgrade.id, upgrade]));

    expect(new Set(upgrades.map((upgrade) => upgrade.id))).toEqual(new Set(fallbackUpgradePacks.map((u) => u.id)));
    for (const upgrade of upgrades) {
      const baseline = fallbackById.get(upgrade.id);
      expect(baseline).toBeDefined();
      expect(upgrade.bench).toEqual(baseline!.bench);
      expect(upgrade.level).toEqual(baseline!.level);
      expect(upgrade.items).toEqual(baseline!.items);
    }
  });

  it('normalizes projects consistently', () => {
    const projects = normalizeProjects(rawProjects);
    const fallbackById = new Map(fallbackProjects.map((project) => [project.id, project]));

    expect(new Set(projects.map((project) => project.id))).toEqual(new Set(fallbackProjects.map((p) => p.id)));
    for (const project of projects) {
      const baseline = fallbackById.get(project.id);
      expect(baseline).toBeDefined();
      expect(project.name).toEqual(baseline!.name);
      expect(project.description ?? null).toEqual(baseline!.description ?? null);
      expect(project.phases).toEqual(baseline!.phases);
    }
  });

  it('exposes vendor fallbacks when raw feeds are absent', async () => {
    const failFetch: typeof fetch = async () => {
      throw new Error('fetch should not be invoked for vendor fallbacks');
    };

    const result = await loadCanonicalData(failFetch, { vendors: true });
    expect(result.vendors).toEqual(fallbackVendors);
  });
});
