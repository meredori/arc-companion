import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type {
  ItemRecord,
  PipelineMeta,
  Project,
  Quest,
  QuestChain,
  UpgradePack,
  Vendor
} from '$lib/types';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const dataDir = path.join(projectRoot, 'static', 'data');
const metaPath = path.join(dataDir, 'meta', 'index.json');
const stagingDir = path.join(dataDir, '_staging');
const itemImageDir = path.join(projectRoot, 'static', 'images', 'items');

const scriptMap: Record<string, string> = {
  A: 'wiki-loot.mjs',
  B: 'wiki-item.mjs',
  C: 'metaforge.mjs',
  D: 'quests.mjs',
  E: 'finalize.mjs',
  F: 'finalize.mjs'
};

type RawLocalizedField = string | null | undefined | Record<string, string>;

interface RawItem {
  id?: string;
  name?: RawLocalizedField;
  description?: RawLocalizedField;
  type?: string | null;
  rarity?: string | null;
  value?: number | string | null;
  recyclesInto?: Record<string, number | string>;
  salvagesInto?: Record<string, number | string>;
  imageFilename?: string | null;
  recipe?: Record<string, number | string>;
}

interface RawQuestReward {
  itemId?: string;
  quantity?: number | string;
}

interface RawQuest {
  id?: string;
  name?: RawLocalizedField;
  trader?: RawLocalizedField;
  rewardItemIds?: RawQuestReward[];
  xp?: number | string | null;
  objectives?: RawLocalizedField[];
  previousQuestIds?: Array<string | null>;
  nextQuestIds?: Array<string | null>;
}

interface RawRequirement {
  itemId?: string;
  quantity?: number | string;
  qty?: number | string;
}

interface RawModuleLevel {
  level?: number | string;
  requirementItemIds?: RawRequirement[];
}

interface RawHideoutModule {
  id?: string;
  name?: RawLocalizedField;
  levels?: RawModuleLevel[];
}

interface RawProjectPhase {
  phase?: number | string;
  name?: RawLocalizedField;
  description?: RawLocalizedField;
  requirementItemIds?: RawRequirement[];
}

interface RawProject {
  id?: string;
  name?: RawLocalizedField;
  description?: RawLocalizedField;
  phases?: RawProjectPhase[];
}

type ItemNameResolver = (rawId: string) => string;
type QuestRewardList = NonNullable<Quest['rewards']>;
type ProjectRequirementEntry = Project['phases'][number]['requirements'][number];

interface QuestGraphNode {
  prev: Set<string>;
  next: Set<string>;
}

interface QuestChainAssignment {
  chainId: string;
  stage: number;
}

let localItemImageNamesPromise: Promise<Set<string>> | null = null;

function slugify(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function englishText(value: RawLocalizedField, fallback: string | null = ''): string {
  if (value === null || value === undefined) {
    return fallback ?? '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, string | undefined>;
    if (record.en && record.en.trim().length > 0) {
      return record.en;
    }
    const first = Object.values(record).find(
      (entry) => typeof entry === 'string' && entry.trim().length > 0
    );
    if (first) {
      return first;
    }
  }
  return fallback ?? '';
}

function toItemId(raw: string | null | undefined): string {
  if (!raw) return '';
  if (raw.startsWith('item-')) {
    return raw.toLowerCase();
  }
  const cleaned = raw.replace(/^item[_-]/, '');
  const slug = slugify(cleaned.replace(/_/g, '-'));
  return slug ? `item-${slug}` : '';
}

function canonicalQuestId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('quest-')) {
    return value.toLowerCase();
  }
  const slug = slugify(value);
  if (!slug) return null;
  return `quest-${slug}`;
}

function asNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Number(numeric) : fallback;
}

async function getLocalItemImageNames(): Promise<Set<string>> {
  if (!localItemImageNamesPromise) {
    localItemImageNamesPromise = fs
      .readdir(itemImageDir)
      .then((entries) => new Set(entries))
      .catch(() => new Set());
  }
  return localItemImageNamesPromise;
}

function resolveImageSource(
  source: string | null | undefined,
  fallback: string | null | undefined,
  localImages: Set<string>
): string | null | undefined {
  if (source) {
    const filename = path.basename(source);
    if (localImages.has(filename)) {
      return `/images/items/${filename}`;
    }
    return source;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return undefined;
}

function convertRecycleList(
  entry: RawItem,
  resolveItemName: ItemNameResolver
): ItemRecord['recycle'] {
  const recycleMap = entry.recyclesInto ?? entry.salvagesInto;
  if (!recycleMap || typeof recycleMap !== 'object') {
    return [];
  }
  return Object.entries(recycleMap)
    .map(([rawId, qty]) => {
      const itemId = toItemId(rawId);
      if (!itemId) return null;
      return {
        itemId,
        name: resolveItemName(rawId),
        qty: asNumber(qty, 1)
      };
    })
    .filter((value): value is ItemRecord['recycle'][number] => Boolean(value));
}

function convertRecipeList(
  recipe: Record<string, number | string> | undefined,
  resolveItemName: ItemNameResolver
): ItemRecord['craftsFrom'] {
  if (!recipe) {
    return [];
  }
  return Object.entries(recipe)
    .map(([rawId, qty]) => {
      const itemId = toItemId(rawId);
      if (!itemId) return null;
      return {
        itemId,
        name: resolveItemName(rawId),
        qty: asNumber(qty, 1)
      };
    })
    .filter((value): value is ItemRecord['craftsFrom'][number] => Boolean(value));
}

function createItemNameResolver(rawItems: RawItem[], items: ItemRecord[]): ItemNameResolver {
  const fallbackMap = new Map(items.map((item) => [item.id, item.name]));
  const lookup = new Map<string, string>();
  for (const entry of rawItems) {
    const rawId = entry.id;
    if (!rawId) continue;
    const englishName = englishText(entry.name, rawId);
    if (!englishName) continue;
    const canonical = toItemId(rawId);
    const normalized = rawId.replace(/^item[_-]/, '');
    lookup.set(rawId, englishName);
    lookup.set(normalized, englishName);
    if (canonical) {
      lookup.set(canonical, englishName);
      lookup.set(canonical.replace(/^item-/, ''), englishName);
    }
  }
  return (rawId: string) => {
    const canonical = toItemId(rawId);
    if (canonical && fallbackMap.has(canonical)) {
      return fallbackMap.get(canonical)!;
    }
    const normalized = rawId.replace(/^item[_-]/, '');
    const fallbackName = normalized || rawId;
    return (
      lookup.get(rawId) ??
      (canonical ? lookup.get(canonical) : undefined) ??
      lookup.get(normalized) ??
      lookup.get(canonical.replace(/^item-/, '')) ??
      fallbackName
    );
  };
}

function cloneItemRecord(item: ItemRecord): ItemRecord {
  const cloneFn = (globalThis as { structuredClone?: <T>(value: T) => T }).structuredClone;
  if (typeof cloneFn === 'function') {
    return cloneFn(item);
  }
  return JSON.parse(JSON.stringify(item)) as ItemRecord;
}

async function transformItems(
  rawItems: RawItem[],
  fallbackItems: ItemRecord[],
  resolveItemName: ItemNameResolver
): Promise<ItemRecord[]> {
  const fallbackIndexById = new Map<string, number>();
  const fallbackIndexBySlug = new Map<string, number>();
  fallbackItems.forEach((item, index) => {
    fallbackIndexById.set(item.id, index);
    if (item.slug) {
      fallbackIndexBySlug.set(item.slug, index);
    }
  });
  const clones = fallbackItems.map((item) => cloneItemRecord(item));
  const localImages = await getLocalItemImageNames();
  const additions: ItemRecord[] = [];

  for (const entry of rawItems) {
    const canonicalFromId = toItemId(entry.id ?? '');
    const englishName = englishText(entry.name, canonicalFromId);
    const englishSlug = slugify(englishName);

    let targetIndex: number | undefined =
      canonicalFromId && fallbackIndexById.has(canonicalFromId)
        ? fallbackIndexById.get(canonicalFromId)
        : undefined;

    if (targetIndex === undefined && englishSlug) {
      targetIndex = fallbackIndexBySlug.get(englishSlug);
    }

    if (targetIndex !== undefined && targetIndex !== null) {
      const item = clones[targetIndex];
      if (!item) continue;

      if (!Object.prototype.hasOwnProperty.call(item, 'name') && englishName) {
        item.name = englishName;
      }

      if (!Object.prototype.hasOwnProperty.call(item, 'slug') && englishSlug) {
        item.slug = englishSlug;
      }

      if (entry.rarity && !Object.prototype.hasOwnProperty.call(item, 'rarity')) {
        item.rarity = entry.rarity;
      }

      if (entry.type && !Object.prototype.hasOwnProperty.call(item, 'category')) {
        item.category = entry.type;
      }

      if (
        (typeof entry.value === 'number' || typeof entry.value === 'string') &&
        !Object.prototype.hasOwnProperty.call(item, 'sell')
      ) {
        item.sell = asNumber(entry.value, 0);
      }

      const description = englishText(entry.description, null)?.trim();
      if (description && !Object.prototype.hasOwnProperty.call(item, 'notes')) {
        item.notes = description;
      }

      if (!Object.prototype.hasOwnProperty.call(item, 'imageUrl')) {
        const image = resolveImageSource(entry.imageFilename, undefined, localImages);
        if (image !== undefined) {
          item.imageUrl = image;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(item, 'recycle')) {
        const recycleList = convertRecycleList(entry, resolveItemName);
        if (recycleList.length > 0) {
          item.recycle = recycleList;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(item, 'craftsFrom')) {
        const recipeList = convertRecipeList(entry.recipe, resolveItemName);
        if (recipeList.length > 0) {
          item.craftsFrom = recipeList;
        }
      }

      continue;
    }

    const canonicalId =
      canonicalFromId || (englishSlug ? `item-${englishSlug}` : slugify(entry.id ?? ''));
    if (!canonicalId) continue;

    const slug = englishSlug || slugify((entry.id ?? '').replace(/_/g, '-')) || canonicalId;
    const sellValue =
      typeof entry.value === 'number' || typeof entry.value === 'string'
        ? asNumber(entry.value, 0)
        : 0;

    const recycleList = convertRecycleList(entry, resolveItemName);
    const recipeList = convertRecipeList(entry.recipe, resolveItemName);
    const description = englishText(entry.description, null)?.trim();

    const newItem: ItemRecord = {
      id: canonicalId,
      name: englishName || canonicalId,
      slug,
      rarity: entry.rarity ?? undefined,
      category: entry.type ?? undefined,
      sell: sellValue,
      recycle: recycleList,
      sources: [],
      vendors: [],
      craftsFrom: recipeList,
      craftsInto: [],
      needsTotals: { quests: 0, workshop: 0 },
      wikiUrl: null,
      notes: description ?? null,
      metaforgeId: null,
      zones: [],
      provenance: { wiki: false, api: true }
    };

    const image = resolveImageSource(entry.imageFilename, undefined, localImages);
    if (image !== undefined) {
      newItem.imageUrl = image;
    }

    additions.push(newItem);
  }

  additions.sort((a, b) => a.name.localeCompare(b.name));
  return [...clones, ...additions];
}

function deriveQuestChains(
  questEntries: { questId: string; quest: RawQuest }[],
  questGraph: Map<string, QuestGraphNode>
): { chains: QuestChain[]; assignments: Map<string, QuestChainAssignment> } {
  const questLookup = new Map(questEntries.map(({ questId, quest }) => [questId, quest]));
  const visited = new Set<string>();
  const questIds = Array.from(questGraph.keys()).sort();
  const usedChainIds = new Set<string>();
  const assignments = new Map<string, QuestChainAssignment>();
  const chains: QuestChain[] = [];

  for (const startId of questIds) {
    if (visited.has(startId)) continue;

    const component = new Set<string>();
    const stack = [startId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);
      const node = questGraph.get(current);
      if (!node) continue;
      for (const prev of node.prev) {
        if (!visited.has(prev)) stack.push(prev);
      }
      for (const next of node.next) {
        if (!visited.has(next)) stack.push(next);
      }
    }

    const componentIds = Array.from(component);
    const componentSet = new Set(componentIds);
    const inDegree = new Map<string, number>();

    for (const id of componentIds) {
      let degree = 0;
      for (const prev of questGraph.get(id)?.prev ?? []) {
        if (componentSet.has(prev)) degree += 1;
      }
      inDegree.set(id, degree);
    }

    const stageMap = new Map<string, number>();
    const seeds = componentIds
      .filter((id) => (inDegree.get(id) ?? 0) === 0)
      .sort((a, b) => a.localeCompare(b));

    for (const seed of seeds) {
      stageMap.set(seed, 0);
    }

    const queue = [...seeds];
    const sortQueue = () => {
      queue.sort((a, b) => {
        const stageA = stageMap.get(a) ?? 0;
        const stageB = stageMap.get(b) ?? 0;
        if (stageA !== stageB) {
          return stageA - stageB;
        }
        const nameA = englishText(questLookup.get(a)?.name, a);
        const nameB = englishText(questLookup.get(b)?.name, b);
        return nameA.localeCompare(nameB);
      });
    };
    sortQueue();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentStage = stageMap.get(current) ?? 0;
      for (const next of questGraph.get(current)?.next ?? []) {
        if (!componentSet.has(next)) continue;
        const proposedStage = currentStage + 1;
        const existingStage = stageMap.get(next);
        if (existingStage === undefined || proposedStage > existingStage) {
          stageMap.set(next, proposedStage);
        }
        const remaining = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, remaining);
        if (remaining === 0) {
          queue.push(next);
          sortQueue();
        }
      }
    }

    for (const id of componentIds) {
      if (!stageMap.has(id)) {
        stageMap.set(id, 0);
      }
    }

    const roots = componentIds
      .filter((id) => {
        for (const prev of questGraph.get(id)?.prev ?? []) {
          if (componentSet.has(prev)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const stageA = stageMap.get(a) ?? 0;
        const stageB = stageMap.get(b) ?? 0;
        if (stageA !== stageB) return stageA - stageB;
        const nameA = englishText(questLookup.get(a)?.name, a);
        const nameB = englishText(questLookup.get(b)?.name, b);
        return nameA.localeCompare(nameB);
      });

    const fallbackRoot = [...componentIds].sort((a, b) => a.localeCompare(b))[0];
    const primaryRoot = roots[0] ?? fallbackRoot;
    const rootQuest = questLookup.get(primaryRoot);
    const baseName =
      englishText(rootQuest?.trader, null) ||
      englishText(rootQuest?.name, primaryRoot) ||
      primaryRoot;
    const baseSlug = slugify(baseName) || slugify(primaryRoot) || 'questline';
    let chainId = `chain-${baseSlug}`;
    let suffix = 1;
    while (usedChainIds.has(chainId)) {
      suffix += 1;
      chainId = `chain-${baseSlug}-${suffix}`;
    }
    usedChainIds.add(chainId);

    const stageRecords = componentIds
      .map((id) => ({
        id,
        stage: stageMap.get(id) ?? 0,
        name: englishText(questLookup.get(id)?.name, id)
      }))
      .sort((a, b) => {
        if (a.stage !== b.stage) {
          return a.stage - b.stage;
        }
        return a.name.localeCompare(b.name);
      });

    chains.push({
      id: chainId,
      name: baseName,
      stages: stageRecords.map((record) => record.id)
    });

    for (const record of stageRecords) {
      assignments.set(record.id, { chainId, stage: record.stage });
    }
  }

  chains.sort((a, b) => a.name.localeCompare(b.name));
  return { chains, assignments };
}

function transformQuests(
  rawQuests: RawQuest[],
  fallbackQuests: Quest[],
  fallbackChains: QuestChain[],
  resolveItemName: ItemNameResolver
): { quests: Quest[]; chains: QuestChain[] } {
  const fallbackMap = new Map(fallbackQuests.map((quest) => [quest.id, quest]));
  const questEntries = rawQuests
    .map((quest) => {
      const questId = canonicalQuestId(quest.id ?? '');
      return questId ? { questId, quest } : null;
    })
    .filter((value): value is { questId: string; quest: RawQuest } => Boolean(value));

  const questGraph: Map<string, QuestGraphNode> = new Map(
    questEntries.map(({ questId }) => [questId, { prev: new Set(), next: new Set() }])
  );

  const normalizeQuestId = (rawId: string | null | undefined) => {
    const canonical = canonicalQuestId(rawId ?? '');
    if (!canonical) return null;
    return questGraph.has(canonical) ? canonical : null;
  };

  for (const { questId, quest } of questEntries) {
    const prevIds = Array.isArray(quest.previousQuestIds) ? quest.previousQuestIds : [];
    for (const prev of prevIds) {
      const mapped = normalizeQuestId(prev);
      if (!mapped) continue;
      questGraph.get(questId)?.prev.add(mapped);
      questGraph.get(mapped)?.next.add(questId);
    }
    const nextIds = Array.isArray(quest.nextQuestIds) ? quest.nextQuestIds : [];
    for (const next of nextIds) {
      const mapped = normalizeQuestId(next);
      if (!mapped) continue;
      questGraph.get(questId)?.next.add(mapped);
      questGraph.get(mapped)?.prev.add(questId);
    }
  }

  const { chains: derivedChains, assignments } = deriveQuestChains(questEntries, questGraph);

  const quests: Quest[] = [];

  for (const { questId, quest } of questEntries) {
    const base = fallbackMap.get(questId);
    const rewards: QuestRewardList = [];

    if (Array.isArray(quest.rewardItemIds)) {
      for (const reward of quest.rewardItemIds) {
        if (!reward?.itemId) continue;
        const convertedId = toItemId(reward.itemId);
        if (!convertedId) continue;
        rewards.push({
          itemId: convertedId,
          name: resolveItemName(reward.itemId),
          qty: asNumber(reward.quantity, 1)
        });
      }
    }

    const xpReward = asNumber(quest.xp, 0);
    if (xpReward !== 0) {
      rewards.push({ coins: xpReward });
    }

    const objectives = Array.isArray(quest.objectives)
      ? quest.objectives.map((objective) => englishText(objective)).filter(Boolean)
      : [];

    const previousQuestIdsRaw = Array.isArray(quest.previousQuestIds)
      ? quest.previousQuestIds
      : [];
    const mappedPrevious = previousQuestIdsRaw
      .map((value) => canonicalQuestId(value ?? ''))
      .filter((value): value is string => Boolean(value));

    const nextQuestIdsRaw = Array.isArray(quest.nextQuestIds) ? quest.nextQuestIds : [];
    const mappedNext = nextQuestIdsRaw
      .map((value) => canonicalQuestId(value ?? ''))
      .filter((value): value is string => Boolean(value));

    const questRecord: Quest = {
      id: questId,
      name: englishText(quest.name, base?.name ?? questId),
      items: base?.items ?? [],
      previousQuestIds: mappedPrevious.length > 0 ? mappedPrevious : base?.previousQuestIds ?? [],
      nextQuestIds: mappedNext.length > 0 ? mappedNext : base?.nextQuestIds ?? []
    };

    const giverName = englishText(quest.trader, base?.giver ?? null) || base?.giver;
    if (giverName) {
      questRecord.giver = giverName;
    }

    const assignment = assignments.get(questId);
    const chainId = assignment?.chainId ?? base?.chainId;
    if (chainId) {
      questRecord.chainId = chainId;
    }
    const chainStage = assignment?.stage ?? base?.chainStage ?? null;
    if (chainStage !== undefined) {
      questRecord.chainStage = chainStage;
    }

    const finalRewards = rewards.length > 0 ? rewards : base?.rewards;
    if (finalRewards && finalRewards.length > 0) {
      questRecord.rewards = finalRewards;
    }

    const finalHints = objectives.length > 0 ? objectives : base?.mapHints;
    if (finalHints && finalHints.length > 0) {
      questRecord.mapHints = finalHints;
    }

    quests.push(questRecord);
    fallbackMap.delete(questId);
  }

  for (const leftover of fallbackMap.values()) {
    quests.push(leftover);
  }

  quests.sort((a, b) => a.name.localeCompare(b.name));

  const chainMap = new Map(derivedChains.map((chain) => [chain.id, chain]));
  for (const chain of fallbackChains) {
    if (!chainMap.has(chain.id)) {
      chainMap.set(chain.id, chain);
    }
  }
  const chains = Array.from(chainMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return { quests, chains };
}

function transformUpgrades(
  rawModules: RawHideoutModule[],
  fallbackUpgrades: UpgradePack[]
): UpgradePack[] {
  const fallbackMap = new Map(fallbackUpgrades.map((upgrade) => [upgrade.id, upgrade]));
  const transformed: UpgradePack[] = [];

  for (const module of rawModules) {
    const benchNameRaw = englishText(module.name, module.id ?? '');
    const benchName = benchNameRaw || module.id || 'Workbench';
    const benchSlug = slugify(benchName) || slugify(module.id ?? '') || 'bench';

    (module.levels ?? []).forEach((level, index) => {
      const levelNumber = asNumber(level.level, index + 1) || index + 1;
      const upgradeId = `upgrade-${benchSlug}-level-${levelNumber}`;

      const requirementEntries: UpgradePack['items'] = (
        Array.isArray(level.requirementItemIds) ? level.requirementItemIds : []
      )
        .map((req) => {
          const itemId = toItemId(req.itemId ?? '');
          if (!itemId) return null;
          return { itemId, qty: asNumber(req.quantity ?? req.qty, 1) };
        })
        .filter((value): value is UpgradePack['items'][number] => Boolean(value));

      const base = fallbackMap.get(upgradeId);

      const upgrade: UpgradePack = {
        id: upgradeId,
        name: `${benchName} · Level ${levelNumber}`,
        bench: benchName,
        level: levelNumber,
        items: requirementEntries.length > 0 ? requirementEntries : base?.items ?? []
      };

      transformed.push(upgrade);
      fallbackMap.delete(upgradeId);
    });
  }

  for (const leftover of fallbackMap.values()) {
    transformed.push(leftover);
  }

  transformed.sort((a, b) => {
    if (a.bench === b.bench) {
      return (a.level ?? 0) - (b.level ?? 0);
    }
    return a.bench.localeCompare(b.bench);
  });

  return transformed;
}

function transformProjects(rawProjects: RawProject[], fallbackProjects: Project[]): Project[] {
  const fallbackMap = new Map(fallbackProjects.map((project) => [project.id, project]));
  const transformed: Project[] = [];

  for (const project of rawProjects) {
    const rawId = project.id ?? englishText(project.name, 'project');
    const slug = slugify(rawId) || 'project';
    const projectId =
      project.id && project.id.startsWith('project-') ? project.id : `project-${slug}`;

    const base = fallbackMap.get(projectId);
    const name = englishText(project.name, base?.name ?? projectId);
    const descriptionValue = englishText(project.description, base?.description ?? null);
    const description = descriptionValue ? descriptionValue : base?.description ?? null;

    const phases = (project.phases ?? []).map((phase, index) => {
      const order = asNumber(phase.phase, index + 1) || index + 1;
      const phaseId = `${projectId}-phase-${order}`;
      const requirements: ProjectRequirementEntry[] = (
        Array.isArray(phase.requirementItemIds) ? phase.requirementItemIds : []
      )
        .map((req) => {
          const itemId = toItemId(req.itemId ?? '');
          if (!itemId) return null;
          return { itemId, qty: asNumber(req.quantity ?? req.qty, 1) };
        })
        .filter((value): value is ProjectRequirementEntry => Boolean(value));

      return {
        id: phaseId,
        order,
        name: englishText(phase.name, `Phase ${order}`),
        description: englishText(phase.description, null) || null,
        requirements
      };
    });

    const projectRecord: Project = {
      id: projectId,
      name,
      description,
      phases: phases.length > 0 ? phases : base?.phases ?? []
    };

    transformed.push(projectRecord);
    fallbackMap.delete(projectId);
  }

  for (const leftover of fallbackMap.values()) {
    transformed.push(leftover);
  }

  transformed.sort((a, b) => a.name.localeCompare(b.name));
  return transformed;
}

export interface CanonicalDataset {
  items: ItemRecord[];
  quests: Quest[];
  upgrades: UpgradePack[];
  projects: Project[];
  vendors: Vendor[];
  chains: QuestChain[];
}

export interface RawDataset {
  items: RawItem[];
  quests: RawQuest[];
  modules: RawHideoutModule[];
  projects: RawProject[];
}

export interface FallbackDataset {
  items?: ItemRecord[];
  quests?: Quest[];
  upgrades?: UpgradePack[];
  projects?: Project[];
  vendors?: Vendor[];
  chains?: QuestChain[];
}

export interface BuildOptions {
  include?: Partial<Record<keyof CanonicalDataset, boolean>>;
}

export interface LoadCanonicalOptions extends BuildOptions {
  basePath?: string;
}

async function fetchJson<T>(fetchFn: typeof fetch, url: string, fallback: T): Promise<T> {
  try {
    const response = await fetchFn(url);
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function buildCanonicalDataset(
  raw: RawDataset,
  fallback: FallbackDataset = {},
  options: BuildOptions = {}
): Promise<CanonicalDataset> {
  const defaultInclude = {
    items: true,
    quests: true,
    upgrades: true,
    projects: true,
    vendors: true,
    chains: true
  } as const;
  const include = { ...defaultInclude, ...options.include };

  const fallbackItems = fallback.items ?? [];
  const fallbackQuests = fallback.quests ?? [];
  const fallbackUpgrades = fallback.upgrades ?? [];
  const fallbackProjects = fallback.projects ?? [];
  const fallbackVendors = fallback.vendors ?? [];
  const fallbackChains = fallback.chains ?? [];

  const rawItems = raw.items ?? [];
  const rawQuests = raw.quests ?? [];
  const rawModules = raw.modules ?? [];
  const rawProjects = raw.projects ?? [];

  const dataset: CanonicalDataset = {
    items: [],
    quests: [],
    upgrades: [],
    projects: [],
    vendors: [],
    chains: []
  };

  const resolverForItems = createItemNameResolver(rawItems, fallbackItems);
  dataset.items = include.items
    ? await transformItems(rawItems, fallbackItems, resolverForItems)
    : fallbackItems;

  const questResolver = createItemNameResolver(rawItems, dataset.items);

  if (include.quests || include.chains) {
    const { quests, chains } = transformQuests(
      rawQuests,
      fallbackQuests,
      fallbackChains,
      questResolver
    );
    dataset.quests = include.quests ? quests : fallbackQuests;
    dataset.chains = include.chains ? chains : fallbackChains;
  } else {
    dataset.quests = fallbackQuests;
    dataset.chains = fallbackChains;
  }

  dataset.upgrades = include.upgrades
    ? transformUpgrades(rawModules, fallbackUpgrades)
    : fallbackUpgrades;

  dataset.projects = include.projects
    ? transformProjects(rawProjects, fallbackProjects)
    : fallbackProjects;

  dataset.vendors = include.vendors ? fallbackVendors : [];

  return dataset;
}

export async function loadCanonicalData(
  fetchFn: typeof fetch,
  options: LoadCanonicalOptions = {}
): Promise<CanonicalDataset> {
  const defaultInclude = {
    items: true,
    quests: true,
    upgrades: true,
    projects: true,
    vendors: true,
    chains: true
  } as const;
  const include = { ...defaultInclude, ...options.include };
  const basePath = options.basePath ?? '';
  const withBase = (segment: string) => `${basePath}${segment}`;

  const needRawItems = include.items || include.quests || include.upgrades || include.projects;

  const rawItemsPromise = needRawItems
    ? fetchJson<RawItem[]>(fetchFn, withBase('/data/raw/items.json'), [])
    : Promise.resolve<RawItem[]>([]);

  const rawQuestsPromise = include.quests || include.chains
    ? fetchJson<RawQuest[]>(fetchFn, withBase('/data/raw/quests.json'), [])
    : Promise.resolve<RawQuest[]>([]);

  const rawModulesPromise = include.upgrades
    ? fetchJson<RawHideoutModule[]>(fetchFn, withBase('/data/raw/hideoutModules.json'), [])
    : Promise.resolve<RawHideoutModule[]>([]);

  const rawProjectsPromise = include.projects
    ? fetchJson<RawProject[]>(fetchFn, withBase('/data/raw/projects.json'), [])
    : Promise.resolve<RawProject[]>([]);

  const fallbackItemsPromise = include.items || include.quests || include.upgrades
    ? fetchJson<ItemRecord[]>(fetchFn, withBase('/data/items.json'), [])
    : Promise.resolve<ItemRecord[]>([]);

  const fallbackQuestsPromise = include.quests || include.chains
    ? fetchJson<Quest[]>(fetchFn, withBase('/data/quests.json'), [])
    : Promise.resolve<Quest[]>([]);

  const fallbackUpgradesPromise = include.upgrades
    ? fetchJson<UpgradePack[]>(fetchFn, withBase('/data/workbench-upgrades.json'), [])
    : Promise.resolve<UpgradePack[]>([]);

  const fallbackProjectsPromise = include.projects
    ? fetchJson<Project[]>(fetchFn, withBase('/data/projects.json'), [])
    : Promise.resolve<Project[]>([]);

  const fallbackVendorsPromise = include.vendors
    ? fetchJson<Vendor[]>(fetchFn, withBase('/data/vendors.json'), [])
    : Promise.resolve<Vendor[]>([]);

  const fallbackChainsPromise = include.quests || include.chains
    ? fetchJson<QuestChain[]>(fetchFn, withBase('/data/chains.json'), [])
    : Promise.resolve<QuestChain[]>([]);

  const [
    rawItems,
    rawQuests,
    rawModules,
    rawProjects,
    fallbackItems,
    fallbackQuests,
    fallbackUpgrades,
    fallbackProjects,
    fallbackVendors,
    fallbackChains
  ] = await Promise.all([
    rawItemsPromise,
    rawQuestsPromise,
    rawModulesPromise,
    rawProjectsPromise,
    fallbackItemsPromise,
    fallbackQuestsPromise,
    fallbackUpgradesPromise,
    fallbackProjectsPromise,
    fallbackVendorsPromise,
    fallbackChainsPromise
  ]);

  return buildCanonicalDataset(
    { items: rawItems, quests: rawQuests, modules: rawModules, projects: rawProjects },
    {
      items: fallbackItems,
      quests: fallbackQuests,
      upgrades: fallbackUpgrades,
      projects: fallbackProjects,
      vendors: fallbackVendors,
      chains: fallbackChains
    },
    { include }
  );
}

export async function readPipelineMeta(): Promise<PipelineMeta> {
  const raw = await fs.readFile(metaPath, 'utf8');
  return JSON.parse(raw) as PipelineMeta;
}

export async function readStageRecords(pass: string) {
  const dir = path.join(stagingDir, pass.toLowerCase());
  const files = await fs.readdir(dir).catch(() => []);
  const batches = [];
  for (const file of files.filter((item) => item.endsWith('.json'))) {
    const full = path.join(dir, file);
    const content = await fs.readFile(full, 'utf8');
    const records = JSON.parse(content);
    batches.push({
      file,
      count: Array.isArray(records) ? records.length : 0,
      records: Array.isArray(records) ? records : []
    });
  }
  return batches;
}

export async function listStageBatches(pass: string) {
  const batches = await readStageRecords(pass);
  return batches.map(({ file, count }) => ({ file, count }));
}

export async function executePass(pass: string, options: { approve?: boolean } = {}) {
  const script = scriptMap[pass.toUpperCase()];
  if (!script) {
    throw new Error(`Unsupported pass: ${pass}`);
  }
  const scriptPath = path.join(projectRoot, 'scripts', 'import', script);
  const args = [scriptPath];
  if (options.approve) {
    args.push('--approve');
  }
  const { stdout, stderr } = await execFileAsync('node', args, { cwd: projectRoot });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function updateApproval(pass: string, approved: boolean) {
  const meta = await readPipelineMeta();
  const key = pass.toUpperCase();
  if (!meta.passes[key]) {
    throw new Error(`Unknown pass: ${pass}`);
  }
  meta.passes[key] = {
    ...meta.passes[key],
    approved,
    lastRunAt: new Date().toISOString()
  };
  meta.generatedAt = new Date().toISOString();
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  return meta.passes[key];
}
