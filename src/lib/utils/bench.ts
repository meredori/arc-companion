export const QUICK_USE_BENCH_PRIORITY = [
  'utility_bench',
  'explosives_bench',
  'med_station',
  'medical_bench',
  'workbench',
  'none'
] as const;

export type QuickUseBenchKey = (typeof QUICK_USE_BENCH_PRIORITY)[number];

export const QUICK_USE_BENCH_LOOKUP = new Map<QuickUseBenchKey, number>(
  QUICK_USE_BENCH_PRIORITY.map((label, index) => [label, index])
);

export const QUICK_USE_BENCH_BY_SLUG = new Map<string, QuickUseBenchKey>([
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

export const BENCH_LABELS: Record<string, string> = {
  all: 'All benches',
  workbench: 'Workbench',
  utility_bench: 'Utility Bench',
  explosives_bench: 'Explosives Bench',
  med_station: 'Med Station',
  medical_bench: 'Medical Bench',
  none: 'No bench'
};

export const DEFAULT_BENCH_ORDER = [
  'workbench',
  'utility_bench',
  'explosives_bench',
  'med_station',
  'medical_bench',
  'none'
];
