<script lang="ts" context="module">
  export type { RecommendationCardProps } from './types';
  export type { RecommendationAction } from '$lib/types';
</script>

<script lang="ts">
  import { assets, base } from '$app/paths';
  import type { RecommendationCardProps } from './types';

  export let name: RecommendationCardProps['name'];
  export let action: RecommendationCardProps['action'];
  export let rarity: RecommendationCardProps['rarity'] = undefined;
  export let category: RecommendationCardProps['category'] = undefined;
  export let slug: RecommendationCardProps['slug'] = undefined;
  export let imageUrl: RecommendationCardProps['imageUrl'] = undefined;
  export let reason: RecommendationCardProps['reason'] = undefined;
  export let usageLines: RecommendationCardProps['usageLines'] = [];
  export let variant: RecommendationCardProps['variant'] = 'simple';
  export let showActionBadge: RecommendationCardProps['showActionBadge'] = true;

  const ACTION_COPY = {
    keep: 'Keep',
    recycle: 'Recycle',
    sell: 'Sell'
  } as const;

  const ACTION_STYLES = {
    keep: 'bg-sky-500/20 text-sky-200 border border-sky-400/60',
    recycle: 'bg-amber-500/20 text-amber-200 border border-amber-400/60',
    sell: 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
  } as const;

  const rarityChips: Record<string, string> = {
    legendary: 'from-amber-400/40 via-amber-600/40 to-amber-800/40 border-amber-400/60',
    epic: 'from-fuchsia-400/40 via-fuchsia-600/40 to-fuchsia-800/40 border-fuchsia-400/60',
    rare: 'from-sky-400/40 via-sky-600/40 to-sky-800/40 border-sky-400/60',
    uncommon: 'from-emerald-400/40 via-emerald-600/40 to-emerald-800/40 border-emerald-400/60',
    common: 'from-slate-400/30 via-slate-600/30 to-slate-800/30 border-slate-500/60',
    default: 'from-slate-500/30 via-slate-700/30 to-slate-900/30 border-slate-700/60'
  };

  const sanitize = (value: string) => value.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  $: rarityClass =
    rarityChips[rarity ? rarity.toLowerCase() : 'default'] ?? rarityChips.default;
  $: iconLabel =
    category?.slice(0, 3).toUpperCase() ??
    name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  $: tooltipId = `loot-tooltip-${sanitize(slug ?? name)}`;
  $: resolvedImageUrl = (() => {
    if (!imageUrl) return imageUrl;
    if (!imageUrl.startsWith('/')) return imageUrl;

    const prefix = assets || base || '';
    return `${prefix}${imageUrl}`.replace(/\/{2,}/g, '/');
  })();
  $: displayUsageLines = (() => {
    const normalized = (usageLines ?? [])
      .map((line) => line?.trim())
      .filter((value): value is string => Boolean(value));
    const unique = Array.from(new Set(normalized));

    if (unique.length > 0) return unique;

    const fallback = reason?.trim();
    return fallback ? [fallback] : [];
  })();
</script>

{#if variant === 'token'}
  <button
    type="button"
    class="group relative w-full rounded-xl border border-slate-900/60 bg-slate-950/50 p-2 text-center outline-none transition hover:border-slate-300/60 focus-visible:border-slate-200/70 focus-visible:ring-2 focus-visible:ring-slate-200/30"
    aria-describedby={tooltipId}
    aria-label={`Details for ${name}`}
  >
    <div class="flex flex-col items-center gap-1.5">
      <div
        class={`flex ${showActionBadge ? 'h-16 w-16' : 'h-20 w-20'} items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br text-sm font-semibold uppercase tracking-wide text-white ${rarityClass}`}
        aria-hidden="true"
      >
        {#if resolvedImageUrl}
          <img src={resolvedImageUrl} alt={name} class="h-full w-full object-cover" loading="lazy" decoding="async" />
        {:else}
          <span>{iconLabel || 'ARC'}</span>
        {/if}
      </div>
      {#if showActionBadge}
        <span class={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${ACTION_STYLES[action]}`}>
          {ACTION_COPY[action]}
        </span>
      {/if}
    </div>

    
    <div
      id={tooltipId}
      role="tooltip"
      class="pointer-events-none absolute left-1/2 top-0 z-20 hidden w-56 -translate-x-1/2 -translate-y-full rounded-2xl border border-slate-800/80 bg-slate-950/95 p-4 text-left text-xs text-slate-100 shadow-2xl shadow-black/60 transition group-hover:flex group-focus-visible:flex"
    >
      <div class="space-y-2">
        <header class="space-y-1">
          <div class="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
            {#if category}
              <span class="rounded-full border border-slate-700/70 px-2 py-0.5">{category}</span>
            {/if}
            {#if rarity}
              <span class="rounded-full border border-slate-700/50 px-2 py-0.5 text-slate-200">{rarity}</span>
            {/if}
          </div>
          <p class="text-base font-semibold text-white">{name}</p>
        </header>

        {#if displayUsageLines.length > 0}
          <ul class="space-y-1 text-slate-200">
            {#each displayUsageLines as line}
              <li class="flex items-start gap-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400/70"></span>
                <span>{line}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-slate-500">Action rationale will appear once personalization syncs.</p>
        {/if}
      </div>
    </div>
  </button>
{:else}
  <article class="recommendation-card">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="text-lg font-semibold text-white">{name}</h3>
      <span class={`badge badge-action-${action}`}>{ACTION_COPY[action]}</span>
    </header>
    {#if category || rarity}
      <p class="text-xs uppercase tracking-widest text-slate-500">
        {[category, rarity].filter(Boolean).join(' · ')}
      </p>
    {/if}
    {#if displayUsageLines.length > 0}
      <ul class="mt-2 space-y-1 text-sm text-slate-200">
        {#each displayUsageLines as line}
          <li class="flex items-start gap-2">
            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400/70"></span>
            <span>{line}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-sm text-slate-500">Rationale copy will be generated alongside data imports.</p>
    {/if}
  </article>
{/if}
