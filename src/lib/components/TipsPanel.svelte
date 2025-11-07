<script lang="ts">
  export let heading = 'Run Tips';
  export let tips: string[] = [];
</script>

<aside class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-card">
  <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-300">{heading}</h3>
  {#if tips.length === 0}
    <p class="mt-3 text-sm text-slate-500">
      Contextual guidance based on quest state, loot trends, and player performance will populate here.
    </p>
  {:else}
    <ul class="mt-4 space-y-3 text-sm text-slate-200">
      {#each tips as tip, index}
        <li class="flex gap-3">
          <span class="text-xs font-semibold uppercase tracking-widest text-sky-300">{index + 1}.</span>
          <span>{tip}</span>
        </li>
      {/each}
    </ul>
  {/if}
</aside>
