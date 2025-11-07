<svelte:head>
  <title>Run Analyzer | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { RunTimer, SearchBar, TipsPanel } from '$lib/components';

  let encounter = '';
  const liveTips = [
    'Log major loot pickups and deaths to populate the run history dashboard.',
    'Timer controls will sync with keyboard shortcuts for quick splits.',
    'Tips adapt as quests are completed and loot needs change mid-run.'
  ];
</script>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Run Analyzer</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Log real-time run data, monitor pacing, and surface contextual tips. This placeholder layout
      sketches the final structure for timers, logging, and guidance widgets.
    </p>
  </header>

  <section class="section-card space-y-6">
    <div class="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div class="space-y-6">
        <RunTimer label="Live session" elapsed={782} isRunning={false} />
        <div class="space-y-3">
          <h2 class="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">Log Encounter</h2>
          <SearchBar
            label="Encounter"
            placeholder="Tag an area, boss, or event"
            value={encounter}
            on:input={({ detail }) => (encounter = detail.value)}
          />
          <p class="text-xs text-slate-500">
            Encounter tagging will associate loot drops, deaths, and quest progress for analytics.
          </p>
        </div>
      </div>
      <TipsPanel heading="Adaptive run tips" tips={liveTips} />
    </div>
  </section>
</section>
