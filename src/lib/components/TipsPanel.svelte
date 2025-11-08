<script lang="ts">
  import type { RunTip } from '$lib/types';

  export let heading = 'Run Tips';
  export let tips: (string | RunTip)[] = [];

  const badgeClass: Record<NonNullable<RunTip['level']>, string> = {
    info: 'text-sky-300',
    warning: 'text-amber-300',
    success: 'text-emerald-300'
  };

  const formatTip = (tip: string | RunTip) => {
    if (typeof tip === 'string') {
      return { id: tip, message: tip, level: 'info' as const } satisfies RunTip;
    }
    return { level: tip.level ?? 'info', ...tip } satisfies RunTip;
  };
</script>

<aside class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-card">
  <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-300">{heading}</h3>
  {#if tips.length === 0}
    <p class="mt-3 text-sm text-slate-500">
      Contextual guidance based on quest state, loot trends, and player performance will populate here.
    </p>
  {:else}
    <ul class="mt-4 space-y-3 text-sm text-slate-200">
      {#each tips.map(formatTip) as tip, index}
        <li class="flex gap-3">
          <span
            class={`text-xs font-semibold uppercase tracking-widest ${badgeClass[tip.level] ?? 'text-sky-300'}`}
            >{index + 1}.</span
          >
          <span>{tip.message}</span>
        </li>
      {/each}
    </ul>
  {/if}
</aside>
