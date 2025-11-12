import type {
  BlueprintState,
  ItemRecord,
  ItemRecommendation,
  Project,
  ProjectNeedDetail,
  ProjectProgressState,
  Quest,
  QuestProgress,
  RecommendationAction,
  RecommendationContext,
  RunLogEntry,
  UpgradePack,
  WorkbenchUpgradeState
} from '$lib/types';

const CATEGORY_PRIORITY_GROUPS: string[][] = [
  ['Augment'],
  ['Shield'],
  ['Weapon', 'Assault Rifle', 'Battle Rifle', 'Pistol', 'Shotgun'],
  ['Ammo'],
  ['Mod'],
  ['Quick Use (Photoelectric Cloak)'],
  ['Quick Use (Explosives)'],
  ['Quick Use (Mines)'],
  ['Quick Use (Heals)'],
  ['Keys', 'Key'],
  ['Quick Use (Utility)', 'Quick Use (Zipline)', 'Quick Use (Flare)', 'Quick use (Utility aka Zipline, Flare)'],
  [
    'Material (Topside, Refined, Recyclable)',
    'Topside Material',
    'Refined Material',
    'Recyclable',
    'Advanced Material'
  ],
  ['Nature + Trinket', 'Nature', 'Trinket']
] as const;

const CATEGORY_RANK_LOOKUP = new Map<string, number>();
const CATEGORY_GROUP_LOOKUP = new Map<string, string>();
CATEGORY_PRIORITY_GROUPS.forEach((group, index) => {
  const groupKey = group[0]?.toLowerCase() ?? `group-${index}`;
  group.forEach((label) => {
    const normalized = label.toLowerCase();
    CATEGORY_RANK_LOOKUP.set(normalized, index);
    CATEGORY_GROUP_LOOKUP.set(normalized, groupKey);
  });
});

const categoryGroupKey = (label?: string) => {
  if (!label) return undefined;
  return CATEGORY_GROUP_LOOKUP.get(label.toLowerCase());
};

const RARITY_PRIORITY = ['legendary', 'epic', 'rare', 'uncommon', 'common'] as const;

function computeSalvageValue(item: ItemRecord): number {
  return item.recycle.reduce((total, entry) => total + entry.qty * 35, 0);
}

function isQuestComplete(quest: Quest, progress: QuestProgress[]): boolean {
  const record = progress.find((entry) => entry.id === quest.id);
  return record?.completed ?? false;
}

function ownedWorkbenchUpgrade(
  upgrade: UpgradePack,
  ownedUpgrades: WorkbenchUpgradeState[]
): boolean {
  const record = ownedUpgrades.find((entry) => entry.id === upgrade.id);
  if (!record) {
    return false;
  }
  return record.owned;
}

export function buildRecommendationContext(params: {
  items: ItemRecord[];
  quests: Quest[];
  questProgress?: QuestProgress[];
  upgrades?: UpgradePack[];
  blueprints?: BlueprintState[];
  workbenchUpgrades?: WorkbenchUpgradeState[];
  projects?: Project[];
  projectProgress?: ProjectProgressState;
  alwaysKeepCategories?: string[];
}): RecommendationContext {
  return {
    items: params.items,
    quests: params.quests,
    questProgress: params.questProgress ?? [],
    upgrades: params.upgrades ?? [],
    blueprints: params.blueprints ?? [],
    workbenchUpgrades: params.workbenchUpgrades ?? [],
    projects: params.projects ?? [],
    projectProgress: params.projectProgress ?? {},
    alwaysKeepCategories: params.alwaysKeepCategories ?? []
  };
}

function remainingQuestNeeds(itemId: string, context: RecommendationContext) {
  const details: { questId: string; name: string; qty: number }[] = [];
  let total = 0;

  for (const quest of context.quests) {
    if (isQuestComplete(quest, context.questProgress)) {
      continue;
    }

    for (const requirement of quest.items) {
      if (requirement.itemId === itemId) {
        total += requirement.qty;
        details.push({
          questId: quest.id,
          name: quest.name,
          qty: requirement.qty
        });
      }
    }
  }

  return { total, details };
}

function remainingUpgradeNeeds(itemId: string, context: RecommendationContext) {
  let total = 0;
  const details: {
    upgradeId: string;
    name: string;
    qty: number;
    bench: string;
    level: number;
  }[] = [];

  for (const upgrade of context.upgrades) {
    if (!ownedWorkbenchUpgrade(upgrade, context.workbenchUpgrades)) {
      continue;
    }

    for (const requirement of upgrade.items) {
      if (requirement.itemId === itemId) {
        total += requirement.qty;
        details.push({
          upgradeId: upgrade.id,
          name: upgrade.name,
          qty: requirement.qty,
          bench: upgrade.bench,
          level: upgrade.level
        });
      }
    }
  }

  return { total, details };
}

function remainingProjectNeeds(itemId: string, context: RecommendationContext) {
  let total = 0;
  const details: ProjectNeedDetail[] = [];
  for (const project of context.projects) {
    const phases = [...project.phases].sort((a, b) => a.order - b.order);
    for (const phase of phases) {
      const contributions = context.projectProgress?.[project.id]?.[phase.id] ?? {};
      const requirements = phase.requirements ?? [];
      const phaseComplete = requirements.every(
        (requirement) => (contributions[requirement.itemId] ?? 0) >= requirement.qty
      );
      if (phaseComplete) {
        continue;
      }
      for (const requirement of requirements) {
        if (requirement.itemId !== itemId) continue;
        const delivered = contributions[requirement.itemId] ?? 0;
        const remaining = Math.max(0, requirement.qty - delivered);
        if (remaining > 0) {
          total += remaining;
          details.push({
            projectId: project.id,
            phaseId: phase.id,
            projectName: project.name,
            phaseName: phase.name,
            qty: remaining
          });
        }
      }
      break;
    }
  }
  return { total, details };
}

export function recommendItem(item: ItemRecord, context: RecommendationContext): ItemRecommendation {
  const questNeed = remainingQuestNeeds(item.id, context);
  const upgradeNeed = remainingUpgradeNeeds(item.id, context);
  const projectNeed = remainingProjectNeeds(item.id, context);
  const salvageValue = computeSalvageValue(item);
  const normalizedCategory = item.category?.toLowerCase().trim();
  const alwaysKeepCategory =
    normalizedCategory && context.alwaysKeepCategories.length > 0
      ? context.alwaysKeepCategories.some(
          (entry) => entry.toLowerCase().trim() === normalizedCategory
        )
      : false;

  let action: RecommendationAction = 'sell';
  let rationale = 'No active quests or owned blueprints require this item. Sell extras for coins.';

  if (questNeed.total > 0) {
    action = 'save';
    rationale = `Required for ${questNeed.total} quest objective${questNeed.total > 1 ? 's' : ''}.`;
  } else if (upgradeNeed.total > 0 || projectNeed.total > 0) {
    action = 'keep';
    if (upgradeNeed.total > 0 && projectNeed.total > 0) {
      rationale = `Blueprints and expedition projects will consume ${upgradeNeed.total + projectNeed.total} item${upgradeNeed.total + projectNeed.total > 1 ? 's' : ''}.`;
    } else if (upgradeNeed.total > 0) {
      rationale = `Owned workbench upgrades will consume ${upgradeNeed.total} item${
        upgradeNeed.total > 1 ? 's' : ''
      }.`;
    } else {
      rationale = `Expedition projects still need ${projectNeed.total} item${projectNeed.total > 1 ? 's' : ''}.`;
    }
  } else if (alwaysKeepCategory) {
    action = 'keep';
    rationale = 'Category flagged as always keep in admin controls.';
  } else if (salvageValue > item.sell) {
    action = 'salvage';
    rationale = 'Recycling yields higher composite value than selling outright.';
  }

  return {
    itemId: item.id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    rarity: item.rarity,
    imageUrl: item.imageUrl ?? null,
    action,
    rationale,
    sellPrice: item.sell,
    salvageValue,
    salvageBreakdown: item.recycle,
    questNeeds: questNeed.details,
    upgradeNeeds: upgradeNeed.details,
    projectNeeds: projectNeed.details,
    alwaysKeepCategory,
    needs: {
      quests: questNeed.total,
      workshop: upgradeNeed.total,
      projects: projectNeed.total
    }
  };
}

export function recommendItemsMatching(
  query: string,
  context: RecommendationContext
): ItemRecommendation[] {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? context.items.filter((item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.slug.includes(normalized) ||
        item.category?.toLowerCase().includes(normalized)
      )
    : context.items;

  const recommendations = filtered.map((item) => recommendItem(item, context));

  const rarityRank = (rarity?: string) => {
    if (!rarity) return RARITY_PRIORITY.length;
    const normalized = rarity.toLowerCase().replace(/\s+/g, ' ').trim();
    const token = normalized.split(/[^a-z]+/i)[0] ?? '';
    const index = RARITY_PRIORITY.findIndex((label) => label === token);
    if (index !== -1) return index;
    // Handle strings where the token might appear after punctuation (e.g., "Legendary-grade").
    const fuzzy = RARITY_PRIORITY.findIndex((label) =>
      normalized.startsWith(label)
    );
    return fuzzy === -1 ? RARITY_PRIORITY.length : fuzzy;
  };

  const categoryRank = (value?: string) => {
    if (!value) return CATEGORY_RANK_LOOKUP.size;
    return CATEGORY_RANK_LOOKUP.get(value.toLowerCase()) ?? CATEGORY_RANK_LOOKUP.size;
  };

  return recommendations.sort((a, b) => {
    const rankDiff = categoryRank(a.category) - categoryRank(b.category);
    if (rankDiff !== 0) return rankDiff;

    const groupKeyA = categoryGroupKey(a.category);
    const groupKeyB = categoryGroupKey(b.category);
    if (!groupKeyA || !groupKeyB || groupKeyA !== groupKeyB) {
      const categoryNameDiff = (a.category ?? '').localeCompare(b.category ?? '', undefined, {
        sensitivity: 'base'
      });
      if (categoryNameDiff !== 0) return categoryNameDiff;
    }

    const rarityDiff = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (rarityDiff !== 0) return rarityDiff;

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function summarizeRunNeeds(runs: RunLogEntry[]): number {
  return runs.reduce((count, run) => (run.extractedValue ? count + 1 : count), 0);
}
