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
const existingUpgradesPath = path.join(staticDir, 'upgrades.json');
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

  mergedQuests.push({
    id: questId,
    name: englishText(quest.name, base?.name ?? questId),
    chainId: base?.chainId ?? null,
    giver: quest.trader ?? base?.giver ?? null,
    items: base?.items ?? [],
    rewards: rewards.length > 0 ? rewards : base?.rewards ?? [],
    mapHints: objectives.length > 0 ? objectives : base?.mapHints ?? []
  });

  existingQuestMap.delete(questId);
}

for (const leftover of existingQuestMap.values()) {
  mergedQuests.push(leftover);
}

mergedQuests.sort((a, b) => a.name.localeCompare(b.name));
await writeJson(existingQuestsPath, mergedQuests);

const existingUpgrades = await readJson(existingUpgradesPath);
const existingUpgradeMap = new Map(existingUpgrades.map((upgrade) => [upgrade.id, upgrade]));

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
console.log(' Upgrades:', mergedUpgrades.length);
console.log(' Projects:', mergedProjects.length);
