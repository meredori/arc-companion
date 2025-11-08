import { describe, expect, it } from 'vitest';
import { buildRecommendationContext, recommendItem, recommendItemsMatching } from './recommend';
import type { BlueprintState, ItemRecord, Quest, QuestProgress, UpgradePack } from './types';

const ITEMS: ItemRecord[] = [
  {
    id: 'item-alpha',
    name: 'Alpha Core',
    slug: 'alpha-core',
    sell: 200,
    recycle: [{ itemId: 'mat-a', name: 'Material A', qty: 6 }],
    needsTotals: { quests: 2, workshop: 1 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-beta',
    name: 'Beta Spool',
    slug: 'beta-spool',
    sell: 90,
    recycle: [{ itemId: 'mat-b', name: 'Material B', qty: 4 }],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: false }
  },
  {
    id: 'item-gamma',
    name: 'Gamma Relic',
    slug: 'gamma-relic',
    sell: 50,
    recycle: [{ itemId: 'mat-c', name: 'Material C', qty: 5 }],
    needsTotals: { quests: 0, workshop: 2 },
    provenance: { wiki: true, api: true }
  }
];

const QUESTS: Quest[] = [
  {
    id: 'quest-one',
    name: 'Power Restoration',
    items: [
      { itemId: 'item-alpha', qty: 2 }
    ]
  }
];

const PROGRESS: QuestProgress[] = [{ id: 'quest-one', completed: false }];

const UPGRADES: UpgradePack[] = [
  {
    id: 'upgrade-one',
    name: 'Upgrade One',
    bench: 'Workshop',
    level: 1,
    items: [{ itemId: 'item-gamma', qty: 2 }]
  }
];

const BLUEPRINTS: BlueprintState[] = [
  { id: 'upgrade-one', name: 'Upgrade One', bench: 'Workshop', level: 1, owned: true }
];

describe('recommendation logic', () => {
  const context = buildRecommendationContext({
    items: ITEMS,
    quests: QUESTS,
    questProgress: PROGRESS,
    upgrades: UPGRADES,
    blueprints: BLUEPRINTS
  });

  it('prefers save for quest items', () => {
    const result = recommendItem(ITEMS[0], context);
    expect(result.action).toBe('save');
    expect(result.needs.quests).toBe(2);
    expect(result.rationale).toContain('Required');
  });

  it('suggests keep when blueprint needs the item', () => {
    const result = recommendItem(ITEMS[2], context);
    expect(result.action).toBe('keep');
    expect(result.needs.workshop).toBe(2);
  });

  it('falls back to salvage when recycling beats selling', () => {
    const result = recommendItem(ITEMS[1], context);
    expect(result.action).toBe('salvage');
  });

  it('filters by query', () => {
    const results = recommendItemsMatching('gamma', context);
    expect(results).toHaveLength(1);
    expect(results[0].itemId).toBe('item-gamma');
  });
});
