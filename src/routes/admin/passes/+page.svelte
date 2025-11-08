<svelte:head>
  <title>Import Passes | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
  export let form:
    | { success?: boolean; output?: string; entry?: unknown; message?: string }
    | null = null;

  const passEntries = Object.entries(data.meta.passes);
</script>

<article class="space-y-6">
  <header class="space-y-2">
    <h2 class="text-xl font-semibold text-white">Import pipeline status</h2>
    <p class="text-sm text-slate-400">
      Review staged batches, trigger reruns, and gate promotions. Approval actions require the shared
      admin token configured in deployment.
    </p>
  </header>

  {#if form?.output}
    <div class="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      <p class="font-semibold">Command response</p>
      <pre class="mt-2 whitespace-pre-wrap text-xs text-emerald-100">{form.output}</pre>
    </div>
  {/if}

  {#if form?.message}
    <div class="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {form.message}
    </div>
  {/if}

  <table class="w-full table-fixed border-separate border-spacing-y-2 text-sm text-slate-200">
    <thead>
      <tr class="text-xs uppercase tracking-widest text-slate-500">
        <th class="rounded-l-xl bg-slate-900/70 px-3 py-2 text-left">Pass</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Batches</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Records</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Last run</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Approved</th>
        <th class="rounded-r-xl bg-slate-900/70 px-3 py-2 text-left">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each passEntries as [key, pass]}
        <tr class="rounded-xl bg-slate-900/50">
          <td class="rounded-l-xl px-3 py-2 font-semibold text-white">{pass.label}</td>
          <td class="px-3 py-2">{pass.batches}</td>
          <td class="px-3 py-2">{pass.records}</td>
          <td class="px-3 py-2 text-slate-400">{pass.lastRunAt ?? '—'}</td>
          <td class="px-3 py-2">
            <span class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${pass.approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
              {pass.approved ? 'Approved' : 'Pending'}
            </span>
          </td>
          <td class="rounded-r-xl px-3 py-2">
            <div class="flex flex-wrap gap-2">
              <form method="POST" action="?/rerun">
                <input name="pass" type="hidden" value={key} />
                <button
                  type="submit"
                  class="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 hover:bg-slate-700"
                >
                  Rerun
                </button>
              </form>
              <form method="POST" action="?/rerun">
                <input name="pass" type="hidden" value={key} />
                <input name="approve" type="hidden" value="true" />
                <button
                  type="submit"
                  class="rounded-full bg-sky-500/20 px-3 py-1 text-xs uppercase tracking-wide text-sky-300 hover:bg-sky-500/30"
                >
                  Rerun &amp; approve
                </button>
              </form>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <details class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-300">
    <summary class="cursor-pointer text-sm font-semibold text-white">Batch breakdown</summary>
    <div class="mt-3 grid gap-4 sm:grid-cols-2">
      {#each Object.entries(data.stages) as [stage, batches]}
        <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 class="text-xs uppercase tracking-widest text-slate-400">{stage}</h3>
          <ul class="mt-2 space-y-2 text-xs text-slate-300">
            {#if batches.length === 0}
              <li>No batches staged.</li>
            {:else}
              {#each batches as batch}
                <li>{batch.file} — {batch.count} records</li>
              {/each}
            {/if}
          </ul>
        </div>
      {/each}
    </div>
  </details>

  <section class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-200">
    <h3 class="text-base font-semibold text-white">Approval gate</h3>
    <p class="mt-2 text-slate-400">
      Require the shared admin token before toggling approval flags. This prevents accidental
      promotion of partial data.
    </p>
    <form class="mt-4 grid gap-3 sm:grid-cols-[200px,1fr,auto]" method="POST" action="?/approve">
      <select name="pass" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
        {#each passEntries as [key, pass]}
          <option value={key}>{pass.label}</option>
        {/each}
      </select>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="token"
          type="password"
          placeholder="Approval token"
          required
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <select
          name="approved"
          class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="true">Approve</option>
          <option value="false">Revoke approval</option>
        </select>
      </div>
      <button
        type="submit"
        class="rounded-full bg-emerald-500/20 px-4 py-2 text-xs uppercase tracking-wide text-emerald-300 hover:bg-emerald-500/30"
      >
        Update
      </button>
    </form>
  </section>

  <form method="POST" action="?/finalize" class="flex justify-end">
    <button
      type="submit"
      class="rounded-full bg-emerald-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/30"
    >
      Run Finalize (Pass F)
    </button>
  </form>
</article>
