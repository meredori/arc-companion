<svelte:head>
  <title>Run Analyzer | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  /* globals globalThis */
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { RunTimer, TipsPanel } from '$lib/components';
  import { blueprints, projectProgress, quests, runs, settings } from '$lib/stores/app';
  import { buildRecommendationContext, recommendItemsMatching } from '$lib/recommend';
  import { createRunTipContext, generateRunTips } from '$lib/tips';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __runPageProps = { form, params };
  void __runPageProps;

  const { items, quests: questDefs, upgrades, projects } = data;

  const recommendationContextStore = derived([quests, blueprints, projectProgress], ([$quests, $blueprints, $projectProgress]) =>
    buildRecommendationContext({
      items,
      quests: questDefs,
      questProgress: $quests,
      upgrades,
      blueprints: $blueprints,
      projects,
      projectProgress: $projectProgress
    })
  );

  const outstandingNeedsStore = derived(recommendationContextStore, (context) =>
    recommendItemsMatching('', context).reduce(
      (total, rec) => total + rec.needs.quests + rec.needs.workshop + rec.needs.projects,
      0
    )
  );

  const activeRunStore = derived(runs, ($runs) => $runs.find((run) => !run.endedAt) ?? null);

  const tipsStore = derived(
    [activeRunStore, runs, settings, outstandingNeedsStore],
    ([$activeRun, $runs, $settings, $needs]) =>
      generateRunTips(
        createRunTipContext({
          activeRun: $activeRun,
          runs: $runs,
          settings: $settings,
          outstandingNeeds: $needs
        })
      )
  );

  let runForm = createDefaultForm(get(settings).freeLoadoutDefault);
  let tips = [];
  let elapsedSeconds = 0;
  const intervalSet = browser
    ? window.setInterval.bind(window)
    : globalThis.setInterval.bind(globalThis);
  const intervalClear = browser
    ? window.clearInterval.bind(window)
    : globalThis.clearInterval.bind(globalThis);
  let timer: ReturnType<typeof intervalSet> | null = null;

  const stopTimer = () => {
    if (timer) {
      intervalClear(timer);
      timer = null;
    }
  };

  const startTimer = (startedAt: string) => {
    stopTimer();
    const startTime = new Date(startedAt).getTime();
    const tick = () => {
      elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    };
    tick();
    timer = intervalSet(tick, 1000);
  };

  const nowIso = () => new Date().toISOString();

  const createPayload = () => {
    const xp = Number(runForm.xp);
    const value = Number(runForm.value);
    const extract = Number(runForm.extracted);
    const deaths = Number(runForm.deaths);
    return {
      totalXp: Number.isFinite(xp) && xp > 0 ? xp : undefined,
      totalValue: Number.isFinite(value) && value > 0 ? value : undefined,
      extractedValue: Number.isFinite(extract) && extract > 0 ? extract : undefined,
      deaths: Number.isFinite(deaths) && deaths > 0 ? deaths : undefined,
      notes: runForm.notes ? runForm.notes.trim() : undefined,
      crew: runForm.crew ? runForm.crew.trim() : undefined,
      freeLoadout: runForm.freeLoadout,
      endedAt: nowIso()
    };
  };

  const submitRun = () => {
    const payload = createPayload();
    const active = get(activeRunStore);
    const settingsValue = get(settings);
    if (active && !active.endedAt) {
      runs.updateEntry(active.id, payload);
    } else {
      runs.add({ ...payload, freeLoadout: payload.freeLoadout ?? settingsValue.freeLoadoutDefault });
    }
    runForm = createDefaultForm(settingsValue.freeLoadoutDefault);
  };

  const startRun = () => {
    const settingsValue = get(settings);
    runs.add({ startedAt: nowIso(), freeLoadout: settingsValue.freeLoadoutDefault });
    runForm = { ...runForm, freeLoadout: settingsValue.freeLoadoutDefault };
  };

  const endRun = () => {
    const active = get(activeRunStore);
    if (!active || active.endedAt) return;
    runs.updateEntry(active.id, { endedAt: nowIso() });
  };

  function createDefaultForm(freeLoadout: boolean) {
    return {
      xp: '',
      value: '',
      extracted: '',
      deaths: '',
      notes: '',
      crew: '',
      freeLoadout
    };
  }

  $: tips = $tipsStore;
  $: {
    const active = $activeRunStore;
    if (active && !active.endedAt) {
      startTimer(active.startedAt);
    } else {
      stopTimer();
      elapsedSeconds = 0;
    }
  }

  onDestroy(() => stopTimer());
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
        <RunTimer
          label="Active session"
          elapsed={elapsedSeconds}
          isRunning={$activeRunStore ? !$activeRunStore.endedAt : false}
        />
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-full bg-sky-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-300 transition hover:bg-sky-500/30"
            on:click={startRun}
          >
            Start run
          </button>
          {#if $activeRunStore && !$activeRunStore.endedAt}
            <button
              type="button"
              class="rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/30"
              on:click={endRun}
            >
              Mark complete
            </button>
          {/if}
        </div>
        <form class="space-y-4" on:submit|preventDefault={submitRun}>
          <h2 class="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">Run summary</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              XP earned
              <input
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                type="number"
                min="0"
                bind:value={runForm.xp}
              />
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Total value
              <input
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                type="number"
                min="0"
                bind:value={runForm.value}
              />
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Extracted value
              <input
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                type="number"
                min="0"
                bind:value={runForm.extracted}
              />
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Deaths
              <input
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                type="number"
                min="0"
                bind:value={runForm.deaths}
              />
            </label>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Crew
              <input
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                type="text"
                placeholder="Solo, Crew name, etc."
                bind:value={runForm.crew}
              />
            </label>
            <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
              <input type="checkbox" bind:checked={runForm.freeLoadout} />
              Free loadout active
            </label>
          </div>
          <label class="flex flex-col gap-2 text-xs uppercase tracking-widest text-slate-400">
            Notes
            <textarea
              class="h-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder="Drops, modifiers, or context"
              bind:value={runForm.notes}
            ></textarea>
          </label>
          <button
            type="submit"
            class="rounded-full bg-emerald-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/30"
          >
            {$activeRunStore && !$activeRunStore.endedAt ? 'Save & close run' : 'Log run'}
          </button>
        </form>
      </div>
      <TipsPanel heading="Adaptive run tips" tips={tips} />
    </div>
  </section>
</section>
