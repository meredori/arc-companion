<svelte:head>
  <title>What To Do | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { RecommendationCard, SearchBar, TipsPanel } from '$lib/components';
  import { blueprints, hydrateFromCanonical, quests } from '$lib/stores/app';
  import { buildRecommendationContext, recommendItemsMatching } from '$lib/recommend';
  import { tipsForWhatToDo } from '$lib/tips';
  import type { PageData } from './$types';

  export let data: PageData;

  const { items, quests: questDefs, upgrades } = data;

  onMount(() => {
    hydrateFromCanonical(
      questDefs.map((quest) => ({ id: quest.id, completed: false })),
      upgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      }))
    );
  });

  let query = '';

  const contextStore = derived([quests, blueprints], ([$quests, $blueprints]) =>
    buildRecommendationContext({
      items,
      quests: questDefs,
      questProgress: $quests,
      upgrades,
      blueprints: $blueprints
    })
  );

  let recommendations = [];
  let outstandingNeeds = 0;
  let focusTips: string[] = [];
  let recommendationContext = buildRecommendationContext({
    items,
    quests: questDefs,
    questProgress: [],
    upgrades,
    blueprints: []
  });

  $: recommendationContext = $contextStore;
  $: recommendations = recommendItemsMatching(query, recommendationContext);
  $: outstandingNeeds = recommendItemsMatching('', recommendationContext).reduce(
    (total, rec) => total + rec.needs.quests + rec.needs.workshop,
    0
  );
  $: focusTips = tipsForWhatToDo(outstandingNeeds);
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
        {#if recommendations.length === 0}
          <div class="rounded-2xl border border-dashed border-slate-700/60 bg-slate-950/50 p-6 text-sm text-slate-400">
            Start typing to filter the canonical loot list. Quest and upgrade states adjust the action
            and rationale automatically.
          </div>
        {:else}
          {#each recommendations as recommendation}
            <RecommendationCard
              name={recommendation.name}
              action={recommendation.action}
              rarity={recommendation.rarity}
              reason={recommendation.rationale}
            />
          {/each}
        {/if}
      </div>
      <TipsPanel heading="How recommendations adapt" tips={focusTips} />
    </div>
  </section>
</section>
