<svelte:head>
  <title>Runs Dashboard | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { RecommendationCard, TipsPanel } from '$lib/components';

  const highlightRuns = [
    {
      name: 'Buried City Expedition',
      action: 'save',
      rarity: 'Last run · 24m 18s',
      reason: 'High salvage yield and rare blueprint fragment recovered.'
    },
    {
      name: 'Spaceport Salvage',
      action: 'keep',
      rarity: 'Personal best · 18m 42s',
      reason: 'Balanced XP and loot. Consider repeating with modifier boosts.'
    }
  ] as const;

  const dashboardNotes = [
    'Historical KPIs will render here once run logging is connected to persistence.',
    'Filters will help compare crew sessions, solo runs, and experimental builds.',
    'Export tools will generate shareable summaries for the community.'
  ];
</script>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Runs Dashboard</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Review trends across recorded runs, surface highlight sessions, and spot growth opportunities
      using XP, loot value, and completion streak metrics.
    </p>
  </header>

  <section class="section-card space-y-6">
    <div class="content-grid">
      <div class="space-y-4">
        {#each highlightRuns as run}
          <RecommendationCard {...run} />
        {/each}
      </div>
      <TipsPanel heading="Upcoming dashboard work" tips={dashboardNotes} />
    </div>
    <div class="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/60 p-6 text-sm text-slate-400">
      Run history charts, filters, and export actions will be implemented with the analytics store.
    </div>
  </section>
</section>
