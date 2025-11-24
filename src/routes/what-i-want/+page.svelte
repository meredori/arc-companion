<svelte:head>
  <title>What I Want | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { base } from '$app/paths';
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { SearchBar } from '$lib/components';
  import {
    blueprints,
    expandWantList,
    hydrateFromCanonical,
    projectProgress,
    quests,
    settings,
    wantList,
    workbenchUpgrades as workbenchState
  } from '$lib/stores/app';
  import { buildRecommendationContext, recommendItemsMatching } from '$lib/recommend';
  import { BENCH_LABELS, DEFAULT_BENCH_ORDER, QUICK_USE_BENCH_BY_SLUG } from '$lib/utils/bench';
  import type { ItemRecord, Project, Quest, UpgradePack, WantListRequirement } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __whatIWantProps = { form, params };
  void __whatIWantProps;

  const items: ItemRecord[] = data.items ?? [];
  const blueprintItems: ItemRecord[] = data.blueprints ?? [];
  const benchUpgrades: UpgradePack[] = data.workbenchUpgrades ?? [];
  const questDefs: Quest[] = data.quests ?? [];
  const projects: Project[] = data.projects ?? [];

  onMount(() => {
    hydrateFromCanonical({
      workbenchUpgrades: benchUpgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      })),
      blueprints: blueprintItems.map((blueprint) => ({
        id: blueprint.id,
        name: blueprint.name,
        slug: blueprint.slug,
        rarity: blueprint.rarity ?? null,
        category: blueprint.category ?? null,
        imageUrl: blueprint.imageUrl ?? null,
        owned: false
      }))
    });
  });

  const blueprintStateMap = derived(blueprints, ($blueprints) => {
    const map = new Map<string, { owned: boolean }>();
    $blueprints.forEach((entry) => {
      map.set(entry.id, { owned: entry.owned });
    });
    return map;
  });

  const resolvedEntries = derived(
    [wantList, settings],
    ([$wantList, $settings]) =>
      expandWantList($wantList, items, {
        ignoredCategories: $settings.ignoredWantCategories ?? []
      })
  );

  const blueprintSlugLookup = new Map<string, ItemRecord>();
  const blueprintNameLookup = new Map<string, ItemRecord>();
  for (const blueprint of blueprintItems) {
    if (blueprint.slug) {
      blueprintSlugLookup.set(blueprint.slug, blueprint);
      blueprintSlugLookup.set(blueprint.slug.replace(/-blueprint$/, ''), blueprint);
      blueprintSlugLookup.set(`${blueprint.slug}-blueprint`, blueprint);
    }
    const normalizedName = blueprint.name.toLowerCase();
    blueprintNameLookup.set(normalizedName, blueprint);
    blueprintNameLookup.set(normalizedName.replace(/\s+blueprint$/, ''), blueprint);
    blueprintNameLookup.set(`${normalizedName} blueprint`, blueprint);
  }

  const anchorForBlueprint = (blueprint: ItemRecord) => {
    if (blueprint.slug && blueprint.slug.trim()) {
      return `blueprint-${blueprint.slug}`;
    }
    const fallback = blueprint.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
    return `blueprint-${fallback || blueprint.id}`;
  };

  const recipeLinkForItem = (item: ItemRecord) => {
    const blueprint = findBlueprintForItem(item);
    if (!blueprint) return null;
    const anchor = anchorForBlueprint(blueprint);
    return {
      href: `${base}/what-i-have#${anchor}`.replace(/\/{2,}/g, '/').replace(':/', '://'),
      blueprint
    };
  };

  let search = '';
  let benchFilter = 'all';
  let blueprintFilter: 'any' | 'owned' | 'missing' = 'any';
  let quantityDrafts: Record<string, number> = {};
  let showFinder = true;

  const findBlueprintForItem = (item: ItemRecord) => {
    if (!item.slug && !item.name) return undefined;
    const slug = item.slug ?? '';
    const nameKey = item.name.toLowerCase();
    return (
      blueprintSlugLookup.get(`${slug}-blueprint`) ??
      blueprintSlugLookup.get(slug) ??
      blueprintNameLookup.get(nameKey) ??
      blueprintNameLookup.get(`${nameKey} blueprint`)
    );
  };

  const inferBenchForItem = (item: ItemRecord) => {
    if (item.category?.toLowerCase() === 'quick use') {
      return QUICK_USE_BENCH_BY_SLUG.get(item.slug) ?? 'workbench';
    }
    return 'workbench';
  };

  const rarityGradients: Record<string, string> = {
    legendary: 'from-amber-500/20 via-amber-600/20 to-amber-900/40 border-amber-400/60',
    epic: 'from-fuchsia-500/20 via-fuchsia-600/20 to-fuchsia-900/40 border-fuchsia-400/60',
    rare: 'from-sky-500/20 via-sky-600/20 to-sky-900/40 border-sky-400/60',
    uncommon: 'from-emerald-500/20 via-emerald-600/20 to-emerald-900/40 border-emerald-400/60',
    common: 'from-slate-500/10 via-slate-700/10 to-slate-900/30 border-slate-600/60',
    default: 'from-slate-900/60 via-slate-900/50 to-slate-950/80 border-slate-800/70'
  };

  const rarityClass = (rarity?: string | null) =>
    rarityGradients[rarity?.toLowerCase() ?? 'default'] ?? rarityGradients.default;

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (!url.startsWith('/')) return url;
    return `${base}${url}`.replace(/\/{2,}/g, '/').replace(':/', '://');
  };

  const initialsForName = (value?: string | null) =>
    value
      ?.split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 3)
      .join('')
      .toUpperCase() || 'ARC';

  const initialsForItem = (item?: ItemRecord | null) => initialsForName(item?.name);

  const nonBlueprintItems = items.filter((item) => item.category?.toLowerCase() !== 'blueprint');

  const benchUsage = new Map<string, number>();
  for (const item of nonBlueprintItems) {
    const key = inferBenchForItem(item);
    benchUsage.set(key, (benchUsage.get(key) ?? 0) + 1);
  }

  const benchOptions = ['all']
    .concat(DEFAULT_BENCH_ORDER.filter((key) => benchUsage.has(key)))
    .concat(Array.from(benchUsage.keys()).filter((key) => !DEFAULT_BENCH_ORDER.includes(key)));

  $: if (!benchOptions.includes(benchFilter)) {
    benchFilter = 'all';
  }

  const labelForBench = (key: string) => {
    if (BENCH_LABELS[key]) return BENCH_LABELS[key];
    return key
      .split(/[_-]/)
      .map((part) => (part ? part[0]?.toUpperCase() + part.slice(1) : ''))
      .join(' ');
  };

  const getQuantityDraft = (itemId: string) => quantityDrafts[itemId] ?? 1;
  const setQuantityDraft = (itemId: string, value: number) => {
    const normalized = Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
    quantityDrafts = { ...quantityDrafts, [itemId]: normalized };
  };

  const getDirectRequirements = (requirements: WantListRequirement[] = []) =>
    requirements.filter((requirement) => requirement.depth === 1);

  const clearQuantityDraft = (itemId: string) => {
    const next = { ...quantityDrafts };
    delete next[itemId];
    quantityDrafts = next;
  };

  const blueprintStatusForItem = (item: ItemRecord, stateMap: Map<string, { owned: boolean }>) => {
    const blueprint = findBlueprintForItem(item);
    if (!blueprint) return 'unknown';
    const record = stateMap.get(blueprint.id);
    if (!record) return 'missing';
    return record.owned ? 'owned' : 'missing';
  };

  const addToWantList = (item: ItemRecord) => {
    const qty = getQuantityDraft(item.id);
    wantList.add({ itemId: item.id, qty });
    clearQuantityDraft(item.id);
  };

  const removeEntry = (itemId: string) => wantList.remove(itemId);

  let filteredItems: ItemRecord[] = nonBlueprintItems;

  $: {
    const normalizedSearch = search.trim().toLowerCase();
    const blueprintStates = $blueprintStateMap;
    filteredItems = nonBlueprintItems.filter((item) => {
      if (normalizedSearch) {
        const haystack = `${item.name} ${item.slug} ${item.category ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      if (benchFilter !== 'all') {
        const benchKeyValue = inferBenchForItem(item);
        if (benchKeyValue !== benchFilter) {
          return false;
        }
      }
      if (blueprintFilter !== 'any') {
        const state = blueprintStatusForItem(item, blueprintStates);
        if (state === 'unknown') {
          return false;
        }
        if (blueprintFilter === 'owned' && state !== 'owned') return false;
        if (blueprintFilter === 'missing' && state !== 'missing') return false;
      }
      return true;
    });
  }

  const wishlistHasItem = derived(wantList, ($wantList) => new Set($wantList.map((entry) => entry.itemId)));

  const rarityRank = (rarity?: string | null) => {
    const priority = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const normalized = rarity?.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return priority.length;
    const token = normalized.split(/[^a-z]+/i)[0] ?? '';
    const index = priority.findIndex((label) => label === token);
    if (index !== -1) return index;
    const fuzzy = priority.findIndex((label) => normalized.startsWith(label));
    return fuzzy === -1 ? priority.length : fuzzy;
  };

  type WishlistImpactPreview = {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    action: 'keep' | 'recycle' | 'save' | 'sell';
  };

  const recommendationContextStore = derived(
    [quests, blueprints, projectProgress, workbenchState, wantList, settings],
    ([$quests, $blueprints, $projectProgress, $workbench, $wantList, $settings]) =>
      buildRecommendationContext({
        items,
        quests: questDefs,
        questProgress: $quests,
        upgrades: benchUpgrades,
        blueprints: $blueprints,
        workbenchUpgrades: $workbench,
        projects,
        projectProgress: $projectProgress,
        alwaysKeepCategories: $settings.alwaysKeepCategories ?? [],
        ignoredCategories: $settings.ignoredWantCategories ?? [],
        wantList: $wantList,
        wantListDependencies: expandWantList($wantList, items, {
          ignoredCategories: $settings.ignoredWantCategories ?? []
        })
      })
  );

  const buildContextForWishlist = (wishlistEntries: { itemId: string; qty: number }[]) =>
    buildRecommendationContext({
      items,
      quests: questDefs,
      questProgress: $quests,
      upgrades: benchUpgrades,
      blueprints: $blueprints,
      workbenchUpgrades: $workbenchState,
      projects,
      projectProgress: $projectProgress,
      alwaysKeepCategories: $settings.alwaysKeepCategories ?? [],
      ignoredCategories: $settings.ignoredWantCategories ?? [],
      wantList: wishlistEntries,
      wantListDependencies: expandWantList(wishlistEntries, items, {
        ignoredCategories: $settings.ignoredWantCategories ?? []
      })
    });

  const deriveWishlistImpacts = (
    context: ReturnType<typeof buildRecommendationContext>,
    targetItemId: string
  ): WishlistImpactPreview[] => {
    const recommendations = recommendItemsMatching('', context, { sortMode: 'alphabetical' });
    const itemLookup = new Map(context.items.map((item) => [item.id, item] as const));
    const seen = new Set<string>();

    return recommendations
      .filter((rec) => rec.wishlistSources?.some((source) => source.targetItemId === targetItemId))
      .filter((rec) => rec.action === 'keep' || rec.action === 'recycle')
      .filter((rec) => {
        const totalNeeds = rec.needs.quests + rec.needs.workshop + rec.needs.projects;
        const hasWishlist = (rec.wishlistSources?.length ?? 0) > 0;
        const supportsRecycling = rec.action === 'recycle';
        const category = rec.category?.toLowerCase().trim();
        const isBasicMaterial = category === 'basic material';
        if (isBasicMaterial) return false;
        if (!(totalNeeds > 0 || hasWishlist || supportsRecycling)) return false;

        if (supportsRecycling && !hasWishlist && totalNeeds === 0) {
          const targets = rec.salvageBreakdown ?? [];
          const onlyFeedsBasicMaterials =
            targets.length > 0 &&
            targets.every((entry) => {
              const recycledCategory = itemLookup.get(entry.itemId)?.category;
              return recycledCategory?.toLowerCase().trim() === 'basic material';
            });
          if (onlyFeedsBasicMaterials) return false;
        }

        return true;
      })
      .filter((rec) => {
        if (seen.has(rec.itemId)) return false;
        seen.add(rec.itemId);
        return true;
      })
      .sort((a, b) => {
        const totalNeedsA = a.needs.quests + a.needs.workshop + a.needs.projects;
        const totalNeedsB = b.needs.quests + b.needs.workshop + b.needs.projects;
        const hasWishlistA = (a.wishlistSources?.length ?? 0) > 0;
        const hasWishlistB = (b.wishlistSources?.length ?? 0) > 0;
        const isDirectA = totalNeedsA > 0 || hasWishlistA;
        const isDirectB = totalNeedsB > 0 || hasWishlistB;

        if (isDirectA !== isDirectB) return isDirectA ? -1 : 1;

        const rarityDiff = rarityRank(a.rarity) - rarityRank(b.rarity);
        if (rarityDiff !== 0) return rarityDiff;

        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
      .map((rec) => ({
        id: rec.itemId,
        name: rec.name,
        imageUrl: resolveImageUrl(rec.imageUrl),
        rarity: rec.rarity ?? null,
        action: rec.action
      }));
  };

  let wishlistImpactMap = new Map<string, WishlistImpactPreview[]>();

  $: {
    const preview = new Map<string, WishlistImpactPreview[]>();
    const visibleItems = filteredItems.slice(0, 60);
    const baseContext = $recommendationContextStore;

    for (const item of visibleItems) {
      const wishlistEntries = $wishlistHasItem.has(item.id)
        ? $wantList
        : [...$wantList, { itemId: item.id, qty: getQuantityDraft(item.id) }];

      const context = $wishlistHasItem.has(item.id)
        ? baseContext
        : buildContextForWishlist(wishlistEntries);

      preview.set(item.id, deriveWishlistImpacts(context, item.id));
    }

    wishlistImpactMap = preview;
  }

</script>

<div class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Wishlist Planner</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Track upcoming crafts and prioritize material farming. Add items to your wishlist and inspect the
      crafting and recycling graph to understand every supporting material.
    </p>
  </header>

  <div class="space-y-6">
    <section class="section-card space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-white">Find items to add</h2>
          <p class="text-sm text-slate-400">
            Search across every craftable item to add wishlist targets with their artwork.
          </p>
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500"
          aria-pressed={showFinder}
          on:click={() => (showFinder = !showFinder)}
        >
          {showFinder ? 'Collapse' : 'Expand'}
        </button>
      </header>

      {#if showFinder}
        <div class="space-y-4">
          <SearchBar
            label="Search items"
            placeholder="Search by name, slug, or category"
            value={search}
            on:input={({ detail }) => (search = detail.value)}
          />
          <div class="flex flex-wrap gap-4 text-xs uppercase tracking-widest text-slate-400">
            <label class="flex items-center gap-2">
              <span class="text-slate-500">Workbench</span>
              <select
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-200"
                bind:value={benchFilter}
              >
                {#each benchOptions as option}
                  <option value={option}>{labelForBench(option)}</option>
                {/each}
              </select>
            </label>
            <label class="flex items-center gap-2">
              <span class="text-slate-500">Blueprint</span>
              <select
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-200"
                bind:value={blueprintFilter}
              >
                <option value="any">Any</option>
                <option value="owned">Owned</option>
                <option value="missing">Missing</option>
              </select>
            </label>
          </div>

          <div class="space-y-3">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              {#if filteredItems.length === 0}
                No matches
              {:else}
                {filteredItems.length} matches
              {/if}
            </p>
            <ul class="space-y-3">
              {#each filteredItems.slice(0, 60) as item}
                {@const recipeLink = recipeLinkForItem(item)}
                {@const imageUrl = resolveImageUrl(item.imageUrl)}
                {@const keepRecycleImpacts = wishlistImpactMap.get(item.id) ?? []}
                <li class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-sm">
                  <div class="flex flex-1 items-center gap-3">
                    <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900 text-xs font-semibold uppercase tracking-wide text-slate-200">
                      {#if imageUrl}
                        <img src={imageUrl} alt={item.name} class="h-full w-full object-cover" loading="lazy" decoding="async" />
                      {:else}
                        <span>{initialsForItem(item)}</span>
                      {/if}
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="text-base font-semibold text-white">{item.name}</span>
                        {#if item.category}
                          <span class="rounded-full border border-slate-700/60 px-2 py-0.5 text-[11px] uppercase tracking-widest text-slate-400">
                            {item.category}
                          </span>
                        {/if}
                      </div>
                      <div class="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
                        <span>{labelForBench(inferBenchForItem(item))}</span>
                        {#if findBlueprintForItem(item)}
                          <span>
                            {#if blueprintStatusForItem(item, $blueprintStateMap) === 'owned'}
                              Blueprint owned
                            {:else if blueprintStatusForItem(item, $blueprintStateMap) === 'missing'}
                              Blueprint missing
                            {:else}
                              Blueprint unknown
                            {/if}
                          </span>
                        {/if}
                        {#if recipeLink}
                          <a
                            class="font-semibold text-sky-300 hover:text-sky-200"
                            href={recipeLink.href}
                          >
                            View recipe
                          </a>
                        {/if}
                      </div>
                      {#if keepRecycleImpacts.length > 0}
                        <div class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400">
                          <span class="text-slate-500">Keep/Recycle</span>
                          <div class="flex flex-wrap gap-2">
                            {#each keepRecycleImpacts as preview}
                              <div
                                class={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br text-[9px] font-semibold uppercase tracking-wide text-slate-100 ${rarityClass(preview.rarity)}`}
                                title={`${preview.name} — ${preview.action === 'recycle' ? 'Recycle' : 'Keep'}`}
                              >
                                {#if preview.imageUrl}
                                  <img
                                    src={preview.imageUrl}
                                    alt={preview.name}
                                    class="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                {:else}
                                  <span class="px-1 text-[9px]">{initialsForName(preview.name)}</span>
                                {/if}
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      class="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-right text-sm text-white"
                      value={getQuantityDraft(item.id)}
                      on:input={(event) => setQuantityDraft(item.id, Number(event.currentTarget.value))}
                    />
                    <button
                      type="button"
                      data-testid="add-to-wishlist"
                      class="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/30"
                      on:click={() => addToWantList(item)}
                      disabled={$wishlistHasItem.has(item.id)}
                    >
                      {#if $wishlistHasItem.has(item.id)}
                        Added
                      {:else}
                        Add
                      {/if}
                    </button>
                  </div>
                </li>
              {:else}
                <li class="rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/40 p-5 text-sm text-slate-400">
                  Adjust filters or search terms to locate craft targets.
                </li>
              {/each}
            </ul>
          </div>
        </div>
      {/if}
    </section>

    <section class="section-card space-y-6">
      <header class="space-y-2">
        <h2 class="text-xl font-semibold text-white">Wishlist entries</h2>
        <p class="text-sm text-slate-400">
          Explore upstream dependencies for each wishlist target and plan your pickups.
        </p>
      </header>

      {#if $wantList.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/50 p-6 text-sm text-slate-400">
          Add an item from the catalog to begin tracking your wishlist.
        </div>
      {:else}
        <div class="space-y-5">
          {#each $resolvedEntries as detail}
            {@const recipeLink = detail.item ? recipeLinkForItem(detail.item) : null}
            {@const recycleSources = detail.recycleSources}
            {@const detailImage = detail.item ? resolveImageUrl(detail.item.imageUrl) : null}
            <article class="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-5 text-sm text-slate-200">
              <div class="flex flex-wrap items-start gap-4">
                <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900 text-xs font-semibold uppercase tracking-wide text-slate-200">
                  {#if detailImage}
                    <img src={detailImage} alt={detail.item ? detail.item.name : 'Wishlist item'} class="h-full w-full object-cover" loading="lazy" decoding="async" />
                  {:else}
                    <span>{initialsForItem(detail.item)}</span>
                  {/if}
                </div>
                <div class="flex-1 space-y-2">
                  <div class="flex flex-wrap items-center gap-3">
                    <h3 class="text-lg font-semibold text-white">
                      {detail.item ? detail.item.name : detail.entry.itemId}
                    </h3>
                    {#if recipeLink}
                      <a
                        class="rounded-full border border-sky-700/50 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-sky-200 hover:bg-sky-500/20"
                        href={recipeLink.href}
                      >
                        View recipe
                      </a>
                    {/if}
                  </div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">
                    Added {new Date(detail.entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-300 hover:bg-rose-500/30"
                    on:click={() => removeEntry(detail.entry.itemId)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2">
                  <h4 class="text-xs uppercase tracking-widest text-slate-400">Crafting requirements</h4>
                  <ul class="space-y-1 text-sm text-slate-300">
                    {#if true}
                      {@const directRequirements = getDirectRequirements(detail.requirements)}
                      {#if directRequirements.length > 0}
                        {#each directRequirements as requirement}
                          <li class="flex items-center justify-between gap-3">
                            <span class="truncate">{requirement.name}</span>
                            <span class="font-semibold text-white">×{requirement.qty}</span>
                          </li>
                        {/each}
                      {:else}
                        <li class="text-slate-500">No crafting requirements recorded.</li>
                      {/if}
                    {/if}
                  </ul>
                </div>
                <div class="space-y-2">
                  <h4 class="text-xs uppercase tracking-widest text-slate-400">Recycle Source</h4>
                  <ul class="space-y-1 text-sm text-slate-300">
                    {#if recycleSources.length > 0}
                      {#each recycleSources as source}
                        <li class="space-y-1 rounded-lg border border-slate-800/60 bg-slate-900/60 p-2">
                          <div class="flex items-center justify-between gap-3">
                            <span class="truncate">{source.sourceName}</span>
                            <span class="font-semibold text-white">Yields {source.producedQty}</span>
                          </div>
                        </li>
                      {/each}
                    {:else}
                      <li class="text-slate-500">This item has no recorded recycle data.</li>
                    {/if}
                  </ul>
                </div>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
