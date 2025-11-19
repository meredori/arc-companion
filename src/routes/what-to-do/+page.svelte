<svelte:head>
  <title>What To Do | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { RecommendationCard, SearchBar } from '$lib/components';
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
  import type { RecommendationSort } from '$lib/types';
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

  const normalizeCategory = (value: string) => value.toLowerCase().trim();

  const ignoredCategories = derived(settings, ($settings) => $settings.ignoredWantCategories ?? []);
  const ignoredCategorySet = derived(ignoredCategories, ($ignored) => {
    const entries = $ignored.map((entry) => normalizeCategory(entry)).filter((entry) => entry.length > 0);
    return new Set(entries);
  });

  const categoryLookup = new Map<string, string>();
  for (const item of items) {
    const category = item.category?.trim();
    if (!category) continue;
    const normalized = normalizeCategory(category);
    if (!normalized) continue;
    if (!categoryLookup.has(normalized)) {
      categoryLookup.set(normalized, category);
    }
  }

  const categoryOptions = Array.from(categoryLookup.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const toggleIgnoredCategory = (category: string) => {
    settings.toggleIgnoredWantCategory(category);
  };

  const clearIgnoredCategories = () => settings.setIgnoredWantCategories([]);

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
        ignoredCategories: $settings.ignoredWantCategories ?? [],
        wantList: $wantList,
        wantListDependencies: expandWantList($wantList, $items, {
          ignoredCategories: $settings.ignoredWantCategories ?? []
        })
      })
  );

  let recommendations = [];
  let outstandingNeeds = 0;
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
    ignoredCategories: [],
    wantList: [],
    wantListDependencies: []
  });

  $: recommendationContext = $contextStore;
  let recommendationSort: RecommendationSort = 'category';
  $: recommendationSort = $settings.recommendationSort ?? 'category';
  $: recommendations = recommendItemsMatching(query, recommendationContext, {
    sortMode: recommendationSort
  });
  $: outstandingNeeds = recommendItemsMatching('', recommendationContext, {
    sortMode: recommendationSort
  }).reduce(
    (total, rec) => total + rec.needs.quests + rec.needs.workshop + rec.needs.projects,
    0
  );
  const setRecommendationSort = (mode: RecommendationSort) => {
    settings.setRecommendationSort(mode);
  };
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
    <div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-widest text-slate-400">
        <span class="text-slate-500">Ignore categories</span>
        {#if $ignoredCategories.length > 0}
          <button
            type="button"
            class="rounded-full border border-slate-700/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-slate-500"
            on:click={clearIgnoredCategories}
          >
            Clear
          </button>
        {/if}
      </div>
      <div class="flex flex-wrap gap-2">
        {#each categoryOptions as category}
          {@const normalized = normalizeCategory(category)}
          <button
            type="button"
            class={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              $ignoredCategorySet.has(normalized)
                ? 'border-rose-400/80 bg-rose-500/20 text-rose-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
            }`}
            on:click={() => toggleIgnoredCategory(category)}
          >
            {category}
          </button>
        {/each}
      </div>
      <p class="text-[11px] uppercase tracking-[0.3em] text-slate-500">
        {#if $ignoredCategories.length === 0}
          Showing all categories
        {:else}
          Hiding {$ignoredCategories.length} categor{$ignoredCategories.length === 1 ? 'y' : 'ies'}
        {/if}
      </p>
    </div>
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-slate-400">
        <span>{recommendations.length} matches</span>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-slate-300">
            Sorted · {recommendationSort === 'alphabetical'
              ? 'Alphabetical'
              : 'Category → Rarity → Name'}
          </span>
          <div class="flex overflow-hidden rounded-full border border-slate-800">
            <button
              type="button"
              class={`px-3 py-1 text-[10px] font-semibold tracking-[0.3em] transition ${
                recommendationSort === 'category'
                  ? 'bg-slate-300 text-slate-900'
                  : 'bg-slate-950/60 text-slate-300 hover:bg-slate-900'
              }`}
              aria-pressed={recommendationSort === 'category'}
              on:click={() => setRecommendationSort('category')}
            >
              Category
            </button>
            <button
              type="button"
              class={`px-3 py-1 text-[10px] font-semibold tracking-[0.3em] transition ${
                recommendationSort === 'alphabetical'
                  ? 'bg-slate-300 text-slate-900'
                  : 'bg-slate-950/60 text-slate-300 hover:bg-slate-900'
              }`}
              aria-pressed={recommendationSort === 'alphabetical'}
              on:click={() => setRecommendationSort('alphabetical')}
            >
              A → Z
            </button>
          </div>
        </div>
      </div>
      {#if recommendations.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-700/60 bg-slate-950/50 p-6 text-sm text-slate-400">
          Start typing to filter the canonical loot list. Quest and upgrade states adjust the action
          and rationale automatically.
        </div>
      {:else}
        <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
  </section>
</section>
