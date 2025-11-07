<svelte:head>
  <title>What To Do | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { RecommendationCard, SearchBar, TipsPanel } from '$lib/components';

  let query = '';
  const sampleRecommendations = [
    {
      name: 'Recovered ARC Battery',
      action: 'keep',
      rarity: 'Rare Component',
      reason: 'Needed for MetaForge weekly objective and crew upgrade path.'
    },
    {
      name: 'Frayed Wiring Bundle',
      action: 'sell',
      rarity: 'Common Salvage',
      reason: 'Abundant drop rate. Sell extras to fund blueprint crafting.'
    }
  ] as const;

  const focusTips = [
    'Search by quest, rarity, or vendor to surface matching loot guidance.',
    'Complete the Track section to unlock personalized item priorities.',
    'Sync blueprint ownership to adjust salvage recommendations.'
  ];
</script>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Item Recommendation Lookup</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Search for any loot item to preview the deterministic action that will be recommended once data
      imports and personalization stores are connected.
    </p>
  </header>

  <section class="section-card space-y-6">
    <SearchBar
      label="Find Loot"
      placeholder="Search items, quests, or vendors"
      value={query}
      on:input={({ detail }) => (query = detail.value)}
    />
    <div class="content-grid">
      <div class="space-y-4">
        {#each sampleRecommendations as recommendation}
          <RecommendationCard {...recommendation} />
        {/each}
      </div>
      <TipsPanel heading="How recommendations adapt" tips={focusTips} />
    </div>
  </section>
</section>
