import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');
const tempDir = path.join(root, 'temp');
const staticDir = path.join(root, 'static', 'data');
const imagesDir = path.join(root, 'static', 'images', 'items');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const englishText = (value, fallback = '') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.en ?? fallback ?? '';
};

const toItemId = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('item-')) return raw.toLowerCase();
  const cleaned = raw.replace(/^item[_-]/, '');
  return `item-${slugify(cleaned.replace(/_/g, '-'))}`;
};

const readJson = async (...segments) =>
  JSON.parse(await fs.readFile(path.join(...segments), 'utf-8'));

const writeJson = async (filePath, data) =>
  fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);

const localImageNames = new Set(await fs.readdir(imagesDir));
const imageFor = (source) => {
  if (!source) return undefined;
  const filename = path.basename(source);
  if (localImageNames.has(filename)) {
    return `/images/items/${filename}`;
  }
  return source;
};

const tempItems = await readJson(tempDir, 'items.json');
const tempQuests = await readJson(tempDir, 'quests.json');
const tempModules = await readJson(tempDir, 'hideoutModules.json');
const tempProjects = await readJson(tempDir, 'projects.json').catch(() => []);

const existingItemsPath = path.join(staticDir, 'items.json');
const existingQuestsPath = path.join(staticDir, 'quests.json');
const existingChainsPath = path.join(staticDir, 'chains.json');
const existingUpgradesPath = path.join(staticDir, 'workbench-upgrades.json');
const existingProjectsPath = path.join(staticDir, 'projects.json');

const existingItems = await readJson(existingItemsPath);
const existingItemMap = new Map(existingItems.map((item) => [item.id, item]));

const tempItemNameLookup = new Map();
tempItems.forEach((item) => {
  tempItemNameLookup.set(item.id, englishText(item.name, item.id));
});

const convertRecycleList = (entry) => {
  const recycleMap = entry.recyclesInto ?? entry.salvagesInto;
  if (!recycleMap || Object.keys(recycleMap).length === 0) {
    return [];
  }
  return Object.entries(recycleMap).map(([rawId, qty]) => {
    const convertedId = toItemId(rawId);
    const rawKey = rawId.replace(/^item[_-]/, '');
    return {
      itemId: convertedId,
      name: tempItemNameLookup.get(rawId) ?? tempItemNameLookup.get(rawKey) ?? rawId,
      qty
    };
  });
};

const mergedItemMap = new Map(existingItemMap);

for (const entry of tempItems) {
  const itemId = toItemId(entry.id);
  const englishName = englishText(entry.name, entry.id);
  const slug = slugify(entry.id.replace(/_/g, '-')) || slugify(englishName);
  const base = mergedItemMap.get(itemId) ?? {
    id: itemId,
    name: englishName,
    slug,
    rarity: null,
    category: null,
    sell: 0,
    recycle: [],
    sources: [],
    vendors: [],
    craftsFrom: [],
    craftsInto: [],
    needsTotals: { quests: 0, workshop: 0 },
    wikiUrl: null,
    notes: null,
    metaforgeId: null,
    zones: [],
    provenance: { wiki: false, api: true }
  };

  const updated = { ...base };
  updated.name = englishName;
  updated.slug = slug;
  if (entry.rarity) updated.rarity = entry.rarity;
  if (entry.type) updated.category = entry.type;
  if (typeof entry.value === 'number') updated.sell = entry.value;
  const description = englishText(entry.description)?.trim();
  if (description) {
    updated.notes = description;
  }
  const image = imageFor(entry.imageFilename);
  if (image) {
    updated.imageUrl = image;
  }
  const recycle = convertRecycleList(entry);
  if (recycle.length > 0) {
    updated.recycle = recycle;
  } else if (!updated.recycle) {
    updated.recycle = [];
  }
  if (!updated.needsTotals) {
    updated.needsTotals = { quests: 0, workshop: 0 };
  }
  if (!updated.provenance) {
    updated.provenance = { wiki: false, api: true };
  } else {
    updated.provenance = { ...updated.provenance, api: true };
  }
  mergedItemMap.set(itemId, updated);
}

const mergedItems = Array.from(mergedItemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
await writeJson(existingItemsPath, mergedItems);

const getItemName = (rawId) => {
  const converted = toItemId(rawId);
  const existing = mergedItemMap.get(converted);
  if (existing) return existing.name;
  const stripped = rawId.replace(/^item[_-]/, '');
  return tempItemNameLookup.get(stripped) ?? tempItemNameLookup.get(rawId) ?? rawId;
};

const existingQuests = await readJson(existingQuestsPath);
const existingQuestMap = new Map(existingQuests.map((quest) => [quest.id, quest]));
const canonicalQuestId = (value) => {
  if (!value) return null;
  if (value.startsWith('quest-')) return value.toLowerCase();
  return `quest-${slugify(value)}`;
};

const tempQuestEntries = tempQuests.map((quest) => {
  const questId = canonicalQuestId(quest.id);
  return { quest, questId };
});

const tempQuestLookup = new Map(tempQuestEntries.map(({ questId, quest }) => [questId, quest]));

const questGraph = new Map(
  tempQuestEntries
    .filter(({ questId }) => Boolean(questId))
    .map(({ questId }) => [questId, { prev: new Set(), next: new Set() }])
);

const normalizeQuestId = (rawId) => {
  const canonical = canonicalQuestId(rawId);
  return questGraph.has(canonical) ? canonical : null;
};

for (const { questId, quest } of tempQuestEntries) {
  if (!questId || !questGraph.has(questId)) continue;
  const prevIds = Array.isArray(quest.previousQuestIds) ? quest.previousQuestIds : [];
  for (const prev of prevIds) {
    const mapped = normalizeQuestId(prev);
    if (!mapped) continue;
    questGraph.get(questId).prev.add(mapped);
    questGraph.get(mapped).next.add(questId);
  }
  const nextIds = Array.isArray(quest.nextQuestIds) ? quest.nextQuestIds : [];
  for (const next of nextIds) {
    const mapped = normalizeQuestId(next);
    if (!mapped) continue;
    questGraph.get(questId).next.add(mapped);
    questGraph.get(mapped).prev.add(questId);
  }
}

const deriveQuestChains = () => {
  const visited = new Set();
  const questIds = Array.from(questGraph.keys()).sort();
  const usedChainIds = new Set();
  const chainAssignments = new Map();
  const stageByQuestId = new Map();
  const chains = [];

  for (const startId of questIds) {
    if (visited.has(startId)) continue;
    const component = new Set();
    const stack = [startId];

    while (stack.length > 0) {
      const current = stack.pop();
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
    const inDegree = new Map();
    for (const id of componentIds) {
      let degree = 0;
      for (const prev of questGraph.get(id)?.prev ?? []) {
        if (componentSet.has(prev)) degree += 1;
      }
      inDegree.set(id, degree);
    }

    const stageMap = new Map();
    const seed = componentIds
      .filter((id) => (inDegree.get(id) ?? 0) === 0)
      .sort((a, b) => a.localeCompare(b));
    for (const id of seed) {
      stageMap.set(id, 0);
    }
    const queue = [...seed];

    const sortQueue = () => {
      queue.sort((a, b) => {
        const stageA = stageMap.get(a) ?? 0;
        const stageB = stageMap.get(b) ?? 0;
        if (stageA !== stageB) return stageA - stageB;
        const nameA = englishText(tempQuestLookup.get(a)?.name, a);
        const nameB = englishText(tempQuestLookup.get(b)?.name, b);
        return nameA.localeCompare(nameB);
      });
    };

    sortQueue();

    while (queue.length > 0) {
      const current = queue.shift();
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
        const nameA = englishText(tempQuestLookup.get(a)?.name, a);
        const nameB = englishText(tempQuestLookup.get(b)?.name, b);
        return nameA.localeCompare(nameB);
      });

    const fallbackRoot = [...componentIds].sort((a, b) => a.localeCompare(b))[0];
    const primaryRoot = roots[0] ?? fallbackRoot;
    const rootQuest = tempQuestLookup.get(primaryRoot);
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
        name: englishText(tempQuestLookup.get(id)?.name, id)
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

const { chains: derivedChains, chainAssignments, stageByQuestId } = deriveQuestChains();

await writeJson(existingChainsPath, derivedChains);

const mergedQuests = [];

for (const quest of tempQuests) {
  const questId = quest.id.startsWith('quest-') ? quest.id : `quest-${slugify(quest.id)}`;
  const base = existingQuestMap.get(questId);
  const rewards = [];
  if (Array.isArray(quest.rewardItemIds)) {
    for (const reward of quest.rewardItemIds) {
      const convertedItemId = toItemId(reward.itemId);
      rewards.push({
        itemId: convertedItemId,
        name: getItemName(reward.itemId),
        qty: reward.quantity ?? 1
      });
    }
  }
  if (quest.xp && !Number.isNaN(Number(quest.xp))) {
    rewards.push({ coins: Number(quest.xp) });
  }
  const objectives = Array.isArray(quest.objectives)
    ? quest.objectives.map((objective) => englishText(objective)).filter(Boolean)
    : [];

  const previousQuestIds = Array.isArray(quest.previousQuestIds)
    ? quest.previousQuestIds
        .map((value) => canonicalQuestId(value))
        .filter((value) => Boolean(value))
    : [];
  const nextQuestIds = Array.isArray(quest.nextQuestIds)
    ? quest.nextQuestIds
        .map((value) => canonicalQuestId(value))
        .filter((value) => Boolean(value))
    : [];

  const assignment = chainAssignments.get(questId);
  const chainId = assignment?.chainId ?? base?.chainId ?? null;
  const chainStage = stageByQuestId.get(questId) ?? base?.chainStage ?? null;

  mergedQuests.push({
    id: questId,
    name: englishText(quest.name, base?.name ?? questId),
    chainId,
    giver: quest.trader ?? base?.giver ?? null,
    items: base?.items ?? [],
    rewards: rewards.length > 0 ? rewards : base?.rewards ?? [],
    mapHints: objectives.length > 0 ? objectives : base?.mapHints ?? [],
    chainStage,
    previousQuestIds,
    nextQuestIds
  });

  existingQuestMap.delete(questId);
}

for (const leftover of existingQuestMap.values()) {
  mergedQuests.push(leftover);
}

mergedQuests.sort((a, b) => a.name.localeCompare(b.name));
await writeJson(existingQuestsPath, mergedQuests);

const existingUpgrades = await readJson(existingUpgradesPath);
const normalizedUpgradeIdPattern = /^upgrade-[a-z0-9-]+-level-[0-9]+$/;
const existingUpgradeMap = new Map(
  existingUpgrades
    .filter((upgrade) => normalizedUpgradeIdPattern.test(upgrade.id))
    .map((upgrade) => [upgrade.id, upgrade])
);

const moduleRecords = [];
for (const module of tempModules) {
  const benchName = englishText(module.name, module.id);
  const benchSlug = slugify(benchName);
  for (const level of module.levels ?? []) {
    const upgradeId = `upgrade-${benchSlug}-level-${level.level}`;
    const items = Array.isArray(level.requirementItemIds)
      ? level.requirementItemIds.map((req) => ({
          itemId: toItemId(req.itemId),
          qty: req.quantity ?? req.qty ?? 1
        }))
      : [];
    moduleRecords.push({
      id: upgradeId,
      name: `${benchName} · Level ${level.level}`,
      bench: benchName,
      level: level.level,
      items
    });
    existingUpgradeMap.delete(upgradeId);
  }
}

const remainingUpgrades = Array.from(existingUpgradeMap.values());
const mergedUpgrades = [...moduleRecords, ...remainingUpgrades].sort((a, b) => {
  if (a.bench === b.bench) return (a.level ?? 0) - (b.level ?? 0);
  return a.bench.localeCompare(b.bench);
});
await writeJson(existingUpgradesPath, mergedUpgrades);

const mergedProjects = (tempProjects ?? []).map((project) => {
  const projectId = project.id?.startsWith('project-') ? project.id : `project-${slugify(project.id)}`;
  return {
    id: projectId,
    name: englishText(project.name, project.id ?? projectId),
    description: englishText(project.description, null) || null,
    phases: (project.phases ?? []).map((phase, index) => {
      const phaseOrder = Number.isFinite(phase.phase) ? phase.phase : index + 1;
      const phaseId = `${projectId}-phase-${phaseOrder}`;
      return {
        id: phaseId,
        order: phaseOrder,
        name: englishText(phase.name, `Phase ${phaseOrder}`),
        description: englishText(phase.description, null) || null,
        requirements: (phase.requirementItemIds ?? []).map((req) => ({
          itemId: toItemId(req.itemId),
          qty: req.quantity ?? req.qty ?? 1
        }))
      };
    })
  };
});

await writeJson(existingProjectsPath, mergedProjects);

console.log('Merge complete:');
console.log(' Items:', mergedItems.length);
console.log(' Quests:', mergedQuests.length);
console.log(' Workbench upgrades:', mergedUpgrades.length);
console.log(' Projects:', mergedProjects.length);
