import type {
  BlueprintState,
  ItemRecord,
  ItemRecommendation,
  Quest,
  QuestProgress,
  RecommendationAction,
  RecommendationContext,
  RunLogEntry,
  UpgradePack
} from '$lib/types';

function computeSalvageValue(item: ItemRecord): number {
  return item.recycle.reduce((total, entry) => total + entry.qty * 35, 0);
}

function isQuestComplete(quest: Quest, progress: QuestProgress[]): boolean {
  const record = progress.find((entry) => entry.id === quest.id);
  return record?.completed ?? false;
}

function ownedBlueprint(upgrade: UpgradePack, blueprints: BlueprintState[]): boolean {
  const record = blueprints.find((bp) => bp.id === upgrade.id);
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
}): RecommendationContext {
  return {
    items: params.items,
    quests: params.quests,
    questProgress: params.questProgress ?? [],
    upgrades: params.upgrades ?? [],
    blueprints: params.blueprints ?? []
  };
}

function remainingQuestNeeds(itemId: string, context: RecommendationContext) {
  const incompleteQuestNames: string[] = [];
  let total = 0;

  for (const quest of context.quests) {
    if (isQuestComplete(quest, context.questProgress)) {
      continue;
    }

    for (const requirement of quest.items) {
      if (requirement.itemId === itemId) {
        total += requirement.qty;
        incompleteQuestNames.push(`${quest.name} (${requirement.qty}x)`);
      }
    }
  }

  return { total, questNames: incompleteQuestNames };
}

function remainingUpgradeNeeds(itemId: string, context: RecommendationContext) {
  let total = 0;
  const upgradeNames: string[] = [];

  for (const upgrade of context.upgrades) {
    if (!ownedBlueprint(upgrade, context.blueprints)) {
      continue;
    }

    for (const requirement of upgrade.items) {
      if (requirement.itemId === itemId) {
        total += requirement.qty;
        upgradeNames.push(`${upgrade.name} (${requirement.qty}x)`);
      }
    }
  }

  return { total, upgradeNames };
}

export function recommendItem(item: ItemRecord, context: RecommendationContext): ItemRecommendation {
  const questNeed = remainingQuestNeeds(item.id, context);
  const upgradeNeed = remainingUpgradeNeeds(item.id, context);
  const salvageValue = computeSalvageValue(item);

  let action: RecommendationAction = 'sell';
  let rationale = 'No active quests or owned blueprints require this item. Sell extras for coins.';
  const contexts: string[] = [];

  if (questNeed.total > 0) {
    action = 'save';
    contexts.push(...questNeed.questNames.map((name) => `Quest: ${name}`));
    rationale = `Required for ${questNeed.total} quest objective${questNeed.total > 1 ? 's' : ''}.`;
  } else if (upgradeNeed.total > 0) {
    action = 'keep';
    contexts.push(...upgradeNeed.upgradeNames.map((name) => `Upgrade: ${name}`));
    rationale = `Owned blueprints will consume ${upgradeNeed.total} item${upgradeNeed.total > 1 ? 's' : ''}.`;
  } else if (salvageValue > item.sell) {
    action = 'salvage';
    rationale = 'Recycling yields higher composite value than selling outright.';
  }

  return {
    itemId: item.id,
    name: item.name,
    rarity: item.rarity,
    action,
    rationale,
    salvageValue,
    contexts,
    needs: {
      quests: questNeed.total,
      workshop: upgradeNeed.total
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

  return recommendations.sort((a, b) => {
    const priority = (value: ItemRecommendation) => {
      if (value.action === 'save') return 0;
      if (value.action === 'keep') return 1;
      if (value.action === 'salvage') return 2;
      return 3;
    };
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return b.needs.quests + b.needs.workshop - (a.needs.quests + a.needs.workshop);
  });
}

export function summarizeRunNeeds(runs: RunLogEntry[]): number {
  return runs.reduce((count, run) => (run.extractedValue ? count + 1 : count), 0);
}
