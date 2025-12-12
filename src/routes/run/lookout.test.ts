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
  },
  {
    id: 'mat-basic',
    name: 'Basic Resin',
    slug: 'basic-resin',
    category: 'Basic Material',
    rarity: 'Common Material',
    sell: 5,
    stackSize: 10,
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
  it('keeps items with direct quest needs', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-quest-component',
        name: 'Quest Component',
        slug: 'quest-component',
        category: 'Modification',
        rarity: 'Uncommon Component',
        needs: { quests: 1, workshop: 0, projects: 0 }
      }),
      buildRecommendation({ itemId: 'item-expedition-trinket', needs: { quests: 0, workshop: 0, projects: 0 } })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered.map((rec) => rec.itemId)).toEqual(['item-quest-component']);
  });

  it('drops items that only recycle into basic materials', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-expedition-trinket',
        action: 'recycle',
        salvageBreakdown: [{ itemId: 'mat-basic', name: 'Basic Resin', qty: 2 }]
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered).toHaveLength(0);
  });

  it('drops recyclables that only feed wishlist via basic materials', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-expedition-trinket',
        action: 'recycle',
        salvageBreakdown: [{ itemId: 'mat-basic', name: 'Basic Resin', qty: 2 }],
        wishlistSources: [
          {
            targetItemId: 'mat-basic',
            targetName: 'Basic Resin',
            note: 'restock',
            kind: 'requirement'
          }
        ]
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered).toHaveLength(0);
  });

  it('drops items flagged as basic material by type', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'mat-basic',
        name: 'Basic Resin',
        slug: 'basic-resin',
        category: 'Material',
        type: 'Basic Material'
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered).toHaveLength(0);
  });

  it('drops recyclable wishlist items when breakdown entries mark basic material type', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-expedition-trinket',
        action: 'recycle',
        salvageBreakdown: [{ itemId: 'unknown-basic', name: 'Unknown Basic', qty: 1, type: 'Basic Material' }],
        wishlistSources: [
          {
            targetItemId: 'unknown-basic',
            targetName: 'Unknown Basic',
            note: 'restock',
            kind: 'requirement'
          }
        ]
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered).toHaveLength(0);
  });

  it('drops recyclable wishlist items when wishlist targets are basic materials even if the breakdown has other items', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-expedition-trinket',
        action: 'recycle',
        salvageBreakdown: [
          { itemId: 'item-quest-component', name: 'Quest Component', qty: 1 },
          { itemId: 'mat-basic', name: 'Basic Resin', qty: 1 }
        ],
        wishlistSources: [
          {
            targetItemId: 'mat-basic',
            targetName: 'Basic Resin',
            note: 'restock',
            kind: 'requirement'
          }
        ]
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered).toHaveLength(0);
  });

  it('sorts direct needs ahead of supporting recyclables', () => {
    const recommendations = [
      buildRecommendation({
        itemId: 'item-quest-component',
        name: 'Quest Component',
        slug: 'quest-component',
        category: 'Modification',
        rarity: 'Uncommon Component',
        needs: { quests: 1, workshop: 0, projects: 0 }
      }),
      buildRecommendation({
        itemId: 'item-expedition-trinket',
        action: 'recycle',
        salvageBreakdown: [{ itemId: 'item-quest-component', name: 'Quest Component', qty: 1 }]
      })
    ];

    const filtered = filterLookOutRecommendations(recommendations, { itemLookup });

    expect(filtered.map((rec) => rec.itemId)).toEqual([
      'item-quest-component',
      'item-expedition-trinket'
    ]);
  });
});
