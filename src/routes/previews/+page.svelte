<script lang="ts">
  import {
    QuestChecklist,
    RecommendationCard,
    RunTimer,
    SearchBar,
    TipsPanel,
    type ChecklistItem
  } from '$lib/components';

  export let data;
  export let form: unknown;
  export let params: Record<string, string>;

  let query = '';
  const checklist: ChecklistItem[] = [
    { id: 'pass-a', label: 'Approve Pass A loot seed', completed: true },
    { id: 'pass-b', label: 'Review enrichment conflicts', completed: false },
    { id: 'pass-c', label: 'Sync MetaForge deltas', completed: false }
  ];

  const recommendations = [
    {
      name: 'Advanced ARC Powercell',
      action: 'save',
      rarity: 'Epic Component',
      reason: 'Needed for upcoming workshop upgrade quests.',
      category: 'Misc',
      slug: 'advanced-arc-powercell',
      sellPrice: 640,
      salvageValue: 960,
      questNeeds: [{ questId: 'quest-one', name: 'Power Restoration', qty: 2 }],
      upgradeNeeds: [],
      salvageBreakdown: [{ itemId: 'mat-arc-powercell', name: 'ARC Powercell', qty: 2 }],
      needs: { quests: 2, workshop: 0 },
      variant: 'token'
    },
    {
      name: 'Damaged Servo Gear',
      action: 'salvage',
      rarity: 'Common Salvage',
      category: 'Scrap',
      slug: 'damaged-servo-gear',
      reason: 'Break down extras for recycler tokens.',
      salvageValue: 210,
      salvageBreakdown: [
        { itemId: 'mat-servo', name: 'Servo', qty: 2 },
        { itemId: 'mat-gear', name: 'Gear Bits', qty: 1 }
      ],
      needs: { quests: 0, workshop: 0 },
      variant: 'token'
    }
  ] as const;

  const tips = [
    'Prioritize finishing the MetaForge weekly to unlock higher sell values.',
    'Coordinate blueprints with your crew to reduce duplicate grinding.',
    'Track recycler yields after each run to calibrate recommendations.'
  ];
</script>

<svelte:head>
  <title>Component Previews | ARC Companion</title>
</svelte:head>

<div class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Component Preview Gallery</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Designers and stakeholders can use this gallery to validate styling tokens, responsive behavior,
      and baseline component structure before wiring in live data.
    </p>
  </header>

  <section class="section-card space-y-6">
    <div class="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div class="space-y-6">
        <SearchBar
          label="Find Items"
          placeholder="Search by name or category"
          value={query}
          on:input={({ detail }) => (query = detail.value)}
        />
        <div class="grid gap-4 md:grid-cols-2">
          {#each recommendations as rec}
            <RecommendationCard {...rec} />
          {/each}
        </div>
      </div>
      <TipsPanel heading="Recommendation Tips" {tips} />
    </div>
  </section>

  <section class="section-card space-y-6">
    <div class="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <QuestChecklist title="Onboarding Checklist" items={checklist} />
      <RunTimer label="Demo Run" elapsed={295} isRunning={true} />
    </div>
  </section>
</div>
