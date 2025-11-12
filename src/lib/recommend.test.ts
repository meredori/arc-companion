import { describe, expect, it } from 'vitest';
import { buildRecommendationContext, recommendItem, recommendItemsMatching } from './recommend';
import type {
  BlueprintState,
  ItemRecord,
  Project,
  ProjectProgressState,
  Quest,
  QuestProgress,
  UpgradePack,
  WorkbenchUpgradeState
} from './types';

const ITEMS: ItemRecord[] = [
  {
    id: 'item-alpha',
    name: 'Alpha Core',
    slug: 'alpha-core',
    category: 'Power',
    rarity: 'Epic Component',
    sell: 200,
    recycle: [{ itemId: 'mat-a', name: 'Material A', qty: 6 }],
    needsTotals: { quests: 2, workshop: 1 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-beta',
    name: 'Beta Spool',
    slug: 'beta-spool',
    category: 'Scrap',
    rarity: 'Common Salvage',
    sell: 90,
    recycle: [{ itemId: 'mat-b', name: 'Material B', qty: 4 }],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: false }
  },
  {
    id: 'item-gamma',
    name: 'Gamma Relic',
    slug: 'gamma-relic',
    category: 'Artifacts',
    rarity: 'Rare Component',
    sell: 50,
    recycle: [{ itemId: 'mat-c', name: 'Material C', qty: 5 }],
    needsTotals: { quests: 0, workshop: 2 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-weapon-legendary',
    name: 'Nova Cannon',
    slug: 'nova-cannon',
    category: 'Weapon',
    rarity: 'Legendary Weapon',
    sell: 120,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-shotgun-epic',
    name: 'Cyclone Shotgun',
    slug: 'cyclone-shotgun',
    category: 'Shotgun',
    rarity: 'Epic Weapon',
    sell: 110,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-pistol-rare',
    name: 'Warden Pistol',
    slug: 'warden-pistol',
    category: 'Pistol',
    rarity: 'Rare Weapon',
    sell: 95,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-keycard',
    name: 'Ruined Keycard',
    slug: 'ruined-keycard',
    category: 'Keys',
    rarity: 'Uncommon Key',
    sell: 20,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-mod-epic',
    name: 'Mod Apex',
    slug: 'mod-apex',
    category: 'Mod',
    rarity: 'Epic Component',
    sell: 60,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-mod-rare',
    name: 'Mod Ridge',
    slug: 'mod-ridge',
    category: 'Mod',
    rarity: 'Rare Component',
    sell: 55,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-topside-rare',
    name: 'Topside Alloy',
    slug: 'topside-alloy',
    category: 'Topside Material',
    rarity: 'Rare Material',
    sell: 40,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-refined-epic',
    name: 'Refined Matrix',
    slug: 'refined-matrix',
    category: 'Refined Material',
    rarity: 'Epic Material',
    sell: 60,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-nature-common',
    name: 'Nature Root',
    slug: 'nature-root',
    category: 'Nature',
    rarity: 'Common Trinket',
    sell: 15,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-trinket-rare',
    name: 'Trinket Charm',
    slug: 'trinket-charm',
    category: 'Trinket',
    rarity: 'Rare Trinket',
    sell: 25,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
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
  { id: 'item-anvil-blueprint', owned: true, name: 'Anvil Blueprint' }
];

const WORKBENCH_UPGRADES: WorkbenchUpgradeState[] = [
  { id: 'upgrade-one', name: 'Upgrade One', bench: 'Workshop', level: 1, owned: true }
];

const PROJECTS: Project[] = [
  {
    id: 'project-expedition',
    name: 'Expedition',
    description: 'Long-term expedition project.',
    phases: [
      {
        id: 'project-expedition-phase-1',
        order: 1,
        name: 'Foundation',
        description: null,
        requirements: [
          { itemId: 'item-topside-rare', qty: 2 },
          { itemId: 'item-refined-epic', qty: 1 }
        ]
      }
    ]
  }
];

const PROJECT_PROGRESS: ProjectProgressState = {
  'project-expedition': {
    'project-expedition-phase-1': {
      'item-topside-rare': 1
    }
  }
};

describe('recommendation logic', () => {
const context = buildRecommendationContext({
  items: ITEMS,
  quests: QUESTS,
  questProgress: PROGRESS,
  upgrades: UPGRADES,
  blueprints: BLUEPRINTS,
  workbenchUpgrades: WORKBENCH_UPGRADES,
  projects: PROJECTS,
  projectProgress: PROJECT_PROGRESS,
  alwaysKeepCategories: ['Keys']
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
    expect(result.rationale).toContain('workbench upgrades');
  });

  it('falls back to salvage when recycling beats selling', () => {
    const result = recommendItem(ITEMS[1], context);
    expect(result.action).toBe('salvage');
  });

  it('forces keep for admin-selected categories', () => {
    const result = recommendItem(ITEMS[3], context);
    expect(result.action).toBe('keep');
    expect(result.alwaysKeepCategory).toBe(true);
    expect(result.rationale).toContain('always keep');
  });

  it('orders results by custom category priority before rarity and name', () => {
    const results = recommendItemsMatching('', context);
    const modIndex = results.findIndex((entry) => entry.category === 'Mod');
    const keyIndex = results.findIndex((entry) => entry.category === 'Keys');
    expect(modIndex).toBeGreaterThan(-1);
    expect(keyIndex).toBeGreaterThan(-1);
    expect(modIndex).toBeLessThan(keyIndex);
  });

  it('sorts weapon subcategories alongside main weapon priority', () => {
    const results = recommendItemsMatching('', context);
    const modIndex = results.findIndex((entry) => entry.category === 'Mod');
    const weaponGroup = results.filter((entry) =>
      ['Weapon', 'Shotgun', 'Pistol'].includes(entry.category ?? '')
    );
    expect(weaponGroup).toHaveLength(3);
    const weaponNames = weaponGroup.map((entry) => entry.name);
    expect(weaponNames).toEqual(['Nova Cannon', 'Cyclone Shotgun', 'Warden Pistol']);
    weaponGroup.forEach((entry) => {
      const index = results.findIndex((candidate) => candidate.itemId === entry.itemId);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeLessThan(modIndex);
    });
  });

  it('sorts higher rarity items ahead within the same category', () => {
    const results = recommendItemsMatching('mod', context);
    expect(results.map((rec) => rec.name)).toEqual(['Mod Apex', 'Mod Ridge']);
  });

  it('treats material subcategories as one group sorted by rarity', () => {
    const materialResults = recommendItemsMatching('', context).filter((rec) =>
      ['Topside Material', 'Refined Material', 'Recyclable', 'Material (Topside, Refined, Recyclable)'].includes(
        rec.category ?? ''
      )
    );
    expect(materialResults.map((rec) => rec.name)).toEqual(['Refined Matrix', 'Topside Alloy']);
  });

  it('combines nature and trinket categories before rarity ordering', () => {
    const natureResults = recommendItemsMatching('', context).filter((rec) =>
      ['Nature', 'Trinket', 'Nature + Trinket'].includes(rec.category ?? '')
    );
    expect(natureResults.map((rec) => rec.name)).toEqual(['Trinket Charm', 'Nature Root']);
  });

  it('flags items required for expedition projects', () => {
    const result = recommendItem(ITEMS[6], context);
    expect(result.action).toBe('keep');
    expect(result.needs.projects).toBe(1);
    expect(result.projectNeeds[0].projectId).toBe('project-expedition');
  });

  it('filters by query', () => {
    const results = recommendItemsMatching('gamma', context);
    expect(results).toHaveLength(1);
    expect(results[0].itemId).toBe('item-gamma');
  });
});
