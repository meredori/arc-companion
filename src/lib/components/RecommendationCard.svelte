<script lang="ts">
  export type RecommendationAction = 'save' | 'keep' | 'salvage' | 'sell';

  export interface RecommendationCardProps {
    name: string;
    action: RecommendationAction;
    rarity?: string;
    reason?: string;
  }

  export let name: RecommendationCardProps['name'];
  export let action: RecommendationCardProps['action'];
  export let rarity: RecommendationCardProps['rarity'] = undefined;
  export let reason: RecommendationCardProps['reason'] = undefined;

  const ACTION_COPY: Record<RecommendationAction, string> = {
    save: 'Save',
    keep: 'Keep',
    salvage: 'Salvage',
    sell: 'Sell'
  };
</script>

<article class="recommendation-card">
  <header class="flex flex-wrap items-baseline justify-between gap-2">
    <h3 class="text-lg font-semibold text-white">{name}</h3>
    <span class={`badge badge-action-${action}`}>{ACTION_COPY[action]}</span>
  </header>
  {#if rarity}
    <p class="text-xs uppercase tracking-wider text-slate-400">{rarity}</p>
  {/if}
  {#if reason}
    <p class="text-sm text-slate-300">{reason}</p>
  {:else}
    <p class="text-sm text-slate-500">Rationale copy will be generated alongside data imports.</p>
  {/if}
</article>
