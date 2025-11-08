<script lang="ts" context="module">
  export type { RecommendationCardProps } from './types';
  export type { RecommendationAction } from '$lib/types';
</script>

<script lang="ts">
  import type { RecommendationCardProps } from './types';

  export let name: RecommendationCardProps['name'];
  export let action: RecommendationCardProps['action'];
  export let rarity: RecommendationCardProps['rarity'] = undefined;
  export let category: RecommendationCardProps['category'] = undefined;
  export let slug: RecommendationCardProps['slug'] = undefined;
  export let imageUrl: RecommendationCardProps['imageUrl'] = undefined;
  export let reason: RecommendationCardProps['reason'] = undefined;
  export let sellPrice: RecommendationCardProps['sellPrice'] = undefined;
  export let salvageValue: RecommendationCardProps['salvageValue'] = undefined;
  export let salvageBreakdown: RecommendationCardProps['salvageBreakdown'] = [];
  export let questNeeds: RecommendationCardProps['questNeeds'] = [];
  export let upgradeNeeds: RecommendationCardProps['upgradeNeeds'] = [];
  export let projectNeeds: RecommendationCardProps['projectNeeds'] = [];
  export let needs: RecommendationCardProps['needs'] = { quests: 0, workshop: 0, projects: 0 };
  export let alwaysKeepCategory: RecommendationCardProps['alwaysKeepCategory'] = false;
  export let variant: RecommendationCardProps['variant'] = 'simple';

  const ACTION_COPY = {
    save: 'Save',
    keep: 'Keep',
    salvage: 'Salvage',
    sell: 'Sell'
  } as const;

  const ACTION_STYLES = {
    save: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/60',
    keep: 'bg-sky-500/20 text-sky-200 border border-sky-400/60',
    salvage: 'bg-amber-500/20 text-amber-200 border border-amber-400/60',
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
  $: formattedSell = sellPrice !== undefined ? sellPrice.toLocaleString() : null;
  $: formattedSalvage = salvageValue !== undefined ? salvageValue.toLocaleString() : null;
</script>

{#if variant === 'token'}
  <article
    class="group relative rounded-xl border border-slate-900/60 bg-slate-950/50 p-2.5 text-center outline-none transition hover:border-slate-300/60 focus-visible:border-slate-200/70 focus-visible:ring-2 focus-visible:ring-slate-200/30"
    tabindex="0"
    aria-describedby={tooltipId}
  >
    <div class="flex flex-col items-center gap-2">
      <div
        class={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br text-base font-semibold uppercase tracking-wide text-white ${rarityClass}`}
        aria-hidden="true"
      >
        {#if imageUrl}
          <img src={imageUrl} alt={name} class="h-full w-full object-cover" loading="lazy" decoding="async" />
        {:else}
          <span>{iconLabel || 'ARC'}</span>
        {/if}
      </div>
      <span class={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ACTION_STYLES[action]}`}>
        {ACTION_COPY[action]}
      </span>
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

        {#if reason}
          <p class="text-slate-300">{reason}</p>
        {:else}
          <p class="text-slate-500">Action rationale will appear once personalization syncs.</p>
        {/if}

        {#if action === 'save'}
          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-widest text-slate-400">
              Quest turn-ins ({needs?.quests ?? 0})
            </p>
            <ul class="space-y-1 text-slate-200">
              {#each questNeeds as quest}
                <li class="flex items-center justify-between gap-2">
                  <span class="truncate">{quest.name}</span>
                  <span class="font-semibold text-white">×{quest.qty}</span>
                </li>
              {:else}
                <li class="text-slate-500">All quest needs satisfied.</li>
              {/each}
            </ul>
          </div>
        {:else if action === 'keep'}
          <div class="space-y-2">
            <p class="text-[10px] uppercase tracking-widest text-slate-400">Keep rationale</p>
            {#if alwaysKeepCategory}
              <p class="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-100">
                Always keep — {category ?? 'Category'} flagged in admin controls.
              </p>
            {/if}
            {#if upgradeNeeds.length > 0}
              <div>
                <p class="text-[11px] uppercase tracking-widest text-slate-400">Owned blueprints</p>
                <ul class="mt-1 space-y-1 text-slate-200">
                  {#each upgradeNeeds as upgrade}
                    <li class="flex items-center justify-between gap-2">
                      <span class="truncate">{upgrade.name}</span>
                      <span class="font-semibold text-white">×{upgrade.qty}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if projectNeeds.length > 0}
              <div>
                <p class="text-[11px] uppercase tracking-widest text-slate-400">Expedition projects</p>
                <ul class="mt-1 space-y-1 text-slate-200">
                  {#each projectNeeds as project}
                    <li class="space-y-0.5">
                      <div class="flex items-center justify-between gap-2">
                        <span class="truncate">{project.projectName} · {project.phaseName}</span>
                        <span class="font-semibold text-white">×{project.qty}</span>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if !alwaysKeepCategory && upgradeNeeds.length === 0 && projectNeeds.length === 0}
              <p class="text-slate-500">Future upgrades will call for this soon.</p>
            {/if}
          </div>
        {:else if action === 'salvage'}
          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-widest text-slate-400">
              Salvage yield ({formattedSalvage ?? '—'} value)
            </p>
            <ul class="space-y-1 text-slate-200">
              {#each salvageBreakdown as part}
                <li class="flex items-center justify-between gap-2">
                  <span class="truncate">{part.name}</span>
                  <span class="font-semibold text-white">×{part.qty}</span>
                </li>
              {:else}
                <li class="text-slate-500">No salvage output recorded.</li>
              {/each}
            </ul>
          </div>
        {:else if action === 'sell'}
          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-widest text-slate-400">Sell price</p>
            {#if formattedSell}
              <p class="text-2xl font-semibold text-white">
                {formattedSell}<span class="ml-1 text-base text-slate-400">cr</span>
              </p>
            {:else}
              <p class="text-slate-500">No vendor pricing available.</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </article>
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
    {#if reason}
      <p class="text-sm text-slate-300">{reason}</p>
    {:else}
      <p class="text-sm text-slate-500">Rationale copy will be generated alongside data imports.</p>
    {/if}
  </article>
{/if}
