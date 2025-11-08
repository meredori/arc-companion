<svelte:head>
  <title>Blueprints | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { SearchBar, TipsPanel } from '$lib/components';
  import { blueprints, hydrateFromCanonical } from '$lib/stores/app';
  import { tipsForBlueprints } from '$lib/tips';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __blueprintPageProps = { form, params };
  void __blueprintPageProps;

  const { upgrades, items } = data;

  onMount(() => {
    hydrateFromCanonical(
      [],
      upgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      }))
    );
  });

  let blueprintQuery = '';

  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? id;

  const blueprintState = derived(blueprints, ($blueprints) => {
    const map = new Map($blueprints.map((entry) => [entry.id, entry]));
    return upgrades.map((upgrade) => ({
      upgrade,
      state: map.get(upgrade.id) ?? {
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      }
    }));
  });

  const summary = derived(blueprints, ($blueprints) => {
    const owned = $blueprints.filter((bp) => bp.owned).length;
    return {
      owned,
      total: upgrades.length,
      tips: tipsForBlueprints(owned, upgrades.length)
    };
  });

  const toggle = (id: string) => blueprints.toggle(id);
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
      placeholder="Filter by name, bench, or level"
      value={blueprintQuery}
      on:input={({ detail }) => (blueprintQuery = detail.value)}
    />
    <div class="content-grid">
      <div class="space-y-4">
        {#each $blueprintState.filter(({ upgrade }) =>
          upgrade.name.toLowerCase().includes(blueprintQuery.toLowerCase()) ||
          upgrade.bench.toLowerCase().includes(blueprintQuery.toLowerCase())
        ) as entry}
          <article class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-card">
            <header class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-white">{entry.upgrade.name}</h3>
                <p class="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {entry.upgrade.bench} · Level {entry.upgrade.level}
                </p>
              </div>
              <button
                type="button"
                class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  entry.state.owned
                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                on:click={() => toggle(entry.upgrade.id)}
              >
                {entry.state.owned ? 'Owned' : 'Mark owned'}
              </button>
            </header>
            <ul class="mt-4 space-y-2 text-sm text-slate-300">
              {#each entry.upgrade.items as requirement}
                <li class="flex items-center justify-between">
                  <span>{itemName(requirement.itemId)}</span>
                  <span class="text-slate-400">{requirement.qty}x</span>
                </li>
              {/each}
            </ul>
          </article>
        {/each}
      </div>
      <TipsPanel heading="How blueprints integrate" tips={$summary.tips} />
    </div>
    <div class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300">
      <p class="font-semibold text-white">Collection overview</p>
      <p class="mt-2">{$summary.owned} of {$summary.total} blueprints marked as owned.</p>
    </div>
  </section>
</section>
