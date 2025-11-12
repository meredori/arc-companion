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
  RecommendationWishlistSource,
  RunLogEntry,
  UpgradePack,
  WantListEntry,
  WantListResolvedEntry,
  WorkbenchUpgradeState
} from '$lib/types';

const CATEGORY_PRIORITY_GROUPS: string[][] = [
  ['Augment'],
  ['Shield'],
  ['Weapon', 'Assault Rifle', 'Battle Rifle', 'Hand Cannon', 'LMG', 'Pistol', 'Shotgun'],
  ['Ammunition'],
  ['Modification'],
  ['Quick Use'],
  ['Key'],
  ['Backpack Attachment'],
  ['Backpack Charm'],
  ['Blueprint'],
  ['Topside Material', 'Refined Material', 'Material', 'Basic Material', 'Recyclable'],
  ['Nature', 'Trinket'],
  ['Outfit'],
  ['Cosmetic'],
  ['Valuable'],
  ['Misc']
] as const;

const QUICK_USE_BENCH_PRIORITY = [
  'utility_bench',
  'explosives_bench',
  'med_station',
  'medical_bench',
  'workbench',
  'none'
] as const;

type QuickUseBenchKey = (typeof QUICK_USE_BENCH_PRIORITY)[number];

const QUICK_USE_BENCH_LOOKUP = new Map<QuickUseBenchKey, number>(
  QUICK_USE_BENCH_PRIORITY.map((label, index) => [label, index])
);

const QUICK_USE_BENCH_BY_SLUG = new Map<string, QuickUseBenchKey>([
  ['adrenaline-shot', 'med_station'],
  ['bandage', 'workbench'],
  ['barricade-kit', 'none'],
  ['binoculars', 'utility_bench'],
  ['blaze-grenade', 'none'],
  ['blaze-grenade-trap', 'none'],
  ['blue-light-stick', 'none'],
  ['defibrillator', 'med_station'],
  ['door-blocker', 'utility_bench'],
  ['gas-grenade', 'explosives_bench'],
  ['gas-grenade-trap', 'none'],
  ['green-light-stick', 'utility_bench'],
  ['heavy-fuze-grenade', 'explosives_bench'],
  ['herbal-bandage', 'med_station'],
  ['jolt-mine', 'explosives_bench'],
  ['light-impact-grenade', 'workbench'],
  ['lil-smoke-grenade', 'utility_bench'],
  ['lure-grenade', 'utility_bench'],
  ['lure-grenade-trap', 'none'],
  ['noisemaker', 'none'],
  ['photoelectric-cloak', 'utility_bench'],
  ['red-light-stick', 'none'],
  ['remote-raider-flare', 'utility_bench'],
  ['shield-recharger', 'workbench'],
  ['showstopper', 'none'],
  ['shrapnel-grenade', 'explosives_bench'],
  ['smoke-grenade', 'none'],
  ['smoke-grenade-trap', 'none'],
  ['snap-blast-grenade', 'explosives_bench'],
  ['snap-hook', 'utility_bench'],
  ['sterilized-bandage', 'med_station'],
  ['surge-shield-recharger', 'med_station'],
  ['tagging-grenade', 'none'],
  ['trigger-nade', 'explosives_bench'],
  ['vita-shot', 'none'],
  ['vita-spray', 'medical_bench'],
  ['wolfpack', 'none'],
  ['yellow-light-stick', 'none'],
  ['zipline', 'utility_bench']
]);

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

const WEAPON_GROUP_KEY = categoryGroupKey('Weapon');

const isWeaponCategory = (label?: string) => {
  if (!label || !WEAPON_GROUP_KEY) return false;
  return categoryGroupKey(label) === WEAPON_GROUP_KEY;
};

const RARITY_PRIORITY = ['legendary', 'epic', 'rare', 'uncommon', 'common'] as const;

const normalizeCategory = (value?: string | null) => (value ? value.toLowerCase().trim() : '');

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

function deriveWishlistSources(
  items: ItemRecord[],
  wantList: WantListEntry[],
  dependencies: WantListResolvedEntry[]
): Record<string, RecommendationWishlistSource[]> {
  const nameLookup = new Map(items.map((item) => [item.id, item.name]));
  const sources = new Map<string, RecommendationWishlistSource[]>();

  const register = (itemId: string, source: RecommendationWishlistSource) => {
    const existing = sources.get(itemId) ?? [];
    existing.push(source);
    sources.set(itemId, existing);
  };

  for (const detail of dependencies) {
    const targetName =
      detail.item?.name ?? nameLookup.get(detail.entry.itemId) ?? detail.entry.itemId;
    const note = detail.entry.reason;
    register(detail.entry.itemId, {
      targetItemId: detail.entry.itemId,
      targetName,
      note,
      kind: 'target'
    });
    for (const requirement of detail.requirements) {
      register(requirement.itemId, {
        targetItemId: detail.entry.itemId,
        targetName,
        note,
        kind: 'requirement'
      });
    }
  }

  for (const entry of wantList) {
    if (sources.has(entry.itemId)) continue;
    const targetName = nameLookup.get(entry.itemId) ?? entry.itemId;
    register(entry.itemId, {
      targetItemId: entry.itemId,
      targetName,
      note: entry.reason,
      kind: 'target'
    });
  }

  const result: Record<string, RecommendationWishlistSource[]> = {};
  for (const [itemId, list] of sources.entries()) {
    result[itemId] = list;
  }
  return result;
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
  wantList?: WantListEntry[];
  wantListDependencies?: WantListResolvedEntry[];
  ignoredCategories?: string[];
}): RecommendationContext {
  const wantList = params.wantList ?? [];
  const wantListDependencies = params.wantListDependencies ?? [];
  const wishlistSourcesByItem = deriveWishlistSources(
    params.items,
    wantList,
    wantListDependencies
  );
  return {
    items: params.items,
    quests: params.quests,
    questProgress: params.questProgress ?? [],
    upgrades: params.upgrades ?? [],
    blueprints: params.blueprints ?? [],
    workbenchUpgrades: params.workbenchUpgrades ?? [],
    projects: params.projects ?? [],
    projectProgress: params.projectProgress ?? {},
    alwaysKeepCategories: params.alwaysKeepCategories ?? [],
    ignoredCategories: params.ignoredCategories ?? [],
    wantList,
    wantListDependencies,
    wishlistSourcesByItem
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

  const wishlistSources = context.wishlistSourcesByItem[item.id] ?? [];
  if (wishlistSources.length > 0) {
    if (action === 'sell' || action === 'salvage') {
      action = 'keep';
    }
    const uniqueTargets = Array.from(
      new Set(wishlistSources.map((source) => source.targetName))
    );
    const wishlistReason =
      uniqueTargets.length === 1
        ? `Wishlist target ${uniqueTargets[0]} needs this item`
        : `Wishlist targets ${uniqueTargets.join(', ')} need this item`;
    const notes = Array.from(
      new Set(
        wishlistSources
          .map((source) => source.note?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
    const messageBase = notes.length > 0 ? `${wishlistReason} (${notes.join('; ')})` : wishlistReason;
    const sentence = messageBase.endsWith('.') ? messageBase : `${messageBase}.`;
    if (rationale) {
      rationale = rationale.endsWith('.') ? `${rationale} ${sentence}` : `${rationale}. ${sentence}`;
    } else {
      rationale = sentence;
    }
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
    },
    wishlistSources
  };
}

export function recommendItemsMatching(
  query: string,
  context: RecommendationContext
): ItemRecommendation[] {
  const normalized = query.trim().toLowerCase();
  const ignoredCategorySet = new Set(
    context.ignoredCategories
      .map((entry) => normalizeCategory(entry))
      .filter((value) => value.length > 0)
  );
  const wantListAllowSet = new Set(context.wantList.map((entry) => entry.itemId));

  const passesIgnoreFilter = (item: ItemRecord) => {
    const category = normalizeCategory(item.category);
    if (!category) return true;
    if (!ignoredCategorySet.has(category)) return true;
    if (wantListAllowSet.has(item.id)) return true;
    return false;
  };

  const filtered = normalized
    ? context.items.filter((item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.slug.includes(normalized) ||
        item.category?.toLowerCase().includes(normalized)
      )
    : context.items;

  const categoryFiltered = filtered.filter(passesIgnoreFilter);

  const weaponVariantPattern = /-([ivxlcdm]+)$/;

  const filteredWeapons = categoryFiltered.filter((item) => {
    if (!isWeaponCategory(item.category)) {
      return true;
    }
    const match = item.slug.match(weaponVariantPattern);
    if (!match) {
      return true;
    }
    const numeral = match[1];
    return numeral === 'i';
  });

  const recommendations = filteredWeapons.map((item) => recommendItem(item, context));

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

  const quickUseBenchRank = (recommendation: ItemRecommendation) => {
    if (recommendation.category?.toLowerCase() !== 'quick use') {
      return Number.MAX_SAFE_INTEGER;
    }
    const benchKey = QUICK_USE_BENCH_BY_SLUG.get(recommendation.slug) ?? 'none';
    return QUICK_USE_BENCH_LOOKUP.get(benchKey) ?? QUICK_USE_BENCH_PRIORITY.length;
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

    if (a.category?.toLowerCase() === 'quick use' && b.category?.toLowerCase() === 'quick use') {
      const benchDiff = quickUseBenchRank(a) - quickUseBenchRank(b);
      if (benchDiff !== 0) return benchDiff;
    }

    const rarityDiff = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (rarityDiff !== 0) return rarityDiff;

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function summarizeRunNeeds(runs: RunLogEntry[]): number {
  return runs.reduce((count, run) => (run.extractedValue ? count + 1 : count), 0);
}
