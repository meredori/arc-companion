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
    id: 'item-lmg-uncommon',
    name: 'Tempest LMG',
    slug: 'tempest-lmg',
    category: 'LMG',
    rarity: 'Uncommon Weapon',
    sell: 105,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-handcannon',
    name: 'Parallax Hand Cannon',
    slug: 'parallax-hand-cannon',
    category: 'Hand Cannon',
    rarity: 'Uncommon Weapon',
    sell: 100,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-kettle-i',
    name: 'Kettle I',
    slug: 'kettle-i',
    category: 'Assault Rifle',
    rarity: 'Common Weapon',
    sell: 90,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-kettle-ii',
    name: 'Kettle II',
    slug: 'kettle-ii',
    category: 'Weapon',
    rarity: 'Common Weapon',
    sell: 90,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-kettle-iii',
    name: 'Kettle III',
    slug: 'kettle-iii',
    category: 'Weapon',
    rarity: 'Common Weapon',
    sell: 90,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-kettle-iv',
    name: 'Kettle IV',
    slug: 'kettle-iv',
    category: 'Weapon',
    rarity: 'Common Weapon',
    sell: 90,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-keycard',
    name: 'Ruined Keycard',
    slug: 'ruined-keycard',
    category: 'Key',
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
    category: 'Modification',
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
    category: 'Modification',
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
  },
  {
    id: 'item-cloak',
    name: 'Photoelectric Cloak',
    slug: 'photoelectric-cloak',
    category: 'Quick Use',
    rarity: 'Epic Utility',
    sell: 150,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-gas-grenade',
    name: 'Gas Grenade',
    slug: 'gas-grenade',
    category: 'Quick Use',
    rarity: 'Rare Utility',
    sell: 120,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-adrenaline',
    name: 'Adrenaline Shot',
    slug: 'adrenaline-shot',
    category: 'Quick Use',
    rarity: 'Uncommon Utility',
    sell: 90,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-vita-spray',
    name: 'Vita Spray',
    slug: 'vita-spray',
    category: 'Quick Use',
    rarity: 'Uncommon Utility',
    sell: 85,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-bandage',
    name: 'Bandage',
    slug: 'bandage',
    category: 'Quick Use',
    rarity: 'Common Utility',
    sell: 50,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  },
  {
    id: 'item-barricade-kit',
    name: 'Barricade Kit',
    slug: 'barricade-kit',
    category: 'Quick Use',
    rarity: 'Uncommon Utility',
    sell: 70,
    recycle: [],
    needsTotals: { quests: 0, workshop: 0 },
    provenance: { wiki: true, api: true }
  }
];

const getItem = (id: string) => {
  const match = ITEMS.find((entry) => entry.id === id);
  if (!match) {
    throw new Error(`expected fixture for ${id}`);
  }
  return match;
};

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
  alwaysKeepCategories: ['Key']
});

  it('prefers save for quest items', () => {
    const result = recommendItem(getItem('item-alpha'), context);
    expect(result.action).toBe('save');
    expect(result.needs.quests).toBe(2);
    expect(result.rationale).toContain('Required');
  });

  it('suggests keep when blueprint needs the item', () => {
    const result = recommendItem(getItem('item-gamma'), context);
    expect(result.action).toBe('keep');
    expect(result.needs.workshop).toBe(2);
    expect(result.rationale).toContain('workbench upgrades');
  });

  it('falls back to salvage when recycling beats selling', () => {
    const result = recommendItem(getItem('item-beta'), context);
    expect(result.action).toBe('salvage');
  });

  it('forces keep for admin-selected categories', () => {
    const keyItem = ITEMS.find((entry) => entry.category === 'Key');
    if (!keyItem) throw new Error('expected key fixture');
    const result = recommendItem(keyItem, context);
    expect(result.action).toBe('keep');
    expect(result.alwaysKeepCategory).toBe(true);
    expect(result.rationale).toContain('always keep');
  });

  it('orders results by custom category priority before rarity and name', () => {
    const results = recommendItemsMatching('', context);
    const modIndex = results.findIndex((entry) => entry.category === 'Modification');
    const keyIndex = results.findIndex((entry) => entry.category === 'Key');
    expect(modIndex).toBeGreaterThan(-1);
    expect(keyIndex).toBeGreaterThan(-1);
    expect(modIndex).toBeLessThan(keyIndex);
  });

  it('sorts weapon subcategories alongside main weapon priority', () => {
    const results = recommendItemsMatching('', context);
    const modIndex = results.findIndex((entry) => entry.category === 'Modification');
    const weaponGroup = results.filter((entry) =>
      ['Weapon', 'Shotgun', 'Pistol', 'LMG', 'Hand Cannon', 'Assault Rifle'].includes(
        entry.category ?? ''
      )
    );
    expect(weaponGroup).toHaveLength(6);
    expect(weaponGroup.map((entry) => entry.name)).toEqual([
      'Nova Cannon',
      'Cyclone Shotgun',
      'Warden Pistol',
      'Parallax Hand Cannon',
      'Tempest LMG',
      'Kettle I'
    ]);
    weaponGroup.forEach((entry) => {
      const index = results.findIndex((candidate) => candidate.itemId === entry.itemId);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeLessThan(modIndex);
    });
  });

  it('hides higher-tier weapon variants when base exists', () => {
    const results = recommendItemsMatching('kettle', context);
    const kettleNames = results.map((entry) => entry.name);
    expect(kettleNames).toEqual(['Kettle I']);
  });

  it('orders quick use items by craft bench priority', () => {
    const quickUseOrder = recommendItemsMatching('', context)
      .filter((entry) => entry.category === 'Quick Use')
      .map((entry) => entry.name);
    expect(quickUseOrder).toEqual([
      'Photoelectric Cloak',
      'Gas Grenade',
      'Adrenaline Shot',
      'Vita Spray',
      'Bandage',
      'Barricade Kit'
    ]);
  });

  it('sorts higher rarity items ahead within the same category', () => {
    const results = recommendItemsMatching('mod', context);
    expect(results.map((rec) => rec.name)).toEqual(['Mod Apex', 'Mod Ridge']);
  });

  it('treats material subcategories as one group sorted by rarity', () => {
    const materialResults = recommendItemsMatching('', context).filter((rec) =>
      ['Topside Material', 'Refined Material', 'Material', 'Basic Material', 'Recyclable'].includes(
        rec.category ?? ''
      )
    );
    expect(materialResults.map((rec) => rec.name)).toEqual(['Refined Matrix', 'Topside Alloy']);
  });

  it('combines nature and trinket categories before rarity ordering', () => {
    const natureResults = recommendItemsMatching('', context).filter((rec) =>
      ['Nature', 'Trinket'].includes(rec.category ?? '')
    );
    expect(natureResults.map((rec) => rec.name)).toEqual(['Trinket Charm', 'Nature Root']);
  });

  it('flags items required for expedition projects', () => {
    const projectItem = ITEMS.find((entry) => entry.id === 'item-topside-rare');
    if (!projectItem) throw new Error('expected project fixture');
    const result = recommendItem(projectItem, context);
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
