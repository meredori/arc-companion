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
  RecommendationSort,
  RecommendationWishlistSource,
  RunLogEntry,
  UpgradePack,
  WantListEntry,
  WantListResolvedEntry,
  WorkbenchUpgradeState
} from '$lib/types';
import {
  QUICK_USE_BENCH_BY_SLUG,
  QUICK_USE_BENCH_LOOKUP,
  QUICK_USE_BENCH_PRIORITY
} from '$lib/utils/bench';
import { dedupeWeaponVariants } from '$lib/weapon-variants';
import { isBasicMaterial } from '$lib/utils/materials';

const CATEGORY_PRIORITY_GROUPS: string[][] = [
  ['Augment'],
  ['Shield'],
  [
    'Weapon',
    'Assault Rifle',
    'Battle Rifle',
    'Hand Cannon',
    'LMG',
    'Pistol',
    'Shotgun',
    'Sniper Rifle',
    'Special'
  ],
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

const normalizeCategory = (value?: string | null) => (value ? value.toLowerCase().trim() : '');

function computeRecycleValue(item: ItemRecord): number {
  const targets = item.recyclesInto ?? item.salvagesInto ?? [];
  return targets.reduce((total, entry) => total + entry.qty * 35, 0);
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
  const itemLookup = new Map(items.map((item) => [item.id, item] as const));
  const nameLookup = new Map(items.map((item) => [item.id, item.name]));
  const sources = new Map<string, RecommendationWishlistSource[]>();

  const register = (itemId: string, source: RecommendationWishlistSource) => {
    const existing = sources.get(itemId) ?? [];
    existing.push(source);
    sources.set(itemId, existing);
  };

  const isBasicWishlistTarget = (itemId: string) => {
    const item = itemLookup.get(itemId);
    return isBasicMaterial(item?.category, item?.type);
  };

  for (const detail of dependencies) {
    const targetName =
      detail.item?.name ?? nameLookup.get(detail.entry.itemId) ?? detail.entry.itemId;
    const note = detail.entry.reason;
    if (!isBasicWishlistTarget(detail.entry.itemId)) {
      register(detail.entry.itemId, {
        targetItemId: detail.entry.itemId,
        targetName,
        note,
        kind: 'target'
      });
    }
    for (const requirement of detail.requirements) {
      if (isBasicWishlistTarget(requirement.itemId)) continue;
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
    if (isBasicWishlistTarget(entry.itemId)) continue;
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
    if (ownedWorkbenchUpgrade(upgrade, context.workbenchUpgrades)) {
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
  const itemLookup = new Map(context.items.map((entry) => [entry.id, entry] as const));
  const questNeed = remainingQuestNeeds(item.id, context);
  const upgradeNeed = remainingUpgradeNeeds(item.id, context);
  const projectNeed = remainingProjectNeeds(item.id, context);
  const salvageValue = computeRecycleValue(item);
  const stackSellValue = item.sell * item.stackSize;
  const normalizedCategory = item.category?.toLowerCase().trim();
  const alwaysKeepCategory =
    normalizedCategory && context.alwaysKeepCategories.length > 0
      ? context.alwaysKeepCategories.some(
          (entry) => entry.toLowerCase().trim() === normalizedCategory
        )
      : false;

  const wishlistSources = context.wishlistSourcesByItem[item.id] ?? [];

  let action: RecommendationAction = 'sell';
  let rationale = 'Not needed for wishlist targets, upgrades, or projects. Sell extras for coins.';

  const wishlistReason = (() => {
    if (wishlistSources.length === 0) return '';
    const uniqueTargets = Array.from(new Set(wishlistSources.map((source) => source.targetName)));
    const wishlistBase =
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
    const messageBase = notes.length > 0 ? `${wishlistBase} (${notes.join('; ')})` : wishlistBase;
    return messageBase.endsWith('.') ? messageBase : `${messageBase}.`;
  })();

  if (questNeed.total > 0) {
    action = 'keep';
    rationale = `Required for ${questNeed.total} quest objective${questNeed.total > 1 ? 's' : ''}.`;
  } else if (upgradeNeed.total > 0 || projectNeed.total > 0 || wishlistSources.length > 0) {
    action = 'keep';
    const keepReasons: string[] = [];
    if (upgradeNeed.total > 0) {
      keepReasons.push(
        `Unowned workbench upgrades will consume ${upgradeNeed.total} item${
          upgradeNeed.total > 1 ? 's' : ''
        }.`
      );
    }
    if (projectNeed.total > 0) {
      keepReasons.push(
        `Incomplete projects still need ${projectNeed.total} item${projectNeed.total > 1 ? 's' : ''}.`
      );
    }
    if (wishlistReason) {
      keepReasons.push(wishlistReason);
    }
    rationale = keepReasons.join(' ');
  } else if (alwaysKeepCategory) {
    action = 'keep';
    rationale = 'Category flagged as always keep in admin controls.';
  } else {
    const recycleTargets = item.recyclesInto ?? item.salvagesInto ?? [];
    const nonBasicRecycleTargets = recycleTargets.filter((entry) => {
      const target = itemLookup.get(entry.itemId);
      const entryType = entry.type ?? target?.type;
      return !isBasicMaterial(target?.category, entryType);
    });
    const recycleWishlistTargets = nonBasicRecycleTargets.filter(
      (entry) => (context.wishlistSourcesByItem[entry.itemId]?.length ?? 0) > 0
    );
    const recycleUpgradeTargets = nonBasicRecycleTargets.filter(
      (entry) => remainingUpgradeNeeds(entry.itemId, context).total > 0
    );
    const recycleProjectTargets = nonBasicRecycleTargets.filter(
      (entry) => remainingProjectNeeds(entry.itemId, context).total > 0
    );

    if (recycleWishlistTargets.length > 0) {
      action = 'recycle';
      const targetList = recycleWishlistTargets.map((entry) => entry.name ?? entry.itemId).join(', ');
      rationale = `Recycle to supply wishlist materials (${targetList}).`;
    } else if (recycleUpgradeTargets.length > 0) {
      action = 'recycle';
      const targetList = recycleUpgradeTargets.map((entry) => entry.name ?? entry.itemId).join(', ');
      rationale = `Recycle to feed unowned workbench upgrades (${targetList}).`;
    } else if (recycleProjectTargets.length > 0) {
      action = 'recycle';
      const targetList = recycleProjectTargets.map((entry) => entry.name ?? entry.itemId).join(', ');
      rationale = `Recycle to advance incomplete projects (${targetList}).`;
    } else if (nonBasicRecycleTargets.length > 0 && salvageValue > item.sell) {
      action = 'recycle';
      rationale = 'Recycle for better value than selling.';
    }
  }

  if (wishlistSources.length > 0 && !rationale.includes('Wishlist')) {
    rationale = rationale.endsWith('.') ? `${rationale} ${wishlistReason}` : `${rationale}. ${wishlistReason}`;
  }

  return {
    itemId: item.id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    type: item.type,
    rarity: item.rarity,
    imageUrl: item.imageUrl ?? null,
    action,
    rationale,
    sellPrice: item.sell,
    stackSize: item.stackSize,
    stackSellValue,
    salvageValue,
    salvageBreakdown: item.recyclesInto ?? item.salvagesInto,
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
  context: RecommendationContext,
  options?: { sortMode?: RecommendationSort }
): ItemRecommendation[] {
  const sortMode = options?.sortMode ?? 'category';
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

  const dedupedItems = dedupeWeaponVariants(categoryFiltered);

  const recommendations = dedupedItems.map((item) => recommendItem(item, context));

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

  if (sortMode === 'value') {
    return recommendations.sort((a, b) => {
      const valueDiff = (b.sellPrice ?? 0) - (a.sellPrice ?? 0);
      if (valueDiff !== 0) return valueDiff;
      const rarityDiff = rarityRank(a.rarity) - rarityRank(b.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  if (sortMode === 'alphabetical') {
    return recommendations.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }

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
