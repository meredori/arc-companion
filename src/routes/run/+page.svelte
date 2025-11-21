<svelte:head>
  <title>Run Analyzer | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  /* globals globalThis */
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { RecommendationCard, RunTimer, TipsPanel } from '$lib/components';
  import {
    blueprints,
    expandWantList,
    projectProgress,
    quests,
    runs,
    settings,
    wantList,
    workbenchUpgrades,
    lastRemovedRun
  } from '$lib/stores/app';
  import { buildRecommendationContext, recommendItemsMatching } from '$lib/recommend';
  import rawMaps from '../../../static/maps.json';
  import type { PageData } from './$types';

  type MapRecord = { id: string; name?: Record<string, string> | null };

  const mapOptions = (rawMaps as MapRecord[])
    .map((entry) => ({ id: entry.id, name: entry.name?.en ?? entry.id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const mapLabelById = new Map(mapOptions.map((entry) => [entry.id, entry.name]));
  const defaultMapId = mapOptions[0]?.id ?? '';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __runPageProps = { form, params };
  void __runPageProps;

  const { items, quests: questDefs, workbenchUpgrades: upgradeDefs, projects } = data;

  const recommendationContextStore = derived(
    [quests, blueprints, projectProgress, workbenchUpgrades, wantList, settings],
    ([$quests, $blueprints, $projectProgress, $workbench, $wantList, $settings]) =>
      buildRecommendationContext({
        items,
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
        wantListDependencies: expandWantList($wantList, items, {
          ignoredCategories: $settings.ignoredWantCategories ?? []
        })
      })
  );

  const activeRunStore = derived(runs, ($runs) => $runs.find((run) => !run.endedAt) ?? null);

  const lookOutItems = derived(recommendationContextStore, (context) => {
    const recommendations = recommendItemsMatching('', context, { sortMode: 'alphabetical' });
    const seen = new Set<string>();
    return recommendations
      .filter((rec) => {
        const totalNeeds = rec.needs.quests + rec.needs.workshop + rec.needs.projects;
        const hasWishlist = (rec.wishlistSources?.length ?? 0) > 0;
        const supportsRecycling = rec.action === 'recycle';
        const category = rec.category?.toLowerCase().trim();
        const isBasicMaterial = category === 'basic material';
        return !isBasicMaterial && (totalNeeds > 0 || hasWishlist || supportsRecycling);
      })
      .filter((rec) => {
        if (seen.has(rec.itemId)) return false;
        seen.add(rec.itemId);
        return true;
      })
      .map((rec) => ({
        id: rec.itemId,
        name: rec.name,
        imageUrl: rec.imageUrl,
        rationale: rec.rationale,
        action: rec.action
      }));
  });

  const highlightRuns = derived(runs, ($runs) =>
    [...$runs]
      .filter((run) => run.extractedValue)
      .sort((a, b) => (b.extractedValue ?? 0) - (a.extractedValue ?? 0))
      .slice(0, 2)
      .map((run) => {
        const mapLabel = formatMapLabel(run.map);
        return {
          name: run.notes || new Date(run.startedAt).toLocaleString(),
          action: 'save' as const,
          rarity: [mapLabel, run.crew, formatDuration(run)]
            .filter(Boolean)
            .join(' · '),
          reason: `Extracted ${run.extractedValue?.toLocaleString() ?? 0} coins${
            mapLabel ? ` on ${mapLabel}` : ''
          }.`
        };
      })
  );

  const metrics = derived(runs, ($runs) => {
    const total = $runs.length;
    const completed = $runs.filter((run) => run.endedAt).length;
    const totalXp = $runs.reduce((sum, run) => sum + (run.totalXp ?? 0), 0);
    const totalValue = $runs.reduce((sum, run) => sum + (run.totalValue ?? 0), 0);
    const totalExtract = $runs.reduce((sum, run) => sum + (run.extractedValue ?? 0), 0);
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalXp, totalValue, totalExtract, successRate };
  });

  const dashboardNotes = derived([runs, lastRemovedRun], ([$runs, $lastRemoved]) => {
    const notes: string[] = [];
    if ($runs.length === 0) {
      notes.push('Log your first run to unlock historical analytics.');
    } else {
      notes.push('Use the edit controls to keep historical records accurate.');
    }
    if ($lastRemoved) {
      notes.push('A run was deleted — undo is available below.');
    }
    notes.push('Exports and charts will appear as the dataset grows.');
    return notes;
  });

  let runForm = createDefaultForm(get(settings).freeLoadoutDefault);
  let elapsedSeconds = 0;
  let editingId: string | null = null;
  let editForm = createEditForm();
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
    return {
      totalXp: Number.isFinite(xp) && xp > 0 ? xp : undefined,
      totalValue: Number.isFinite(value) && value > 0 ? value : undefined,
      extractedValue: Number.isFinite(extract) && extract > 0 ? extract : undefined,
      died: Boolean(runForm.died),
      notes: runForm.notes ? runForm.notes.trim() : undefined,
      crew: runForm.crew ? runForm.crew.trim() : undefined,
      map: runForm.map || undefined,
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
        runs.add({
          ...payload,
          freeLoadout: payload.freeLoadout ?? settingsValue.freeLoadoutDefault,
          map: payload.map ?? runForm.map ?? defaultMapId
        });
      }
    runForm = createDefaultForm(settingsValue.freeLoadoutDefault);
  };

  const startRun = () => {
    const settingsValue = get(settings);
    runs.add({
      startedAt: nowIso(),
      freeLoadout: settingsValue.freeLoadoutDefault,
      map: runForm.map || defaultMapId
    });
    runForm = { ...runForm, freeLoadout: settingsValue.freeLoadoutDefault };
  };

  const endRun = () => {
    const active = get(activeRunStore);
    if (!active || active.endedAt) return;
    runs.updateEntry(active.id, { endedAt: nowIso() });
  };

  const beginEdit = (runId: string) => {
    const run = get(runs).find((entry) => entry.id === runId);
    if (!run) return;
    editingId = runId;
    editForm = {
      xp: run.totalXp?.toString() ?? '',
      value: run.totalValue?.toString() ?? '',
      extracted: run.extractedValue?.toString() ?? '',
      died: run.died ?? false,
      notes: run.notes ?? '',
      crew: run.crew ?? '',
      map: run.map ?? ''
    };
  };

  const cancelEdit = () => {
    editingId = null;
    editForm = createEditForm();
  };

  const saveEdit = () => {
    if (!editingId) return;
    runs.updateEntry(editingId, {
      totalXp: editForm.xp ? Number(editForm.xp) : undefined,
      totalValue: editForm.value ? Number(editForm.value) : undefined,
      extractedValue: editForm.extracted ? Number(editForm.extracted) : undefined,
      died: Boolean(editForm.died),
      notes: editForm.notes || undefined,
      crew: editForm.crew || undefined,
      map: editForm.map || undefined
    });
    cancelEdit();
  };

  const deleteRun = (id: string) => runs.remove(id);
  const undoDelete = () => runs.restoreLast();

  function createDefaultForm(freeLoadout: boolean) {
    return {
      xp: '',
      value: '',
      extracted: '',
      died: false,
      notes: '',
      crew: '',
      map: defaultMapId,
      freeLoadout
    };
  }

  function createEditForm() {
    return {
      xp: '',
      value: '',
      extracted: '',
      died: false,
      notes: '',
      crew: '',
      map: ''
    };
  }

  function formatMapLabel(mapId?: string | null) {
    if (!mapId) return null;
    return mapLabelById.get(mapId) ?? mapId;
  }

  function formatDuration(run: { startedAt?: string; endedAt?: string }) {
    if (!run.startedAt || !run.endedAt) {
      return 'In progress';
    }
    const seconds = Math.max(0, Math.floor((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  }

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
            <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400 sm:col-span-2">
              <input
                class="h-4 w-4 rounded border border-slate-700 bg-slate-900 text-emerald-400 accent-emerald-400"
                type="checkbox"
                bind:checked={runForm.died}
              />
              Died this run
            </label>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Map quick-select
              <select
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                bind:value={runForm.map}
              >
                <option value="">Select a map</option>
                {#each mapOptions as option}
                  <option value={option.id}>{option.name}</option>
                {/each}
              </select>
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Crew
              <input
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                type="text"
                placeholder="Solo, Crew name, etc."
                bind:value={runForm.crew}
              />
            </label>
          </div>
          <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
            <input type="checkbox" bind:checked={runForm.freeLoadout} />
            Free loadout active
          </label>
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
      <div class="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Look out for</p>
            <p class="text-sm text-slate-300">
              Priority loot and materials worth grabbing during this run.
            </p>
          </div>
          <span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
            {$lookOutItems.length}
          </span>
        </div>
        {#if $lookOutItems.length === 0}
          <p class="text-sm text-slate-400">
            Add wishlist targets, upgrades, or projects to see high-value pickups at a glance.
          </p>
        {:else}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {#each $lookOutItems as item}
              <div
                class="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 p-2 text-center shadow-sm transition hover:border-emerald-500/60 hover:bg-slate-900"
                title={`${item.name} · ${item.rationale}`}
              >
                {#if item.imageUrl}
                  <img src={item.imageUrl} alt={item.name} class="h-full w-full object-contain" loading="lazy" />
                {:else}
                  <span class="text-[11px] text-slate-200">{item.name}</span>
                {/if}
                <div class="pointer-events-none absolute inset-x-0 bottom-full z-10 mb-2 hidden rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-200 shadow-xl group-hover:block">
                  <p class="font-semibold">{item.name}</p>
                  <p class="mt-1 text-[10px] text-slate-400">{item.rationale}</p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </section>

  <section class="section-card space-y-6">
    <header class="space-y-3">
      <h2 class="text-2xl font-semibold">Run history &amp; insights</h2>
      <p class="max-w-2xl text-sm text-slate-400">
        Review trends across recorded runs, surface highlight sessions, and spot growth opportunities
        using XP, loot value, and completion streak metrics.
      </p>
    </header>

    <div class="content-grid">
      <div class="space-y-4">
        {#if $highlightRuns.length === 0}
          <div class="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/60 p-6 text-sm text-slate-400">
            Log a run to surface highlights and trend tracking.
          </div>
        {:else}
          {#each $highlightRuns as run}
            <RecommendationCard {...run} />
          {/each}
        {/if}
      </div>
      <TipsPanel heading="Dashboard insights" tips={$dashboardNotes} />
    </div>

    <div class="grid gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300 sm:grid-cols-3">
      <div>
        <p class="text-xs uppercase tracking-widest text-slate-500">Total runs</p>
        <p class="text-2xl font-semibold text-white">{$metrics.total}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-widest text-slate-500">Success rate</p>
        <p class="text-2xl font-semibold text-white">{$metrics.successRate}%</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-widest text-slate-500">Extracted value</p>
        <p class="text-2xl font-semibold text-white">{$metrics.totalExtract.toLocaleString()}</p>
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">History</h3>
      <table class="w-full table-fixed border-separate border-spacing-y-2 text-sm text-slate-200">
        <thead>
          <tr class="text-xs uppercase tracking-widest text-slate-500">
            <th class="rounded-l-xl bg-slate-900/60 px-3 py-2 text-left">When</th>
            <th class="bg-slate-900/60 px-3 py-2 text-left">Map</th>
            <th class="bg-slate-900/60 px-3 py-2 text-left">XP</th>
            <th class="bg-slate-900/60 px-3 py-2 text-left">Value</th>
            <th class="bg-slate-900/60 px-3 py-2 text-left">Extract</th>
            <th class="bg-slate-900/60 px-3 py-2 text-left">Notes</th>
            <th class="rounded-r-xl bg-slate-900/60 px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each $runs as run}
            <tr class="rounded-xl bg-slate-900/40">
              <td class="rounded-l-xl px-3 py-2">{new Date(run.startedAt).toLocaleString()}</td>
              <td class="px-3 py-2">{formatMapLabel(run.map) ?? '—'}</td>
              <td class="px-3 py-2">{run.totalXp?.toLocaleString() ?? '—'}</td>
              <td class="px-3 py-2">{run.totalValue?.toLocaleString() ?? '—'}</td>
              <td class="px-3 py-2">{run.extractedValue?.toLocaleString() ?? '—'}</td>
              <td class="px-3 py-2 text-slate-400">{run.notes ?? '—'}</td>
              <td class="rounded-r-xl px-3 py-2">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 transition hover:bg-slate-700"
                    on:click={() => beginEdit(run.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-rose-500/20 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/30"
                    on:click={() => deleteRun(run.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      {#if editingId}
        <form class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 text-sm" on:submit|preventDefault={saveEdit}>
          <h4 class="text-base font-semibold text-white">Edit run</h4>
          <div class="mt-4 grid gap-4 sm:grid-cols-3">
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              XP
              <input class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" type="number" bind:value={editForm.xp} />
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Value
              <input class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" type="number" bind:value={editForm.value} />
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Extract
              <input class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" type="number" bind:value={editForm.extracted} />
            </label>
            <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400 sm:col-span-3">
              <input
                class="h-4 w-4 rounded border border-slate-700 bg-slate-900 text-emerald-400 accent-emerald-400"
                type="checkbox"
                bind:checked={editForm.died}
              />
              Died this run
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Map
              <select
                class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                bind:value={editForm.map}
              >
                <option value="">Select a map</option>
                {#each mapOptions as option}
                  <option value={option.id}>{option.name}</option>
                {/each}
              </select>
            </label>
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Crew
              <input class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" type="text" bind:value={editForm.crew} />
            </label>
          </div>
          <label class="mt-4 flex flex-col gap-2 text-xs uppercase tracking-widest text-slate-400">
            Notes
            <textarea class="h-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" bind:value={editForm.notes}></textarea>
          </label>
          <div class="mt-4 flex gap-3">
            <button
              type="submit"
              class="rounded-full bg-emerald-500/20 px-4 py-2 text-xs uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/30"
            >
              Save changes
            </button>
            <button
              type="button"
              class="rounded-full bg-slate-800 px-4 py-2 text-xs uppercase tracking-wide text-slate-300 transition hover:bg-slate-700"
              on:click={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      {/if}

      {#if $lastRemovedRun}
        <div class="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <span>Run removed. Undo to restore the entry.</span>
          <button
            type="button"
            class="rounded-full bg-amber-400/20 px-3 py-1 font-semibold uppercase tracking-wide text-amber-200 transition hover:bg-amber-400/30"
            on:click={undoDelete}
          >
            Undo delete
          </button>
        </div>
      {/if}
    </div>
  </section>
</section>
