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
    settings,
    wantList
  } from '$lib/stores/app';
  import type { ItemRecord, UpgradePack } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __whatIWantProps = { form, params };
  void __whatIWantProps;

  const items: ItemRecord[] = data.items ?? [];
  const blueprintItems: ItemRecord[] = data.blueprints ?? [];
  const benchUpgrades: UpgradePack[] = data.workbenchUpgrades ?? [];

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
      return `#blueprint-${blueprint.slug}`;
    }
    const fallback = blueprint.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
    return `#blueprint-${fallback || blueprint.id}`;
  };

  const recipeLinkForItem = (item: ItemRecord) => {
    const blueprint = findBlueprintForItem(item);
    if (!blueprint) return null;
    const anchor = anchorForBlueprint(blueprint);
    return {
      href: `${base}/blueprints${anchor}`.replace(/\/{2,}/g, '/').replace(':/', '://'),
      blueprint
    };
  };

  const QUICK_USE_BENCH_BY_SLUG = new Map<string, string>([
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

  const benchLabels: Record<string, string> = {
    all: 'All benches',
    workbench: 'Workbench',
    utility_bench: 'Utility Bench',
    explosives_bench: 'Explosives Bench',
    med_station: 'Med Station',
    medical_bench: 'Medical Bench',
    none: 'No bench'
  };

  let search = '';
  let benchFilter = 'all';
  let blueprintFilter: 'any' | 'owned' | 'missing' = 'any';
  let quantityDrafts: Record<string, number> = {};

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

  const nonBlueprintItems = items.filter((item) => item.category?.toLowerCase() !== 'blueprint');

  const benchUsage = new Map<string, number>();
  for (const item of nonBlueprintItems) {
    const key = inferBenchForItem(item);
    benchUsage.set(key, (benchUsage.get(key) ?? 0) + 1);
  }

  const DEFAULT_BENCH_ORDER = [
    'workbench',
    'utility_bench',
    'explosives_bench',
    'med_station',
    'medical_bench',
    'none'
  ];

  const benchOptions = ['all']
    .concat(DEFAULT_BENCH_ORDER.filter((key) => benchUsage.has(key)))
    .concat(Array.from(benchUsage.keys()).filter((key) => !DEFAULT_BENCH_ORDER.includes(key)));

  $: if (!benchOptions.includes(benchFilter)) {
    benchFilter = 'all';
  }

  const labelForBench = (key: string) => {
    if (benchLabels[key]) return benchLabels[key];
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

  const incrementEntry = (itemId: string) => {
    const entry = $wantList.find((record) => record.itemId === itemId);
    if (!entry) return;
    wantList.update(itemId, { qty: entry.qty + 1 });
  };

  const decrementEntry = (itemId: string) => {
    const entry = $wantList.find((record) => record.itemId === itemId);
    if (!entry) return;
    const nextQty = Math.max(1, entry.qty - 1);
    wantList.update(itemId, { qty: nextQty });
  };
</script>

<div class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Wishlist Planner</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Track upcoming crafts and prioritize material farming. Add items to your wishlist, note why you want
      them, and inspect the crafting and recycling graph to understand every supporting material.
    </p>
  </header>

  <div class="grid gap-6 lg:grid-cols-[2fr,3fr]">
    <section class="section-card space-y-5">
      <header class="space-y-3">
        <h2 class="text-xl font-semibold text-white">Find items to add</h2>
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

      </header>

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
            <li class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-sm">
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
    </section>

    <section class="section-card space-y-6">
      <header class="space-y-2">
        <h2 class="text-xl font-semibold text-white">Wishlist entries</h2>
        <p class="text-sm text-slate-400">
          Update quantities, capture notes, and explore upstream dependencies for each wishlist target.
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
            {@const recycleOutputs = detail.item?.recyclesInto ?? detail.item?.salvagesInto ?? []}
            {@const recycleSources = detail.recycleSources}
            <article class="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-5 text-sm text-slate-200">
              <header class="flex flex-wrap items-center justify-between gap-3">
                <div class="space-y-1">
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
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-800"
                    on:click={() => decrementEntry(detail.entry.itemId)}
                  >
                    −
                  </button>
                  <span class="min-w-[2rem] text-center text-base font-semibold text-white">
                    {detail.entry.qty}
                  </span>
                  <button
                    type="button"
                    class="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-800"
                    on:click={() => incrementEntry(detail.entry.itemId)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-300 hover:bg-rose-500/30"
                    on:click={() => removeEntry(detail.entry.itemId)}
                  >
                    Remove
                  </button>
                </div>
              </header>

              <label class="block space-y-2 text-xs uppercase tracking-widest text-slate-400">
                Reason
                <textarea
                  rows="2"
                  class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  value={detail.entry.reason ?? ''}
                  placeholder="Optional note"
                  on:change={(event) => wantList.update(detail.entry.itemId, { reason: event.currentTarget.value })}
                ></textarea>
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2">
                  <h4 class="text-xs uppercase tracking-widest text-slate-400">Crafting requirements</h4>
                  <ul class="space-y-1 text-sm text-slate-300">
                    {#each detail.requirements as requirement}
                      <li class="flex items-center justify-between gap-3">
                        <span class="truncate">{requirement.name}</span>
                        <span class="font-semibold text-white">×{requirement.qty}</span>
                      </li>
                    {:else}
                      <li class="text-slate-500">No crafting requirements recorded.</li>
                    {/each}
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
                      <li class="text-slate-500">
                        {#if recycleOutputs.length > 0}
                          No other recorded recycle sources produce this item.
                        {:else}
                          This item has no recorded recycle data.
                        {/if}
                      </li>
                    {/if}
                  </ul>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-xs uppercase tracking-widest text-slate-400">Recycled into</h4>
                <ul class="space-y-1 text-sm text-slate-300">
                  {#if recycleOutputs.length > 0}
                    {#each recycleOutputs as output}
                      <li class="flex items-center justify-between gap-3">
                        <span class="truncate">{output.name}</span>
                        <span class="font-semibold text-white">×{output.qty}</span>
                      </li>
                    {/each}
                  {:else}
                    <li class="text-slate-500">
                      {#if recycleSources.length > 0}
                        This item lists recycle sources but no recorded outputs.
                      {:else}
                        This item has no recorded recycle data.
                      {/if}
                    </li>
                  {/if}
                </ul>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
