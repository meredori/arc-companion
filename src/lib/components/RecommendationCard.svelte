<script lang="ts" context="module">
  export type { RecommendationCardProps } from './types';
  export type { RecommendationAction } from '$lib/types';
</script>

<script lang="ts">
  import ItemIcon from './ItemIcon.svelte';
  import ItemTooltip from './ItemTooltip.svelte';
  import type { RecommendationCardProps } from './types';

  export let name: RecommendationCardProps['name'];
  export let action: RecommendationCardProps['action'];
  export let rarity: RecommendationCardProps['rarity'] = undefined;
  export let category: RecommendationCardProps['category'] = undefined;
  export let slug: RecommendationCardProps['slug'] = undefined;
  export let imageUrl: RecommendationCardProps['imageUrl'] = undefined;
  export let reason: RecommendationCardProps['reason'] = undefined;
  export let sellPrice: RecommendationCardProps['sellPrice'] = undefined;
  export let stackSize: RecommendationCardProps['stackSize'] = undefined;
  export let stackSellValue: RecommendationCardProps['stackSellValue'] = undefined;
  export let salvageValue: RecommendationCardProps['salvageValue'] = undefined;
  export let salvageBreakdown: RecommendationCardProps['salvageBreakdown'] = [];
  export let questNeeds: RecommendationCardProps['questNeeds'] = [];
  export let upgradeNeeds: RecommendationCardProps['upgradeNeeds'] = [];
  export let projectNeeds: RecommendationCardProps['projectNeeds'] = [];
  export let needs: RecommendationCardProps['needs'] = { quests: 0, workshop: 0, projects: 0 };
  export let alwaysKeepCategory: RecommendationCardProps['alwaysKeepCategory'] = false;
  export let variant: RecommendationCardProps['variant'] = 'simple';
  export let wishlistSources: RecommendationCardProps['wishlistSources'] = [];
  let displayAction: RecommendationCardProps['action'] = action;

  const ACTION_COPY = {
    keep: 'Keep',
    recycle: 'Recycle',
    sell: 'Sell'
  } as const;

  const ACTION_STYLES = {
    keep: 'badge badge-action-keep',
    recycle: 'badge badge-action-recycle',
    sell: 'badge badge-action-sell'
  } as const;

  const sanitize = (value: string) => value.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  $: totalNeeds = (needs?.quests ?? 0) + (needs?.workshop ?? 0) + (needs?.projects ?? 0);
  $: tooltipId = `loot-tooltip-${sanitize(slug ?? name)}`;
  $: displayAction = action;
  $: formattedStackSellValue =
    stackSellValue !== undefined ? stackSellValue.toLocaleString() : undefined;
  $: wishlistSummary = (() => {
    if (!wishlistSources || wishlistSources.length === 0) return [] as { name: string; notes: string[] }[];
    const map = new Map<string, { name: string; notes: Set<string> }>();
    for (const source of wishlistSources) {
      const note = source.note?.trim();
      const entry = map.get(source.targetItemId);
      if (entry) {
        if (note) entry.notes.add(note);
      } else {
        map.set(source.targetItemId, {
          name: source.targetName,
          notes: note ? new Set([note]) : new Set()
        });
      }
    }
    return Array.from(map.values()).map((entry) => ({
      name: entry.name,
      notes: Array.from(entry.notes)
    }));
  })();
</script>

{#if variant === 'token'}
  <button
    type="button"
    class="group relative block aspect-square w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-slate-200/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    aria-describedby={tooltipId}
    aria-label={`Details for ${name}`}
  >
    <ItemIcon
      className="h-full"
      name={name}
      rarity={rarity ?? null}
      imageUrl={imageUrl ?? null}
      tag={displayAction}
      tooltipId={tooltipId}
      showTooltip={true}
      sizeClass="h-full w-full"
      roundedClass="rounded-xl"
      paddingClass="p-2"
    >
      <ItemTooltip
        slot="tooltip"
        id={tooltipId}
        name={name}
        action={action}
        rarity={rarity}
        category={category}
        reason={reason}
        sellPrice={sellPrice}
        stackSize={stackSize}
        stackSellValue={stackSellValue}
        salvageValue={salvageValue}
        salvageBreakdown={salvageBreakdown}
        questNeeds={questNeeds}
        upgradeNeeds={upgradeNeeds}
        projectNeeds={projectNeeds}
        needs={needs}
        alwaysKeepCategory={alwaysKeepCategory}
        wishlistSources={wishlistSources}
      />
    </ItemIcon>
  </button>
{:else}
  <article class="recommendation-card">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="text-lg font-semibold text-white">{name}</h3>
      <span class={`${ACTION_STYLES[displayAction]}`}>{ACTION_COPY[displayAction]}</span>
    </header>
    {#if category || rarity}
      <p class="text-xs uppercase tracking-widest text-slate-500">
        {[category, rarity].filter(Boolean).join(' · ')}
      </p>
    {/if}
    {#if stackSize || formattedStackSellValue}
      <div class="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-slate-300">
        {#if stackSize}
          <span class="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 font-semibold text-slate-100">
            Stack ×{stackSize}
          </span>
        {/if}
        {#if formattedStackSellValue}
          <span class="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 font-semibold text-slate-200">
            Stack ₡{formattedStackSellValue}
          </span>
        {/if}
      </div>
    {/if}
    {#if wishlistSummary.length > 0}
      <div class="mt-2 space-y-2">
        {#each wishlistSummary as target}
          <div class="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-2">
            <p class="text-[10px] uppercase tracking-widest text-sky-200">Wishlist target</p>
            <p class="text-sm font-semibold text-white">{target.name}</p>
            {#if target.notes.length > 0}
              <p class="text-[11px] text-sky-100/90">{target.notes.join('; ')}</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    {#if reason}
      <p class="text-sm text-slate-300">{reason}</p>
    {:else}
      <p class="text-sm text-slate-500">Rationale copy will be generated alongside data imports.</p>
    {/if}

    {#if totalNeeds > 0 || alwaysKeepCategory}
      <div class="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-slate-400">
        {#if needs?.quests}
          <span class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-100">
            Quests ×{needs.quests}
          </span>
        {/if}
        {#if needs?.workshop}
          <span class="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-100">
            Upgrades ×{needs.workshop}
          </span>
        {/if}
        {#if needs?.projects}
          <span class="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-0.5 font-semibold text-fuchsia-100">
            Projects ×{needs.projects}
          </span>
        {/if}
        {#if alwaysKeepCategory}
          <span class="rounded-full border border-slate-600 bg-slate-800/80 px-2 py-0.5 font-semibold text-slate-100">
            Admin keep
          </span>
        {/if}
      </div>
    {/if}
  </article>
{/if}
