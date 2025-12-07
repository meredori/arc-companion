import { describe, expect, it } from 'vitest';

import type { ItemRecord, ItemRecommendation } from '$lib/types';
import { filterLookOutRecommendations } from './lookout';

const ITEMS: ItemRecord[] = [
  {
    id: 'item-expedition-trinket',
    name: 'Expedition Trinket',
    slug: 'expedition-trinket',
    category: 'Trinket',
    rarity: 'Common Trinket',
    sell: 100,
    stackSize: 1,
    salvagesInto: []
  },
  {
    id: 'item-quest-component',
    name: 'Quest Component',
    slug: 'quest-component',
    category: 'Modification',
    rarity: 'Uncommon Component',
    sell: 200,
    stackSize: 1,
    salvagesInto: []
  }
];

const itemLookup = new Map(ITEMS.map((item) => [item.id, item]));

const buildRecommendation = (overrides: Partial<ItemRecommendation>): ItemRecommendation => ({
  itemId: 'item-expedition-trinket',
  name: 'Expedition Trinket',
  slug: 'expedition-trinket',
  category: 'Trinket',
  rarity: 'Common Trinket',
  action: 'keep',
  rationale: 'Expedition relevant loot',
  sellPrice: 100,
  stackSize: 1,
  stackSellValue: 100,
  salvageValue: 0,
  salvageBreakdown: [],
  questNeeds: [],
  upgradeNeeds: [],
  projectNeeds: [],
  needs: { quests: 0, workshop: 0, projects: 0 },
  wishlistSources: [],
  ...overrides
});

describe('filterLookOutRecommendations', () => {
  it('keeps expedition-only items when expedition planning is enabled', () => {
    const recommendations = [
      buildRecommendation({ expeditionCandidate: true }),
      buildRecommendation({
        itemId: 'item-quest-component',
        name: 'Quest Component',
        slug: 'quest-component',
        category: 'Modification',
        rarity: 'Uncommon Component',
        needs: { quests: 1, workshop: 0, projects: 0 }
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, {
      expeditionPlanningEnabled: true,
      itemLookup
    });

    expect(filtered.map((rec) => rec.itemId)).toEqual([
      'item-expedition-trinket',
      'item-quest-component'
    ]);
  });

  it('drops expedition-only items when expedition planning is disabled', () => {
    const recommendations = [buildRecommendation({ expeditionCandidate: true })];

    const filtered = filterLookOutRecommendations(recommendations, {
      expeditionPlanningEnabled: false,
      itemLookup
    });

    expect(filtered).toHaveLength(0);
  });

  it('sorts expedition candidates ahead of other items when enabled', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-quest-component',
        name: 'Quest Component',
        slug: 'quest-component',
        category: 'Modification',
        rarity: 'Uncommon Component',
        needs: { quests: 1, workshop: 0, projects: 0 }
      }),
      buildRecommendation({ expeditionCandidate: true })
    ];

    const filtered = filterLookOutRecommendations(recommendations, {
      expeditionPlanningEnabled: true,
      itemLookup
    });

    expect(filtered.map((rec) => rec.itemId)).toEqual([
      'item-expedition-trinket',
      'item-quest-component'
    ]);
  });
});
