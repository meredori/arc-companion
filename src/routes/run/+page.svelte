<svelte:head>
  <title>Run Analyzer | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  /* globals globalThis */
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { ItemIcon, ItemTooltip, RecommendationCard, RunTimer } from '$lib/components';
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
  import rawBots from '../../../static/bots.json';
  import rawMaps from '../../../static/maps.json';
  import type { PageData } from './$types';

  type MapRecord = { id: string; name?: Record<string, string> | null };

  type BotRecord = {
    id: string;
    name: string;
    image?: string | null;
    drops?: string[];
  };

  type RecommendationEntry = ReturnType<typeof recommendItemsMatching>[number];

  type LookOutItem = {
    id: string;
    name: string;
    slug?: string;
    category: string | null;
    imageUrl: string | null;
    rationale: string;
    action: RecommendationEntry['action'];
    rarity: string | null;
    needs: RecommendationEntry['needs'];
    wishlistSources: RecommendationEntry['wishlistSources'];
    sellPrice?: number;
    salvageValue?: number;
    salvageBreakdown: RecommendationEntry['salvageBreakdown'];
    questNeeds: RecommendationEntry['questNeeds'];
    upgradeNeeds: RecommendationEntry['upgradeNeeds'];
    projectNeeds: RecommendationEntry['projectNeeds'];
    alwaysKeepCategory: RecommendationEntry['alwaysKeepCategory'];
    foundIn: string[];
    botSources: BotRecord[];
  };

  const normalizeItemId = (raw: string): string =>
    `item-${raw.trim().toLowerCase().replace(/^item[_-]/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

  const bots = (rawBots as BotRecord[]).map((entry) => ({
    ...entry,
    image: entry.image ?? null,
    drops: entry.drops ?? []
  }));

  const botDropsByItemId = (() => {
    const map = new Map<string, BotRecord[]>();

    for (const bot of bots) {
      for (const drop of bot.drops ?? []) {
        const itemId = normalizeItemId(drop);
        const existing = map.get(itemId) ?? [];
        existing.push(bot);
        map.set(itemId, existing);
      }
    }

    return map;
  })();

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

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return url ?? null;
    return url.replace(/\/{2,}/g, '/');
  };

  const rarityRank = (rarity?: string | null) => {
    const priority = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const normalized = rarity?.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return priority.length;
    const token = normalized.split(/[^a-z]+/i)[0] ?? '';
    const index = priority.findIndex((label) => label === token);
    if (index !== -1) return index;
    const fuzzy = priority.findIndex((label) => normalized.startsWith(label));
    return fuzzy === -1 ? priority.length : fuzzy;
  };

  const lookOutItems = derived(recommendationContextStore, (context): LookOutItem[] => {
    const recommendations = recommendItemsMatching('', context, { sortMode: 'alphabetical' });
    const itemLookup = new Map(context.items.map((item) => [item.id, item]));
    const seen = new Set<string>();
    return recommendations
      .filter((rec) => {
        const totalNeeds = rec.needs.quests + rec.needs.workshop + rec.needs.projects;
        const hasWishlist = (rec.wishlistSources?.length ?? 0) > 0;
        const supportsRecycling = rec.action === 'recycle';
        const category = rec.category?.toLowerCase().trim();
        const isBasicMaterial = category === 'basic material';
        if (isBasicMaterial) return false;
        if (!(totalNeeds > 0 || hasWishlist || supportsRecycling)) return false;

        if (supportsRecycling && !hasWishlist && totalNeeds === 0) {
          const targets = rec.salvageBreakdown ?? [];
          const onlyFeedsBasicMaterials =
            targets.length > 0 &&
            targets.every((entry) => {
              const category = itemLookup.get(entry.itemId)?.category;
              return category?.toLowerCase().trim() === 'basic material';
            });
          if (onlyFeedsBasicMaterials) return false;
        }

        return true;
      })
      .filter((rec) => {
        if (seen.has(rec.itemId)) return false;
        seen.add(rec.itemId);
        return true;
      })
      .sort((a, b) => {
        const totalNeedsA = a.needs.quests + a.needs.workshop + a.needs.projects;
        const totalNeedsB = b.needs.quests + b.needs.workshop + b.needs.projects;
        const hasWishlistA = (a.wishlistSources?.length ?? 0) > 0;
        const hasWishlistB = (b.wishlistSources?.length ?? 0) > 0;
        const isDirectA = totalNeedsA > 0 || hasWishlistA;
        const isDirectB = totalNeedsB > 0 || hasWishlistB;

        if (isDirectA !== isDirectB) return isDirectA ? -1 : 1;

        const rarityDiff = rarityRank(a.rarity) - rarityRank(b.rarity);
        if (rarityDiff !== 0) return rarityDiff;

        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
      .map((rec) => ({
        id: rec.itemId,
        name: rec.name,
        slug: rec.slug,
        category: rec.category ?? null,
        imageUrl: resolveImageUrl(rec.imageUrl),
        rationale: rec.rationale,
        action: rec.action,
        rarity: rec.rarity ?? null,
        needs: rec.needs,
        wishlistSources: rec.wishlistSources ?? [],
        sellPrice: rec.sellPrice,
        salvageValue: rec.salvageValue,
        salvageBreakdown: rec.salvageBreakdown ?? [],
        questNeeds: rec.questNeeds ?? [],
        upgradeNeeds: rec.upgradeNeeds ?? [],
        projectNeeds: rec.projectNeeds ?? [],
        alwaysKeepCategory: rec.alwaysKeepCategory ?? false,
        foundIn: itemLookup.get(rec.itemId)?.foundIn ?? [],
        botSources: []
      }));
  });

  const lookOutGroups = derived(lookOutItems, ($lookOutItems) => {
    const arcDrops: typeof $lookOutItems = [];
    const locationBuckets = new Map<string, { label: string; items: typeof $lookOutItems }>();
    const general: typeof $lookOutItems = [];

    for (const item of $lookOutItems) {
      const botSources = botDropsByItemId.get(item.id) ?? [];
      const foundIn = item.foundIn ?? [];
      const enriched = { ...item, botSources, foundIn };

      if (botSources.length > 0) {
        arcDrops.push(enriched);
        continue;
      }

      if (foundIn.length > 0) {
        for (const location of foundIn) {
          const key = location.toLowerCase();
          const bucket = locationBuckets.get(key) ?? { label: location, items: [] as typeof $lookOutItems };
          bucket.items.push(enriched);
          locationBuckets.set(key, bucket);
        }
        continue;
      }

      general.push(enriched);
    }

    const groups: Array<{
      id: string;
      title: string;
      description: string;
      items: typeof $lookOutItems;
    }> = [];

    if (arcDrops.length > 0) {
      groups.push({
        id: 'arc-drops',
        title: 'ARC drops',
        description: 'Dropped by ARC bots and machines.',
        items: arcDrops
      });
    }

    for (const bucket of Array.from(locationBuckets.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    )) {
      groups.push({
        id: `loot-${bucket.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: `${bucket.label} loot`,
        description: '',
        items: bucket.items
      });
    }

    if (general.length > 0) {
      groups.push({
        id: 'general-loot',
        title: 'General loot',
        description: 'No location hints; keep an eye out anywhere.',
        items: general
      });
    }

    return groups;
  });

  const lookOutItemsByRarity = derived(lookOutItems, ($lookOutItems) =>
    [...$lookOutItems].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity))
  );

  const highlightRuns = derived(runs, ($runs) =>
    [...$runs]
      .filter((run) => run.extractedValue)
      .sort((a, b) => (b.extractedValue ?? 0) - (a.extractedValue ?? 0))
      .slice(0, 2)
      .map((run) => {
        const mapLabel = formatMapLabel(run.map);
        return {
          name: run.notes || new Date(run.startedAt).toLocaleString(),
          action: 'keep' as const,
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

  let runForm = createDefaultForm(get(settings).freeLoadoutDefault);
  let elapsedSeconds = 0;
  let editingId: string | null = null;
  let editForm = createEditForm();
  let startedAt: string | null = null;
  let endedAt: string | null = null;
  let runPhase: 'idle' | 'running' | 'stopped' = 'idle';
  let groupByLocation = true;
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
      freeLoadout: runForm.freeLoadout
    };
  };

  const startRun = () => {
    if (runPhase !== 'idle') return;
    const settingsValue = get(settings);
    startedAt = nowIso();
    endedAt = null;
    runPhase = 'running';
    runForm = { ...runForm, freeLoadout: runForm.freeLoadout ?? settingsValue.freeLoadoutDefault };
    startTimer(startedAt);
  };

  const stopRun = () => {
    if (runPhase !== 'running' || !startedAt) return;
    endedAt = nowIso();
    runPhase = 'stopped';
    stopTimer();
    const endTime = new Date(endedAt).getTime();
    const startTime = new Date(startedAt).getTime();
    elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
  };

  const logRun = () => {
    if (!startedAt || !endedAt) return;
    const payload = createPayload();
    const settingsValue = get(settings);
    runs.add({
      ...payload,
      startedAt,
      endedAt,
      freeLoadout: payload.freeLoadout ?? settingsValue.freeLoadoutDefault,
      map: payload.map ?? runForm.map ?? defaultMapId
    });
    resetSession();
  };

  const resetSession = () => {
    stopTimer();
    startedAt = null;
    endedAt = null;
    elapsedSeconds = 0;
    runPhase = 'idle';
    const settingsValue = get(settings);
    runForm = createDefaultForm(settingsValue.freeLoadoutDefault);
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

  onDestroy(() => stopTimer());
</script>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Run Analyzer</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Log real-time run data and monitor pacing. This placeholder layout sketches the final structure for
      timers, logging, and guidance widgets.
    </p>
  </header>

  <section class="section-card space-y-6">
    <div class="space-y-6">
      <div class="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="grid flex-1 gap-4 sm:grid-cols-2">
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
            <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
              <input
                class="h-4 w-4 rounded border border-slate-700 bg-slate-900 text-emerald-400 accent-emerald-400"
                type="checkbox"
                bind:checked={runForm.freeLoadout}
              />
              Free loadout active
            </label>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-full bg-sky-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-300 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              on:click={startRun}
              disabled={runPhase !== 'idle'}
            >
              Start run
            </button>
            {#if runPhase === 'running'}
              <button
                type="button"
                class="rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/30"
                on:click={stopRun}
              >
                Stop run
              </button>
            {/if}
          </div>
        </div>
      </div>

      {#if runPhase !== 'idle'}
        <RunTimer label="Active session" elapsed={elapsedSeconds} isRunning={runPhase === 'running'} />
      {/if}

      {#if runPhase === 'stopped'}
        <form class="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5" on:submit|preventDefault={logRun}>
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">Run summary</h2>
            <button
              type="button"
              class="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:bg-slate-700"
              on:click={resetSession}
            >
              Clear
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
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
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-xs uppercase tracking-widest text-slate-400">
              Map
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
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
              <input
                class="h-4 w-4 rounded border border-slate-700 bg-slate-900 text-emerald-400 accent-emerald-400"
                type="checkbox"
                bind:checked={runForm.freeLoadout}
              />
              Free loadout active
            </label>
            <label class="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
              <input
                class="h-4 w-4 rounded border border-slate-700 bg-slate-900 text-emerald-400 accent-emerald-400"
                type="checkbox"
                bind:checked={runForm.died}
              />
              Died this run
            </label>
          </div>
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
            Log run
          </button>
        </form>
      {/if}

      <div class="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Look out for</p>
            <p class="text-sm text-slate-300">
              Priority loot and materials worth grabbing during this run.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400">
              <input
                class="h-4 w-4 rounded border border-slate-700 bg-slate-900 text-emerald-400 accent-emerald-400"
                type="checkbox"
                bind:checked={groupByLocation}
              />
              Group by location
            </label>
            <span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {$lookOutItems.length}
            </span>
          </div>
        </div>
        {#if $lookOutItems.length === 0}
          <p class="text-sm text-slate-400">
            Add wishlist targets, upgrades, or projects to see high-value pickups at a glance.
          </p>
        {:else}
          {#if groupByLocation}
            <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {#each $lookOutGroups as group (group.id)}
                <div class="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/80 p-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="space-y-1">
                      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{group.title}</p>
                      {#if group.description}
                        <p class="text-[13px] text-slate-400">{group.description}</p>
                      {/if}
                    </div>
                    <span class="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      {group.items.length}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    {#each group.items as item}
                      {@const tooltipId = `lookout-${(item.slug ?? item.id ?? item.name)
                        .replace(/[^a-z0-9-]/gi, '-')
                        .toLowerCase()}`}
                      <div class="aspect-square">
                        <ItemIcon
                          className="h-full"
                          name={item.name}
                          rarity={item.rarity ?? null}
                          imageUrl={item.imageUrl ?? null}
                          tag={item.action}
                          tooltipId={tooltipId}
                          showTooltip={true}
                          sizeClass="h-full w-full"
                          roundedClass="rounded-xl"
                          paddingClass="p-2"
                        >
                          <ItemTooltip
                            slot="tooltip"
                            id={tooltipId}
                            name={item.name}
                            action={item.action}
                            rarity={item.rarity}
                            category={item.category}
                            reason={item.rationale}
                            sellPrice={item.sellPrice}
                            salvageValue={item.salvageValue}
                            salvageBreakdown={item.salvageBreakdown}
                            questNeeds={item.questNeeds}
                            upgradeNeeds={item.upgradeNeeds}
                            projectNeeds={item.projectNeeds}
                            needs={item.needs}
                            alwaysKeepCategory={item.alwaysKeepCategory}
                            wishlistSources={item.wishlistSources}
                            foundIn={item.foundIn}
                            botSources={item.botSources?.map((bot) => ({ id: bot.id, name: bot.name })) ?? []}
                          />
                        </ItemIcon>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/80 p-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Priority items</p>
                <span class="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  {$lookOutItemsByRarity.length}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {#each $lookOutItemsByRarity as item}
                  {@const tooltipId = `lookout-${(item.slug ?? item.id ?? item.name)
                    .replace(/[^a-z0-9-]/gi, '-')
                    .toLowerCase()}`}
                  <div class="aspect-square">
                    <ItemIcon
                      className="h-full"
                      name={item.name}
                      rarity={item.rarity ?? null}
                      imageUrl={item.imageUrl ?? null}
                      tag={item.action}
                      tooltipId={tooltipId}
                      showTooltip={true}
                      sizeClass="h-full w-full"
                      roundedClass="rounded-xl"
                      paddingClass="p-2"
                    >
                      <ItemTooltip
                        slot="tooltip"
                        id={tooltipId}
                        name={item.name}
                        action={item.action}
                        rarity={item.rarity}
                        category={item.category}
                        reason={item.rationale}
                        sellPrice={item.sellPrice}
                        salvageValue={item.salvageValue}
                        salvageBreakdown={item.salvageBreakdown}
                        questNeeds={item.questNeeds}
                        upgradeNeeds={item.upgradeNeeds}
                        projectNeeds={item.projectNeeds}
                        needs={item.needs}
                        alwaysKeepCategory={item.alwaysKeepCategory}
                        wishlistSources={item.wishlistSources}
                        foundIn={item.foundIn}
                        botSources={item.botSources?.map((bot) => ({ id: bot.id, name: bot.name })) ?? []}
                      />
                    </ItemIcon>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
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
