import type { ItemRecommendation, QuestProgress } from '$lib/types';

interface RecommendationContext {
  quests: QuestProgress[];
  desiredItemIds: Set<string>;
}

export function buildRecommendationContext(quests: QuestProgress[]): RecommendationContext {
  const desiredItemIds = new Set<string>();

  quests.forEach((quest) => {
    if (!quest.completed) {
      quest.requiredItems.forEach((itemId) => desiredItemIds.add(itemId));
    }
  });

  return { quests, desiredItemIds };
}

export function applyPlaceholderRecommendation(name: string, context: RecommendationContext): ItemRecommendation {
  const needsItem = Array.from(context.desiredItemIds).some((id) => name.toLowerCase().includes(id));

  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    action: needsItem ? 'save' : 'sell',
    rationale: needsItem
      ? 'Quest requirements indicate this item should be saved.'
      : 'No current quests require this item; defaulting to sell until more data is available.',
    sources: []
  };
}
