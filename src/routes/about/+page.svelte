<svelte:head>
  <title>About & Attribution | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { resetAllStores, settings } from '$lib/stores/app';
  import { clearAppStorage } from '$lib/persist';

  const EXTRA_STORAGE_KEYS = ['what-i-have-tabs'];

  let hasReset = false;

  const handleReset = () => {
    resetAllStores();
    clearAppStorage({ extraKeys: EXTRA_STORAGE_KEYS });
    hasReset = true;
  };
</script>

<section class="page-stack space-y-8">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">About & Attribution</h1>
    <p class="max-w-3xl text-sm text-slate-400">
      ARC Companion is a fan-made helper for ARC Raiders. Below you can find copyright information,
      attribution for the data that powers the tool, and a way to wipe any locally stored progress.
    </p>
  </header>

  <div class="space-y-6">
    <div class="section-card space-y-4">
      <div class="space-y-2">
        <h2 class="text-xl font-semibold">Display preferences</h2>
        <p class="text-sm text-slate-400">
          Choose whether to hide items worth zero coins from loot lists, recommendations, and categories.
        </p>
      </div>
      <div class="space-y-2">
        <label class="flex items-center gap-3 text-sm font-semibold text-slate-200">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-700/70 bg-slate-900 text-amber-400 focus:ring-amber-400"
            checked={$settings.hideZeroSellItems ?? false}
            on:change={(event) => settings.toggleHideZeroSellItems(event.currentTarget.checked)}
          />
          <span>Hide zero-value loot and empty categories</span>
        </label>
        <p class="text-xs text-slate-400">
          When enabled, items with no sell value and categories that only contain them stay hidden from lists.
        </p>
      </div>
    </div>

    <div class="section-card space-y-4">
      <div class="space-y-2">
        <h2 class="text-xl font-semibold">Reset stored data</h2>
        <p class="text-sm text-slate-400">
          Clear your local ARC Companion data, including quests, wishlists, run history, settings,
          and any saved tab preferences. This action cannot be undone.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          on:click={handleReset}
        >
          Reset all data
        </button>
        {#if hasReset}
          <span class="text-xs font-semibold uppercase tracking-widest text-emerald-300">All local data cleared</span>
        {/if}
      </div>
    </div>

    <div class="section-card space-y-3">
      <h2 class="text-xl font-semibold">Copyright</h2>
      <p class="text-sm text-slate-300">© 2025 Meredori.</p>
      <p class="text-sm text-slate-400">
        ARC Companion is an independent project that builds on publicly available ARC Raiders data.
        It is not affiliated with Embark Studios.
      </p>
    </div>

    <div class="section-card space-y-3">
      <h2 class="text-xl font-semibold">Data attribution</h2>
      <p class="text-sm text-slate-400">
        Item, quest, and project JSON files draw from the community-maintained
        <a
          class="text-sky-300 underline decoration-sky-500 decoration-2 underline-offset-2"
          href="https://github.com/RaidTheory/arcraiders-data"
          rel="noreferrer"
          target="_blank"
          >RaidTheory/arcraiders-data</a
        >
        exports. You can explore their work directly in that repository and at
        <a
          class="text-sky-300 underline decoration-sky-500 decoration-2 underline-offset-2"
          href="https://arctracker.io"
          rel="noreferrer"
          target="_blank"
          >arctracker.io</a
        >, which also showcases the dataset.
      </p>
    </div>
  </div>
</section>
