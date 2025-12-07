<script lang="ts">
  import type { RecommendationCardProps } from './types';

  const ACTION_COPY = {
    keep: 'Keep',
    recycle: 'Recycle',
    sell: 'Sell'
  } as const;

  const ACTION_STYLES = {
    keep: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
    recycle: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
    sell: 'border-rose-400/50 bg-rose-500/10 text-rose-100'
  } as const;

  export let id: string | undefined = undefined;
  export let name: RecommendationCardProps['name'];
  export let action: RecommendationCardProps['action'];
  export let rarity: RecommendationCardProps['rarity'] = undefined;
  export let category: RecommendationCardProps['category'] = undefined;
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
  export let wishlistSources: RecommendationCardProps['wishlistSources'] = [];
  export let foundIn: RecommendationCardProps['foundIn'] = [];
  export let botSources: RecommendationCardProps['botSources'] = [];
  let displayAction: RecommendationCardProps['action'] = action;
  
  $: totalNeeds = (needs?.quests ?? 0) + (needs?.workshop ?? 0) + (needs?.projects ?? 0);
  $: formattedSell = sellPrice !== undefined ? sellPrice.toLocaleString() : null;
  $: formattedStackSell =
    stackSellValue !== undefined ? stackSellValue.toLocaleString() : null;
  $: formattedSalvage = salvageValue !== undefined ? salvageValue.toLocaleString() : null;
  $: displayAction = action;
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

<div id={id} class="space-y-3">
  <header class="space-y-1">
    <div class="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
      {#if category}
        <span class="rounded-full border border-slate-700/70 px-2 py-0.5">{category}</span>
      {/if}
      {#if rarity}
        <span class="rounded-full border border-slate-700/50 px-2 py-0.5 text-slate-200">{rarity}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <p class="text-base font-semibold text-white">{name}</p>
      <span class={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ACTION_STYLES[displayAction]}`}>
        {ACTION_COPY[displayAction]}
      </span>
    </div>
  </header>

  {#if stackSize || formattedStackSell}
    <div class="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-slate-300">
      {#if stackSize}
        <span class="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-0.5 font-semibold text-slate-100">
          Stack ×{stackSize}
        </span>
      {/if}
      {#if formattedStackSell}
        <span class="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-0.5 font-semibold text-slate-200">
          Stack ₡{formattedStackSell}
        </span>
      {/if}
    </div>
  {/if}

  {#if (foundIn?.length ?? 0) > 0 || (botSources?.length ?? 0) > 0}
    <div class="flex flex-wrap gap-1 text-[10px] uppercase tracking-widest text-slate-300">
      {#if (botSources?.length ?? 0) > 0}
        <span class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-100">
          ARC: {botSources.map((bot) => bot.name).join(', ')}
        </span>
      {/if}
      {#each foundIn ?? [] as location}
        <span class="rounded-full border border-slate-700/60 bg-slate-800/70 px-2 py-0.5 font-semibold text-slate-200">
          {location}
        </span>
      {/each}
    </div>
  {/if}

  {#if wishlistSummary.length > 0}
    <div class="space-y-2">
      {#each wishlistSummary as target}
        <div class="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2">
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
    <p class="text-slate-300">{reason}</p>
  {:else}
    <p class="text-slate-500">Action rationale will appear once personalization syncs.</p>
  {/if}

  {#if totalNeeds > 0 || alwaysKeepCategory}
    <div class="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-slate-400">
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

  {#if action === 'keep'}
    <div class="space-y-2">
      {#if questNeeds.length > 0}
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-widest text-emerald-100">Quest turn-ins</p>
          <ul class="space-y-1 text-slate-200">
            {#each questNeeds as quest}
              <li class="flex items-center justify-between gap-2 rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2">
                <span class="truncate">{quest.name}</span>
                <span class="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-300/80"></span>
                  ×{quest.qty}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
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
  {:else if action === 'recycle'}
    <div class="space-y-1">
      <p class="text-[10px] uppercase tracking-widest text-slate-400">
        Recycle yield ({formattedSalvage ?? '—'} value)
      </p>
      <ul class="space-y-1 text-slate-200">
        {#each salvageBreakdown as part}
          <li class="flex items-center justify-between gap-2">
            <span class="truncate">{part.name}</span>
            <span class="font-semibold text-white">×{part.qty}</span>
          </li>
        {:else}
          <li class="text-slate-500">No recycle output recorded.</li>
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
        {#if formattedStackSell}
          <p class="text-sm text-slate-300">
            Stack sell value {formattedStackSell}<span class="ml-1 text-[11px] text-slate-400">cr</span>
          </p>
        {/if}
      {:else}
        <p class="text-slate-500">No vendor pricing available.</p>
      {/if}
    </div>
  {/if}
</div>
