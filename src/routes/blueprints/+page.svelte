<svelte:head>
  <title>Blueprints | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { base } from '$app/paths';
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { SearchBar, TipsPanel } from '$lib/components';
  import { blueprints, hydrateFromCanonical } from '$lib/stores/app';
  import { tipsForBlueprints } from '$lib/tips';
  import type { ItemRecord } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __blueprintPageProps = { form, params };
  void __blueprintPageProps;

  const { blueprints: blueprintRecords } = data;

  const resolveImageUrl = (url: string | null | undefined) =>
    url?.startsWith('/') ? `${base}${url}`.replace(/\/{2,}/g, '/') : url ?? null;

  type BlueprintAnchorSource = Pick<ItemRecord, 'id' | 'name'> & { slug?: string | null };

  const anchorIdForBlueprint = (blueprint: BlueprintAnchorSource) => {
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

  onMount(() => {
    hydrateFromCanonical({
      blueprints: blueprintRecords.map((blueprint) => ({
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

  let blueprintQuery = '';

  const blueprintState = derived(blueprints, ($blueprints) => {
    const map = new Map($blueprints.map((entry) => [entry.id, entry]));
    return blueprintRecords.map((blueprint) => ({
      blueprint,
      state:
        map.get(blueprint.id) ??
        ({
          id: blueprint.id,
          owned: false,
          name: blueprint.name,
          slug: blueprint.slug,
          rarity: blueprint.rarity ?? null,
          category: blueprint.category ?? null,
          imageUrl: blueprint.imageUrl ?? null
        } as const)
    }));
  });

  const summary = derived(blueprints, ($blueprints) => {
    const owned = $blueprints.filter((bp) => bp.owned).length;
    return {
      owned,
      total: blueprintRecords.length,
      tips: tipsForBlueprints(owned, blueprintRecords.length)
    };
  });

  const blueprintCatalog = derived(blueprintState, ($entries) =>
    $entries.map((entry) => ({
      entry,
      id: entry.blueprint.id,
      name: entry.blueprint.name,
      slug: entry.blueprint.slug,
      rarity: entry.blueprint.rarity,
      category: entry.blueprint.category,
      sell: entry.blueprint.sell,
      notes: entry.blueprint.notes ?? null,
      rawImageUrl: entry.blueprint.imageUrl ?? null,
      imageUrl: resolveImageUrl(entry.blueprint.imageUrl),
      owned: entry.state.owned
    }))
  );

  $: catalog = $blueprintCatalog;
  $: filteredBlueprints = catalog.filter((entry) => {
    if (!blueprintQuery.trim()) return true;
    const term = blueprintQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(term) ||
      (entry.slug ?? '').toLowerCase().includes(term) ||
      (entry.rarity ?? '').toLowerCase().includes(term) ||
      (entry.category ?? '').toLowerCase().includes(term)
    );
  });

  const toggleOwnership = (entry) => {
    blueprints.upsert({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      rarity: entry.rarity ?? null,
      category: entry.category ?? null,
      imageUrl: entry.rawImageUrl ?? null,
      owned: !entry.owned
    });
  };
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
      placeholder="Filter by name, rarity, or slug"
      value={blueprintQuery}
      on:input={({ detail }) => (blueprintQuery = detail.value)}
    />
    <div class="content-grid">
      <div class="space-y-4">
        {#if filteredBlueprints.length === 0}
          <div class="rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/60 p-6 text-sm text-slate-400">
            No blueprints match “{blueprintQuery}”. Try filtering by weapon name, rarity, or slug.
          </div>
        {:else}
          {#each filteredBlueprints as blueprint}
            <article
              id={anchorIdForBlueprint(blueprint)}
              class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-card"
            >
              <header class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                  {#if blueprint.imageUrl}
                    <img
                      src={blueprint.imageUrl}
                      alt={blueprint.name}
                      class="h-12 w-12 rounded-xl border border-slate-800 object-cover"
                    />
                  {/if}
                  <div>
                    <h3 class="text-lg font-semibold text-white">{blueprint.name}</h3>
                    <p class="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {(blueprint.rarity ?? 'Unknown rarity')} · {(blueprint.category ?? 'Blueprint')}
                    </p>
                    <p class="text-xs text-slate-500">{blueprint.slug}</p>
                  </div>
                </div>
                <button
                  type="button"
                  class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                    blueprint.owned
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  on:click={() => toggleOwnership(blueprint)}
                >
                  {blueprint.owned ? 'Owned' : 'Mark owned'}
                </button>
              </header>
              <div class="mt-4 space-y-2 text-sm text-slate-300">
                {#if typeof blueprint.sell === 'number'}
                  <p>Vendor value: {blueprint.sell.toLocaleString()} coins</p>
                {/if}
                {#if blueprint.notes}
                  <p class="text-slate-400">{blueprint.notes}</p>
                {/if}
              </div>
            </article>
          {/each}
        {/if}
      </div>
      <TipsPanel heading="How blueprints integrate" tips={$summary.tips} />
    </div>
    <div class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300">
      <p class="font-semibold text-white">Collection overview</p>
      <p class="mt-2">{$summary.owned} of {$summary.total} blueprints marked as owned.</p>
    </div>
  </section>
</section>
