<svelte:head>
  <title>What To Do | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { RecommendationCard, SearchBar, TipsPanel } from '$lib/components';
  import {
    blueprints,
    expandWantList,
    hydrateFromCanonical,
    itemOverrides,
    projectProgress,
    quests,
    settings,
    wantList,
    workbenchUpgrades
  } from '$lib/stores/app';
  import { buildRecommendationContext, recommendItemsMatching } from '$lib/recommend';
  import { tipsForWhatToDo } from '$lib/tips';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __whatToDoProps = { form, params };
  void __whatToDoProps;

  const { items, quests: questDefs, workbenchUpgrades: upgradeDefs, projects } = data;

  onMount(() => {
    hydrateFromCanonical({
      quests: questDefs.map((quest) => ({ id: quest.id, completed: false })),
      workbenchUpgrades: upgradeDefs.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      }))
    });
  });

  let query = '';

  const itemsWithOverrides = derived(itemOverrides, ($overrides) =>
    items.map((item) => ({ ...item, ...($overrides[item.id] ?? {}) }))
  );

  const contextStore = derived(
    [quests, blueprints, settings, itemsWithOverrides, projectProgress, workbenchUpgrades, wantList],
    ([$quests, $blueprints, $settings, $items, $projectProgress, $workbench, $wantList]) =>
      buildRecommendationContext({
        items: $items,
        quests: questDefs,
        questProgress: $quests,
        upgrades: upgradeDefs,
        blueprints: $blueprints,
        workbenchUpgrades: $workbench,
        projects,
        projectProgress: $projectProgress,
        alwaysKeepCategories: $settings.alwaysKeepCategories ?? [],
        wantList: $wantList,
        wantListDependencies: expandWantList($wantList, $items)
      })
  );

  let recommendations = [];
  let outstandingNeeds = 0;
  let focusTips: string[] = [];
  let recommendationContext = buildRecommendationContext({
    items,
    quests: questDefs,
    questProgress: [],
    upgrades: upgradeDefs,
    blueprints: [],
    workbenchUpgrades: [],
    projects,
    projectProgress: {},
    alwaysKeepCategories: [],
    wantList: [],
    wantListDependencies: []
  });

  $: recommendationContext = $contextStore;
  $: recommendations = recommendItemsMatching(query, recommendationContext);
  $: outstandingNeeds = recommendItemsMatching('', recommendationContext).reduce(
    (total, rec) => total + rec.needs.quests + rec.needs.workshop + rec.needs.projects,
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
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-slate-400">
          <span>{recommendations.length} matches</span>
          <span class="text-slate-300">Sorted · Category → Rarity → Name</span>
        </div>
        {#if recommendations.length === 0}
          <div class="rounded-2xl border border-dashed border-slate-700/60 bg-slate-950/50 p-6 text-sm text-slate-400">
            Start typing to filter the canonical loot list. Quest and upgrade states adjust the action
            and rationale automatically.
          </div>
        {:else}
          <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {#each recommendations as recommendation}
              <RecommendationCard
                variant="token"
                name={recommendation.name}
                action={recommendation.action}
                rarity={recommendation.rarity}
                reason={recommendation.rationale}
                category={recommendation.category}
                slug={recommendation.slug}
                imageUrl={recommendation.imageUrl}
                sellPrice={recommendation.sellPrice}
                salvageValue={recommendation.salvageValue}
                salvageBreakdown={recommendation.salvageBreakdown}
                questNeeds={recommendation.questNeeds}
                upgradeNeeds={recommendation.upgradeNeeds}
                projectNeeds={recommendation.projectNeeds}
                needs={recommendation.needs}
                alwaysKeepCategory={recommendation.alwaysKeepCategory}
                wishlistSources={recommendation.wishlistSources}
              />
            {/each}
          </div>
        {/if}
      </div>
      <TipsPanel heading="How recommendations adapt" tips={focusTips} />
    </div>
  </section>
</section>
