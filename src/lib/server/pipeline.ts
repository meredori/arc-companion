import { execFile } from 'node:child_process';
import { readdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import type {
  ItemCraftRequirement,
  ItemRecord,
  ItemRecycleEntry,
  Project,
  Quest,
  QuestChain,
  UpgradePack,
  PipelineMeta
} from '$lib/types';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const dataDir = path.join(projectRoot, 'static', 'data');
const metaPath = path.join(dataDir, 'meta', 'index.json');
const stagingDir = path.join(dataDir, '_staging');

// Pass E (conflict resolution) runs through the finalize script alongside pass F.
const scriptMap: Record<string, string> = {
  A: 'wiki-loot.mjs',
  B: 'wiki-item.mjs',
  C: 'metaforge.mjs',
  D: 'quests.mjs',
  E: 'finalize.mjs',
  F: 'finalize.mjs'
};

export async function readPipelineMeta(): Promise<PipelineMeta> {
  const raw = await fs.readFile(metaPath, 'utf8');
  return JSON.parse(raw) as PipelineMeta;
}

export async function readStageRecords(pass: string) {
  const dir = path.join(stagingDir, pass.toLowerCase());
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const batches: Array<{ file: string; count: number; records: unknown[] }> = [];
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

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const englishText = (value: unknown, fallback: string | null = null): string => {
  if (!value) return fallback ?? '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'en' in value) {
    const candidate = (value as { en?: unknown }).en;
    if (typeof candidate === 'string') {
      return candidate;
    }
  }
  return fallback ?? '';
};

const toItemId = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (lower.startsWith('item-')) return lower;
  const cleaned = lower.replace(/^item[_-]/, '');
  return `item-${slugify(cleaned.replace(/_/g, '-'))}`;
};

const localImageNames: Set<string> = (() => {
  try {
    const imagesDir = path.join(process.cwd(), 'static', 'images', 'items');
    return new Set(readdirSync(imagesDir));
  } catch (error) {
    console.warn('[pipeline] Unable to read static/images/items:', error);
    return new Set();
  }
})();

const resolveImageUrl = (source: string | null | undefined): string | null => {
  if (!source) return null;
  const filename = path.basename(source);
  if (localImageNames.has(filename)) {
    return `/images/items/${filename}`;
  }
  return source;
};

interface RawItem {
  id: string;
  name?: Record<string, string> | string;
  description?: Record<string, string> | string;
  type?: string;
  rarity?: string;
  value?: number;
  recyclesInto?: Record<string, number>;
  recyleInto?: Record<string, number>;
  salvagesInto?: Record<string, number>;
  recipe?: Record<string, number>;
  craftMaterials?: Record<string, number>;
  crafting?: Record<string, number>;
  imageFilename?: string;
}

interface RawQuest {
  id: string;
  name?: Record<string, string> | string;
  trader?: string;
  description?: Record<string, string> | string;
  objectives?: Array<Record<string, string> | string>;
  requiredItemIds?: Array<{ itemId?: string; quantity?: number; qty?: number }>;
  rewardItemIds?: Array<{ itemId?: string; quantity?: number; qty?: number }>;
  xp?: number | string;
  previousQuestIds?: string[];
  nextQuestIds?: string[];
}

interface RawModuleLevel {
  level?: number;
  requirementItemIds?: Array<{ itemId?: string; quantity?: number; qty?: number }>;
}

interface RawModule {
  id: string;
  name?: Record<string, string> | string;
  levels?: RawModuleLevel[];
}

interface RawProjectPhase {
  phase?: number;
  name?: Record<string, string> | string;
  description?: Record<string, string> | string;
  requirementItemIds?: Array<{ itemId?: string; quantity?: number; qty?: number }>;
}

interface RawProject {
  id: string;
  name?: Record<string, string> | string;
  description?: Record<string, string> | string;
  phases?: RawProjectPhase[];
}

const buildItemNameLookup = (rawItems: RawItem[], normalizedItems: ItemRecord[]): Map<string, string> => {
  const lookup = new Map<string, string>();
  for (const item of rawItems) {
    const name = englishText(item.name, item.id);
    lookup.set(item.id, name);
    lookup.set(item.id.replace(/^item[_-]/, ''), name);
    const canonicalId = toItemId(item.id);
    if (canonicalId) {
      lookup.set(canonicalId, name);
    }
  }
  for (const item of normalizedItems) {
    lookup.set(item.id, item.name);
    lookup.set(item.id.replace(/^item[_-]/, ''), item.name);
  }
  return lookup;
};

const convertRecipeEntries = (
  recipe: Record<string, number> | undefined,
  lookup: Map<string, string>
): ItemCraftRequirement[] => {
  if (!recipe) return [];
  return Object.entries(recipe)
    .map(([rawId, qty]) => {
      const itemId = toItemId(rawId);
      if (!itemId) return null;
      const name = lookup.get(rawId) ?? lookup.get(itemId) ?? lookup.get(rawId.replace(/^item[_-]/, '')) ?? rawId;
      return {
        itemId,
        name,
        qty: Number.isFinite(qty) ? Number(qty) : 1
      } satisfies ItemCraftRequirement;
    })
    .filter((entry): entry is ItemCraftRequirement => entry !== null);
};

const convertRecycleEntries = (
  source: Record<string, number> | undefined,
  lookup: Map<string, string>
): ItemRecycleEntry[] => {
  if (!source) return [];
  return Object.entries(source)
    .map(([rawId, qty]) => {
      const itemId = toItemId(rawId);
      if (!itemId) return null;
      const stripped = rawId.replace(/^item[_-]/, '');
      const name = lookup.get(rawId) ?? lookup.get(itemId) ?? lookup.get(stripped) ?? rawId;
      return {
        itemId,
        name,
        qty: Number.isFinite(qty) ? Number(qty) : 1
      } satisfies ItemRecycleEntry;
    })
    .filter((entry): entry is ItemRecycleEntry => entry !== null);
};

export const normalizeItems = (rawItems: RawItem[]): ItemRecord[] => {
  const provisionalItems: ItemRecord[] = [];

  for (const raw of rawItems) {
    const itemId = toItemId(raw.id);
    if (!itemId) continue;
    const englishName = englishText(raw.name, raw.id);
    const slug = slugify(raw.id.replace(/_/g, '-')) || slugify(englishName) || englishName;

    provisionalItems.push({
      id: itemId,
      name: englishName,
      slug,
      rarity: raw.rarity ?? null,
      category: raw.type ?? null,
      sell: typeof raw.value === 'number' ? raw.value : 0,
      recycle: [],
      craftsFrom: [],
      craftsInto: [],
      notes: englishText(raw.description)?.trim() || null,
      imageUrl: resolveImageUrl(raw.imageFilename)
    });
  }

  const nameLookup = buildItemNameLookup(rawItems, provisionalItems);
  const normalizedMap = new Map<string, ItemRecord>();

  for (const raw of rawItems) {
    const itemId = toItemId(raw.id);
    if (!itemId) continue;
    const englishName = englishText(raw.name, raw.id);
    const slug = slugify(raw.id.replace(/_/g, '-')) || slugify(englishName) || englishName;
    const recycleSource = raw.recyclesInto ?? raw.recyleInto ?? raw.salvagesInto;
    const craftsRecipe = raw.recipe ?? raw.craftMaterials ?? raw.crafting;
    const notes = englishText(raw.description)?.trim();
    const craftsEntries = convertRecipeEntries(craftsRecipe, nameLookup);

    const record: ItemRecord = {
      id: itemId,
      name: englishName,
      slug,
      rarity: raw.rarity ?? null,
      category: raw.type ?? null,
      imageUrl: resolveImageUrl(raw.imageFilename),
      sell: typeof raw.value === 'number' ? raw.value : 0,
      recycle: convertRecycleEntries(recycleSource, nameLookup),
      craftsFrom: craftsEntries,
      craftsInto: [],
      notes: notes || null
    };

    normalizedMap.set(itemId, record);
  }

  const normalized = Array.from(normalizedMap.values());

  const craftsIntoMap = new Map<string, { productId: string; productName: string }[]>();
  for (const item of normalized) {
    for (const requirement of item.craftsFrom ?? []) {
      const list = craftsIntoMap.get(requirement.itemId) ?? [];
      if (!list.some((entry) => entry.productId === item.id)) {
        list.push({ productId: item.id, productName: item.name });
      }
      craftsIntoMap.set(requirement.itemId, list);
    }
  }

  for (const item of normalized) {
    item.craftsInto = (craftsIntoMap.get(item.id) ?? []).map((entry) => ({
      productId: entry.productId,
      productName: entry.productName
    }));
  }

  normalized.sort((a, b) => a.name.localeCompare(b.name));
  return normalized;
};

const canonicalQuestId = (value: string | undefined | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('quest-')) return lower;
  return `quest-${slugify(trimmed)}`;
};

interface QuestNormalizationResult {
  quests: Quest[];
  chains: QuestChain[];
}

interface NormalizeQuestOptions {
  itemNameLookup?: Map<string, string>;
  items?: ItemRecord[];
  rawItems?: RawItem[];
}

export const normalizeQuests = (
  rawQuests: RawQuest[],
  options: NormalizeQuestOptions = {}
): QuestNormalizationResult => {
  const itemNameLookup =
    options.itemNameLookup ?? buildItemNameLookup(options.rawItems ?? [], options.items ?? []);

  const questEntries = rawQuests
    .map((quest) => ({ quest, questId: canonicalQuestId(quest.id) }))
    .filter((entry): entry is { quest: RawQuest; questId: string } => Boolean(entry.questId));

  const questGraph = new Map<string, { prev: Set<string>; next: Set<string> }>();
  for (const { questId } of questEntries) {
    questGraph.set(questId, { prev: new Set(), next: new Set() });
  }

  const normalizeGraphId = (rawId: string | undefined): string | null => {
    const canonical = canonicalQuestId(rawId ?? null);
    if (!canonical) return null;
    return questGraph.has(canonical) ? canonical : null;
  };

  for (const { quest, questId } of questEntries) {
    const prevIds = Array.isArray(quest.previousQuestIds) ? quest.previousQuestIds : [];
    for (const prev of prevIds) {
      const mapped = normalizeGraphId(prev);
      if (!mapped) continue;
      questGraph.get(questId)?.prev.add(mapped);
      questGraph.get(mapped)?.next.add(questId);
    }

    const nextIds = Array.isArray(quest.nextQuestIds) ? quest.nextQuestIds : [];
    for (const next of nextIds) {
      const mapped = normalizeGraphId(next);
      if (!mapped) continue;
      questGraph.get(questId)?.next.add(mapped);
      questGraph.get(mapped)?.prev.add(questId);
    }
  }

  const deriveQuestChains = (): {
    chains: QuestChain[];
    chainAssignments: Map<string, { chainId: string; chainName: string }>;
    stageByQuestId: Map<string, number | null>;
  } => {
    const visited = new Set<string>();
    const questIds = Array.from(questGraph.keys()).sort();
    const usedChainIds = new Set<string>();
    const chainAssignments = new Map<string, { chainId: string; chainName: string }>();
    const stageByQuestId = new Map<string, number | null>();
    const chains: QuestChain[] = [];

    for (const startId of questIds) {
      if (visited.has(startId)) continue;
      const component = new Set<string>();
      const stack = [startId];

      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) continue;
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
      const seed = componentIds
        .filter((id) => (inDegree.get(id) ?? 0) === 0)
        .sort((a, b) => {
          const nameA = englishText(
            questEntries.find((entry) => entry.questId === a)?.quest.name,
            a
          );
          const nameB = englishText(
            questEntries.find((entry) => entry.questId === b)?.quest.name,
            b
          );
          return nameA.localeCompare(nameB);
        });

      for (const id of seed) {
        stageMap.set(id, 0);
      }
      const queue = [...seed];
      const sortQueue = () => {
        queue.sort((a, b) => {
          const stageA = stageMap.get(a) ?? 0;
          const stageB = stageMap.get(b) ?? 0;
          if (stageA !== stageB) return stageA - stageB;
          const nameA = englishText(
            questEntries.find((entry) => entry.questId === a)?.quest.name,
            a
          );
          const nameB = englishText(
            questEntries.find((entry) => entry.questId === b)?.quest.name,
            b
          );
          return nameA.localeCompare(nameB);
        });
      };

      sortQueue();

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
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
        if (!stageMap.has(id)) stageMap.set(id, 0);
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
          const nameA = englishText(
            questEntries.find((entry) => entry.questId === a)?.quest.name,
            a
          );
          const nameB = englishText(
            questEntries.find((entry) => entry.questId === b)?.quest.name,
            b
          );
          return nameA.localeCompare(nameB);
        });

      const fallbackRoot = [...componentIds].sort((a, b) => a.localeCompare(b))[0];
      const primaryRoot = roots[0] ?? fallbackRoot;
      const rootQuest = questEntries.find((entry) => entry.questId === primaryRoot)?.quest;
      const baseName = englishText(rootQuest?.trader, null) || englishText(rootQuest?.name, primaryRoot) || primaryRoot;
      const baseSlug = slugify(baseName) || slugify(primaryRoot);
      let chainId = `chain-${baseSlug || 'questline'}`;
      let suffix = 1;
      while (usedChainIds.has(chainId)) {
        suffix += 1;
        chainId = `chain-${baseSlug || 'questline'}-${suffix}`;
      }
      usedChainIds.add(chainId);

      const chainName = baseName;
      const stageRecords = componentIds
        .map((id) => ({
          id,
          stage: stageMap.get(id) ?? 0,
          name: englishText(questEntries.find((entry) => entry.questId === id)?.quest.name, id)
        }))
        .sort((a, b) => {
          if (a.stage !== b.stage) return a.stage - b.stage;
          return a.name.localeCompare(b.name);
        });

      chains.push({
        id: chainId,
        name: chainName,
        stages: stageRecords.map((record) => record.id)
      });

      for (const record of stageRecords) {
        chainAssignments.set(record.id, { chainId, chainName });
        stageByQuestId.set(record.id, record.stage);
      }
    }

    chains.sort((a, b) => a.name.localeCompare(b.name));
    return { chains, chainAssignments, stageByQuestId };
  };

  const { chains, chainAssignments, stageByQuestId } = deriveQuestChains();

  const quests: Quest[] = [];

  for (const { quest, questId } of questEntries) {
    const rewards: Quest['rewards'] = [];

    if (Array.isArray(quest.rewardItemIds)) {
      for (const reward of quest.rewardItemIds) {
        const itemId = toItemId(reward.itemId ?? null);
        if (!itemId) continue;
        const qty = Number.isFinite(reward.quantity) ? Number(reward.quantity) : Number(reward.qty) || 1;
        rewards.push({
          itemId,
          name: itemNameLookup.get(itemId) ?? itemNameLookup.get(reward.itemId ?? '') ?? reward.itemId ?? itemId,
          qty
        });
      }
    }

    const xpValue = Number(quest.xp);
    if (!Number.isNaN(xpValue) && xpValue > 0) {
      rewards.push({ coins: xpValue });
    }

    const objectives = Array.isArray(quest.objectives)
      ? quest.objectives.map((objective) => englishText(objective)).filter(Boolean)
      : [];

    const items = Array.isArray(quest.requiredItemIds)
      ? quest.requiredItemIds
          .map((req) => {
            const itemId = toItemId(req.itemId ?? null);
            if (!itemId) return null;
            return {
              itemId,
              qty: Number.isFinite(req.quantity) ? Number(req.quantity) : Number(req.qty) || 1
            };
          })
          .filter((entry): entry is { itemId: string; qty: number } => entry !== null)
      : [];

    quests.push({
      id: questId,
      name: englishText(quest.name, questId),
      chainId: chainAssignments.get(questId)?.chainId,
      chainStage: stageByQuestId.get(questId) ?? null,
      giver: quest.trader ?? null,
      items,
      rewards,
      mapHints: objectives,
      previousQuestIds: Array.isArray(quest.previousQuestIds)
        ? quest.previousQuestIds
            .map((value) => canonicalQuestId(value))
            .filter((value): value is string => Boolean(value))
        : [],
      nextQuestIds: Array.isArray(quest.nextQuestIds)
        ? quest.nextQuestIds
            .map((value) => canonicalQuestId(value))
            .filter((value): value is string => Boolean(value))
        : []
    });
  }

  quests.sort((a, b) => a.name.localeCompare(b.name));

  return { quests, chains };
};

export const normalizeUpgrades = (rawModules: RawModule[]): UpgradePack[] => {
  const modules: UpgradePack[] = [];

  for (const module of rawModules) {
    const benchName = englishText(module.name, module.id);
    const benchSlug = slugify(benchName);

    for (const level of module.levels ?? []) {
      const upgradeId = `upgrade-${benchSlug}-level-${level.level ?? 0}`;
      const items = Array.isArray(level.requirementItemIds)
        ? level.requirementItemIds
            .map((req) => {
              const itemId = toItemId(req.itemId ?? null);
              if (!itemId) return null;
              return {
                itemId,
                qty: Number.isFinite(req.quantity) ? Number(req.quantity) : Number(req.qty) || 1
              };
            })
            .filter((entry): entry is { itemId: string; qty: number } => entry !== null)
        : [];

      modules.push({
        id: upgradeId,
        name: `${benchName} · Level ${level.level ?? 0}`,
        bench: benchName,
        level: level.level ?? 0,
        items
      });
    }
  }

  modules.sort((a, b) => {
    if (a.bench === b.bench) {
      return (a.level ?? 0) - (b.level ?? 0);
    }
    return a.bench.localeCompare(b.bench);
  });

  return modules;
};

export const normalizeProjects = (rawProjects: RawProject[]): Project[] => {
  const projects: Project[] = [];

  for (const project of rawProjects ?? []) {
    const projectId = project.id?.startsWith('project-') ? project.id : `project-${slugify(project.id)}`;
    const normalizedPhases = (project.phases ?? []).map((phase, index) => {
      const phaseOrder = Number.isFinite(phase.phase) ? Number(phase.phase) : index + 1;
      const phaseId = `${projectId}-phase-${phaseOrder}`;
      return {
        id: phaseId,
        order: phaseOrder,
        name: englishText(phase.name, `Phase ${phaseOrder}`),
        description: englishText(phase.description, null) || null,
        requirements: (phase.requirementItemIds ?? [])
          .map((req) => {
            const itemId = toItemId(req.itemId ?? null);
            if (!itemId) return null;
            return {
              itemId,
              qty: Number.isFinite(req.quantity) ? Number(req.quantity) : Number(req.qty) || 1
            };
          })
          .filter((entry): entry is { itemId: string; qty: number } => entry !== null)
      };
    });

    projects.push({
      id: projectId,
      name: englishText(project.name, projectId),
      description: englishText(project.description, null) || null,
      phases: normalizedPhases
    });
  }

  projects.sort((a, b) => a.name.localeCompare(b.name));
  return projects;
};

export interface PipelineRequest {
  items?: boolean;
  quests?: boolean;
  chains?: boolean;
  upgrades?: boolean;
  projects?: boolean;
}

export interface PipelineResult {
  items?: ItemRecord[];
  quests?: Quest[];
  chains?: QuestChain[];
  workbenchUpgrades?: UpgradePack[];
  projects?: Project[];
}

export const loadCanonicalData = async (
  fetchFn: typeof fetch,
  request: PipelineRequest,
  basePath = ''
): Promise<PipelineResult> => {
  const includeItems = request.items || request.quests || request.chains || false;
  const includeQuests = request.quests || request.chains || false;
  const includeUpgrades = request.upgrades ?? false;
  const includeProjects = request.projects ?? false;

  const [rawItems, rawQuests, rawModules, rawProjects] = await Promise.all([
    includeItems
      ? fetchFn(`${basePath}/data/raw/items.json`).then((res) => res.json() as Promise<RawItem[]>)
      : Promise.resolve<RawItem[] | null>(null),
    includeQuests
      ? fetchFn(`${basePath}/data/raw/quests.json`).then((res) => res.json() as Promise<RawQuest[]>)
      : Promise.resolve<RawQuest[] | null>(null),
    includeUpgrades
      ? fetchFn(`${basePath}/data/raw/hideout-modules.json`).then((res) => res.json() as Promise<RawModule[]>)
      : Promise.resolve<RawModule[] | null>(null),
    includeProjects
      ? fetchFn(`${basePath}/data/raw/projects.json`).then((res) => res.json() as Promise<RawProject[]>)
      : Promise.resolve<RawProject[] | null>(null)
  ]);

  const result: PipelineResult = {};

  let items: ItemRecord[] | undefined;
  if (includeItems && rawItems) {
    items = normalizeItems(rawItems);
    if (request.items) {
      result.items = items;
    }
  }

  if (includeQuests && rawQuests) {
    const { quests, chains } = normalizeQuests(rawQuests, {
      rawItems: rawItems ?? undefined,
      items: items ?? []
    });
    if (request.quests) {
      result.quests = quests;
    }
    if (request.chains || request.quests) {
      result.chains = chains;
    }
  }

  if (includeUpgrades && rawModules) {
    result.workbenchUpgrades = normalizeUpgrades(rawModules);
  }

  if (includeProjects && rawProjects) {
    result.projects = normalizeProjects(rawProjects);
  }

  return result;
};
