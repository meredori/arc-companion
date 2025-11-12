<svelte:head>
  <title>Runs Dashboard | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  import { derived, get } from 'svelte/store';
  import { RecommendationCard, TipsPanel } from '$lib/components';
  import { lastRemovedRun, runs } from '$lib/stores/app';

  export let data;
  export let form: unknown;
  export let params: Record<string, string>;
  const __runsPageProps = { data, form, params };
  void __runsPageProps;

  const highlightRuns = derived(runs, ($runs) =>
    [...$runs]
      .filter((run) => run.extractedValue)
      .sort((a, b) => (b.extractedValue ?? 0) - (a.extractedValue ?? 0))
      .slice(0, 2)
      .map((run) => ({
        name: run.notes || new Date(run.startedAt).toLocaleString(),
        action: 'save' as const,
        rarity: run.crew ? `${run.crew} · ${formatDuration(run)}` : formatDuration(run),
        reason: `Extracted ${run.extractedValue?.toLocaleString() ?? 0} coins.`
      }))
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
    const notes = [];
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

  let editingId: string | null = null;
  let editForm = createEditForm();

  function createEditForm() {
    return {
      xp: '',
      value: '',
      extracted: '',
      deaths: '',
      notes: '',
      crew: ''
    };
  }

  const beginEdit = (runId: string) => {
    const run = get(runs).find((entry) => entry.id === runId);
    if (!run) return;
    editingId = runId;
    editForm = {
      xp: run.totalXp?.toString() ?? '',
      value: run.totalValue?.toString() ?? '',
      extracted: run.extractedValue?.toString() ?? '',
      deaths: run.deaths?.toString() ?? '',
      notes: run.notes ?? '',
      crew: run.crew ?? ''
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
      deaths: editForm.deaths ? Number(editForm.deaths) : undefined,
      notes: editForm.notes || undefined,
      crew: editForm.crew || undefined
    });
    cancelEdit();
  };

  const deleteRun = (id: string) => runs.remove(id);
  const undoDelete = () => runs.restoreLast();

  function formatDuration(run) {
    if (!run.startedAt || !run.endedAt) {
      return 'In progress';
    }
    const seconds = Math.max(0, Math.floor((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  }
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
      <h2 class="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">History</h2>
      <table class="w-full table-fixed border-separate border-spacing-y-2 text-sm text-slate-200">
        <thead>
          <tr class="text-xs uppercase tracking-widest text-slate-500">
            <th class="rounded-l-xl bg-slate-900/60 px-3 py-2 text-left">When</th>
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
              <td class="px-3 py-2">{run.totalXp?.toLocaleString() ?? '—'}</td>
              <td class="px-3 py-2">{run.totalValue?.toLocaleString() ?? '—'}</td>
              <td class="px-3 py-2">{run.extractedValue?.toLocaleString() ?? '—'}</td>
              <td class="px-3 py-2 text-slate-400">{run.notes ?? '—'}</td>
              <td class="rounded-r-xl px-3 py-2">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 hover:bg-slate-700"
                    on:click={() => beginEdit(run.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-rose-500/20 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 hover:bg-rose-500/30"
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
          <h3 class="text-base font-semibold text-white">Edit run</h3>
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
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Deaths
              <input class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" type="number" bind:value={editForm.deaths} />
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
              class="rounded-full bg-emerald-500/20 px-4 py-2 text-xs uppercase tracking-wide text-emerald-300 hover:bg-emerald-500/30"
            >
              Save changes
            </button>
            <button
              type="button"
              class="rounded-full bg-slate-800 px-4 py-2 text-xs uppercase tracking-wide text-slate-300 hover:bg-slate-700"
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
            class="rounded-full bg-amber-400/20 px-3 py-1 font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-400/30"
            on:click={undoDelete}
          >
            Undo delete
          </button>
        </div>
      {/if}
    </div>
  </section>
</section>
