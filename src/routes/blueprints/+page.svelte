<svelte:head>
  <title>Blueprints | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { RecommendationCard, SearchBar, TipsPanel } from '$lib/components';

  let blueprintQuery = '';
  const blueprintCards = [
    {
      name: 'ARC Suppressor Mk II',
      action: 'save',
      rarity: 'Exotic Blueprint',
      reason: 'Combine with meta materials to unlock a new weapon archetype.'
    },
    {
      name: 'Stabilized Power Conduit',
      action: 'keep',
      rarity: 'Rare Blueprint',
      reason: 'Feeds multiple workshop upgrades and late-game quests.'
    }
  ] as const;

  const blueprintTips = [
    'Ownership toggles will sync to local storage and adjust loot recommendations.',
    'Filter by bench or rarity to plan upgrade paths with your crew.',
    'Admin-imported blueprint metadata will populate categories and sourcing info.'
  ];
</script>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Blueprint Management</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Track owned schematics, plan crafting priorities, and highlight missing components for your next
      upgrades.
    </p>
  </header>

  <section class="section-card space-y-6">
    <SearchBar
      label="Blueprint Catalog"
      placeholder="Filter by name, bench, or rarity"
      value={blueprintQuery}
      on:input={({ detail }) => (blueprintQuery = detail.value)}
    />
    <div class="content-grid">
      <div class="space-y-4">
        {#each blueprintCards as card}
          <RecommendationCard {...card} />
        {/each}
      </div>
      <TipsPanel heading="How blueprints integrate" tips={blueprintTips} />
    </div>
  </section>
</section>
