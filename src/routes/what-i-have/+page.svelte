<svelte:head>
  <title>What I Have | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { QuestChecklist, SearchBar, TipsPanel } from '$lib/components';
  import {
    blueprints,
    hydrateFromCanonical,
    projectProgress,
    quests,
    workbenchUpgrades
  } from '$lib/stores/app';
  import { tipsForBlueprints, tipsForWorkshop } from '$lib/tips';
  import type {
    ItemRecord,
    Project,
    ProjectPhase,
    ProjectProgressState,
    QuestChain,
    UpgradePack
  } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __whatIHaveProps = { form, params };
  void __whatIHaveProps;

  const questDefs = data.quests ?? [];
  const benchUpgrades: UpgradePack[] = data.workbenchUpgrades ?? [];
  const items: ItemRecord[] = data.items ?? [];
  const projects: Project[] = data.projects ?? [];
  const chains: QuestChain[] = data.chains ?? [];
  const blueprintRecords: ItemRecord[] = data.blueprints ?? [];

  onMount(() => {
    hydrateFromCanonical({
      quests: questDefs.map((quest) => ({ id: quest.id, completed: false })),
      workbenchUpgrades: benchUpgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      })),
      blueprints: blueprintRecords.map((blueprint) => ({
        id: blueprint.id,
        name: blueprint.name,
        slug: blueprint.slug,
        rarity: blueprint.rarity ?? null,
        category: blueprint.category ?? null,
        imageUrl: blueprint.imageUrl ?? null,
        owned: false
      }))
    });
  });

  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? id;
  const questById = new Map(questDefs.map((quest) => [quest.id, quest]));
  const chainById = new Map(chains.map((chain) => [chain.id, chain]));
  const questChainLookup = new Map<string, { chainId: string; chainName: string; index: number }>();
  chains.forEach((chain) => {
    chain.stages?.forEach((questId, index) => {
      questChainLookup.set(questId, { chainId: chain.id, chainName: chain.name, index });
    });
  });

  let hideCompleted = false;

  const questChecklist = derived(quests, ($quests) =>
    questDefs.map((quest) => {
      const progress = $quests.find((entry) => entry.id === quest.id);
      const requirements = quest.items
        .map((requirement) => `${requirement.qty}x ${itemName(requirement.itemId)}`)
        .join(', ');
      const chainInfo = questChainLookup.get(quest.id);
      const prefix = chainInfo
        ? `${chainInfo.chainName ?? chainInfo.chainId} · Step ${chainInfo.index + 1}`
        : null;
      const parts = [prefix ? `${prefix}: ${quest.name}` : quest.name];
      if (requirements) {
        parts.push(`— ${requirements}`);
      }
      return {
        id: quest.id,
        label: parts.join(' '),
        completed: progress?.completed ?? false
      };
    })
  );

  const toggleQuest = (event: CustomEvent<{ id: string }>) => {
    quests.toggle(event.detail.id);
  };

  type WorkbenchEntry = {
    upgrade: UpgradePack;
    state: {
      id: string;
      name: string;
      bench: string;
      level: number;
      owned: boolean;
    };
  };

  const workbenchEntries = derived(workbenchUpgrades, ($entries) => {
    const map = new Map($entries.map((entry) => [entry.id, entry]));
    return benchUpgrades.map<WorkbenchEntry>((upgrade) => {
      const state =
        map.get(upgrade.id) ??
        ({
          id: upgrade.id,
          name: upgrade.name,
          bench: upgrade.bench,
          level: upgrade.level,
          owned: false
        } as const);
      return { upgrade, state };
    });
  });

  type LevelGroup = {
    level: number;
    entries: WorkbenchEntry[];
    owned: boolean;
    requirements: { id: string; name: string; qty: number }[];
  };

  type BenchGroup = {
    bench: string;
    levels: LevelGroup[];
    owned: boolean;
  };

  const benchGroups = derived(workbenchEntries, ($entries) => {
    const benchMap = new Map<string, Map<number, LevelGroup>>();
    for (const entry of $entries) {
      const benchName = entry.upgrade.bench || 'Workshop';
      if (!benchMap.has(benchName)) {
        benchMap.set(benchName, new Map());
      }
      const levelMap = benchMap.get(benchName)!;
      const key = entry.upgrade.level ?? 0;
      if (!levelMap.has(key)) {
        levelMap.set(key, {
          level: key,
          entries: [],
          owned: true,
          requirements: []
        });
      }
      const bucket = levelMap.get(key)!;
      bucket.entries.push(entry);
      bucket.owned = bucket.owned && entry.state.owned;
      bucket.requirements.push(
        ...entry.upgrade.items.map((req) => ({
          id: req.itemId,
          name: itemName(req.itemId),
          qty: req.qty
        }))
      );
    }
    return [...benchMap.entries()].map<BenchGroup>(([bench, levelMap]) => {
      const levels = [...levelMap.values()].sort((a, b) => a.level - b.level);
      return {
        bench,
        levels,
        owned: levels.every((level) => level.owned)
      };
    });
  });

  const setWorkbenchOwnership = (entry: WorkbenchEntry, owned: boolean) =>
    workbenchUpgrades.upsert({
      id: entry.upgrade.id,
      name: entry.upgrade.name,
      bench: entry.upgrade.bench,
      level: entry.upgrade.level,
      owned
    });

  const toggleLevel = (level: LevelGroup) => {
    const next = !level.owned;
    level.entries.forEach((entry) => setWorkbenchOwnership(entry, next));
  };

  const toggleBench = (bench: BenchGroup) => {
    const next = !bench.owned;
    bench.levels.forEach((level) => level.entries.forEach((entry) => setWorkbenchOwnership(entry, next)));
  };

  const toggleUpgrade = (entry: WorkbenchEntry) => {
    setWorkbenchOwnership(entry, !entry.state.owned);
  };

  type BlueprintEntry = {
    record: ItemRecord;
    state: {
      id: string;
      owned: boolean;
      name?: string;
      slug?: string;
      rarity?: string | null;
      category?: string | null;
      imageUrl?: string | null;
    };
  };

  const blueprintEntries = derived(blueprints, ($blueprints) => {
    const map = new Map($blueprints.map((entry) => [entry.id, entry]));
    return blueprintRecords.map<BlueprintEntry>((record) => {
      const state =
        map.get(record.id) ??
        ({
          id: record.id,
          owned: false,
          name: record.name,
          slug: record.slug,
          rarity: record.rarity ?? null,
          category: record.category ?? null,
          imageUrl: record.imageUrl ?? null
        } as const);
      return { record, state };
    });
  });

  const blueprintCatalog = derived(blueprintEntries, ($entries) =>
    $entries.map((entry) => ({
      entry,
      id: entry.record.id,
      name: entry.record.name,
      slug: entry.record.slug,
      rarity: entry.record.rarity,
      sell: entry.record.sell,
      category: entry.record.category,
      owned: entry.state.owned,
      imageUrl: entry.record.imageUrl ?? null,
      notes: entry.record.notes ?? null
    }))
  );

  const setBlueprintOwnership = (entry: BlueprintEntry, owned: boolean) =>
    blueprints.upsert({
      id: entry.record.id,
      name: entry.record.name,
      slug: entry.record.slug,
      rarity: entry.record.rarity ?? null,
      category: entry.record.category ?? null,
      imageUrl: entry.record.imageUrl ?? null,
      owned
    });

  const toggleBlueprint = (entry: BlueprintEntry) => setBlueprintOwnership(entry, !entry.state.owned);

  const blueprintSummary = derived(blueprints, ($blueprints) => {
    const owned = $blueprints.filter((bp) => bp.owned).length;
    return {
      owned,
      total: blueprintRecords.length,
      tips: tipsForBlueprints(owned, blueprintRecords.length)
    };
  });

  let workshopFilter = '';
  let blueprintQuery = '';

  $: currentBenchGroups = $benchGroups;
  const matchesWorkshopFilter = (group: BenchGroup, term: string) => {
    const needle = term.trim().toLowerCase();
    if (!needle) return true;
    if (group.bench.toLowerCase().includes(needle)) return true;
    return group.levels.some(
      (level) =>
        `level ${level.level}`.includes(needle) ||
        level.requirements.some((req) => req.name.toLowerCase().includes(needle))
    );
  };

  $: filteredBenchGroups = currentBenchGroups.filter(
    (group) => matchesWorkshopFilter(group, workshopFilter) && (!hideCompleted || !group.owned)
  );

  $: catalog = $blueprintCatalog;
  $: filteredBlueprints = catalog.filter((entry) => {
    if (!blueprintQuery.trim()) return true;
    const term = blueprintQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(term) ||
      (entry.slug ?? '').toLowerCase().includes(term) ||
      (entry.rarity ?? '').toLowerCase().includes(term) ||
      (entry.category ?? '').toLowerCase().includes(term)
    );
  });

  $: questCompletionSet = new Set($quests.filter((entry) => entry.completed).map((entry) => entry.id));

  const isQuestUnlocked = (questId: string) => {
    const info = questChainLookup.get(questId);
    if (!info) return true;
    const chain = chainById.get(info.chainId);
    const stages = chain?.stages ?? [];
    return stages.slice(0, info.index).every((id) => questCompletionSet.has(id));
  };

  const compareQuestOrder = (aId: string, bId: string) => {
    const infoA = questChainLookup.get(aId);
    const infoB = questChainLookup.get(bId);
    if (infoA && infoB) {
      if (infoA.chainId === infoB.chainId) {
        return infoA.index - infoB.index;
      }
      return (infoA.chainName ?? infoA.chainId).localeCompare(infoB.chainName ?? infoB.chainId);
    }
    if (infoA) return -1;
    if (infoB) return 1;
    const questA = questById.get(aId);
    const questB = questById.get(bId);
    return (questA?.name ?? aId).localeCompare(questB?.name ?? bId);
  };

  $: visibleQuestItems = ($questChecklist ?? [])
    .filter((item) => {
      const completed = questCompletionSet.has(item.id);
      const unlocked = isQuestUnlocked(item.id) || completed;
      if (!unlocked) return false;
      if (hideCompleted && completed) return false;
      return true;
    })
    .sort((a, b) => compareQuestOrder(a.id, b.id));

  const deliveredAmount = (
    progressMap: ProjectProgressState,
    projectId: string,
    phaseId: string,
    itemId: string
  ) => progressMap?.[projectId]?.[phaseId]?.[itemId] ?? 0;

  const phaseCompleted = (progressMap: ProjectProgressState, projectId: string, phase: ProjectPhase) =>
    phase.requirements.every(
      (req) => deliveredAmount(progressMap, projectId, phase.id, req.itemId) >= req.qty
    );

  const projectCompleted = (progressMap: ProjectProgressState, project: Project) =>
    project.phases.every((phase) => phaseCompleted(progressMap, project.id, phase));

  const setProjectContribution = (
    projectId: string,
    phaseId: string,
    itemId: string,
    value: number,
    maxQty: number
  ) => {
    const clamped = Math.max(0, Math.min(maxQty, Math.round(value)));
    projectProgress.setContribution(projectId, phaseId, itemId, clamped);
  };

  const markPhaseComplete = (projectId: string, phase: ProjectPhase) => {
    phase.requirements.forEach((req) => setProjectContribution(projectId, phase.id, req.itemId, req.qty, req.qty));
  };

  const resetPhaseProgress = (projectId: string, phase: ProjectPhase) => {
    phase.requirements.forEach((req) => setProjectContribution(projectId, phase.id, req.itemId, 0, req.qty));
  };

  const handleContributionInput = (
    event: Event & { currentTarget: HTMLInputElement },
    projectId: string,
    phaseId: string,
    itemId: string,
    maxQty: number
  ) => {
    const value = Number(event.currentTarget.value);
    setProjectContribution(projectId, phaseId, itemId, Number.isFinite(value) ? value : 0, maxQty);
  };

  $: workshopSummary = (() => {
    const totalLevels = currentBenchGroups.reduce(
      (total, group) => total + group.levels.length,
      0
    );
    const ownedLevels = currentBenchGroups.reduce(
      (total, group) => total + group.levels.filter((level) => level.owned).length,
      0
    );
    const highestOwned = currentBenchGroups.reduce((max, group) => {
      const ownedInGroup = group.levels
        .filter((level) => level.owned)
        .map((level) => level.level);
      return ownedInGroup.length > 0 ? Math.max(max, ...ownedInGroup) : max;
    }, 0);
    const tips = tipsForWorkshop(ownedLevels, totalLevels, highestOwned);
    return { totalLevels, ownedLevels, highestOwned, tips };
  })();

  $: projectSummary = (() => {
    const progressMap = $projectProgress;
    const totalPhases = projects.reduce((sum, project) => sum + project.phases.length, 0);
    const completedPhases = projects.reduce(
      (sum, project) => sum + project.phases.filter((phase) => phaseCompleted(progressMap, project.id, phase)).length,
      0
    );
    return { totalPhases, completedPhases };
  })();
</script>


<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">What I Have</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Keep quests, workbench upgrades, and schematics in sync so that the What To Do tab only marks
      items you still need.
    </p>
  </header>

  <div class="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
    <label class="inline-flex items-center gap-2">
      <input
        type="checkbox"
        bind:checked={hideCompleted}
        class="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-500"
      />
      Hide completed entries
    </label>
  </div>

  <section class="section-card space-y-6">
    <div class="content-grid">
      <QuestChecklist title="Quest completions" items={visibleQuestItems} on:toggle={toggleQuest} />
      <TipsPanel heading="Quest tracking tips" tips={[
        'Toggle objectives as soon as you hand in a quest to free up the required loot.',
        'Use this checklist alongside the Workshop section to know what still needs crafting.'
      ]} />
    </div>
  </section>

  <section class="section-card space-y-6">
    <header>
      <h2 class="text-2xl font-semibold text-white">Workbench upgrades</h2>
      <p class="text-sm text-slate-400">
        Mark each workbench and level as soon as it finishes upgrading. Completed levels remove their
        materials from keep or save recommendations.
      </p>
    </header>
    <SearchBar
      label="Find workbench or level"
      placeholder="Search benches, levels, or required items"
      value={workshopFilter}
      on:input={({ detail }) => (workshopFilter = detail.value)}
    />
    <div class="space-y-4">
      {#if filteredBenchGroups.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-400">
          No workbenches match “{workshopFilter}”. Try searching by bench name or component.
        </div>
      {:else}
        {#each filteredBenchGroups as bench}
          {#if bench.levels.filter((level) => !hideCompleted || !level.owned).length > 0}
          <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <header class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-xl font-semibold text-white">{bench.bench}</h3>
              <button
                type="button"
                class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  bench.owned
                    ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                on:click={() => toggleBench(bench)}
              >
                {bench.owned ? 'All levels owned' : 'Mark all owned'}
              </button>
            </header>
            <div class="mt-4 space-y-4">
              {#each bench.levels.filter((level) => !hideCompleted || !level.owned) as level}
                <div class="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm uppercase tracking-widest text-slate-400">Level {level.level}</p>
                    <button
                      type="button"
                      class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                        level.owned
                          ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                      on:click={() => toggleLevel(level)}
                    >
                      {level.owned ? 'Level owned' : 'Mark level owned'}
                    </button>
                  </div>
                  <div class="mt-3 space-y-3">
                    {#each level.entries as entry}
                      <div class="rounded-lg border border-slate-800/70 bg-slate-900/40 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p class="text-sm font-semibold text-white">{entry.upgrade.name}</p>
                            <p class="text-[11px] uppercase tracking-widest text-slate-500">
                              Level {entry.upgrade.level}
                            </p>
                          </div>
                          <button
                            type="button"
                            class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                              entry.state.owned
                                ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            }`}
                            on:click={() => toggleUpgrade(entry)}
                          >
                            {entry.state.owned ? 'Owned' : 'Mark owned'}
                          </button>
                        </div>
                        <ul class="mt-2 space-y-1 text-sm text-slate-300">
                          {#each entry.upgrade.items as requirement}
                            <li class="flex items-center justify-between">
                              <span>{itemName(requirement.itemId)}</span>
                              <span class="text-slate-400">{requirement.qty}x</span>
                            </li>
                          {/each}
                        </ul>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </article>
          {/if}
        {/each}
      {/if}
    </div>
    <div class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300">
      <p class="font-semibold text-white">Workbench progress</p>
      {#if workshopSummary.totalLevels === 0}
        <p class="mt-2 text-slate-400">No workbench upgrade data available. Paste new levels using the docs below.</p>
      {:else}
        <p class="mt-2">
          {workshopSummary.ownedLevels} of {workshopSummary.totalLevels} levels marked as owned.
        </p>
        <p class="text-slate-400">
          Highest owned level: {workshopSummary.highestOwned > 0 ? workshopSummary.highestOwned : 'None yet'}
        </p>
      {/if}
    </div>
    <TipsPanel heading="Workbench reminders" tips={workshopSummary.tips} />
  </section>

  <section class="section-card space-y-6">
    <header>
      <h2 class="text-2xl font-semibold text-white">Expedition projects</h2>
      <p class="text-sm text-slate-400">
        Track partial hand-ins for expedition phases. Items remain on the keep list until their phase
        reaches full contribution.
      </p>
    </header>
    {#if projects.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-400">
        No expedition project data available yet. Paste the latest feed via the import scripts to see
        contribution tracking.
      </div>
    {:else}
      <div class="space-y-4">
        {#each projects as project}
          {#if !hideCompleted || !projectCompleted($projectProgress, project)}
            <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <header class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-semibold text-white">{project.name}</h3>
                  {#if project.description}
                    <p class="text-sm text-slate-400">{project.description}</p>
                  {/if}
                </div>
                <span class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${projectCompleted($projectProgress, project) ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-200'}`}>
                  {projectCompleted($projectProgress, project) ? 'Project complete' : 'In progress'}
                </span>
              </header>
              <div class="mt-4 space-y-3">
                {#each project.phases as phase}
                  {#if !hideCompleted || !phaseCompleted($projectProgress, project.id, phase)}
                    <div class="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 space-y-3">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p class="text-sm uppercase tracking-widest text-slate-400">Phase {phase.order}</p>
                          <p class="text-base font-semibold text-white">{phase.name}</p>
                          {#if phase.description}
                            <p class="text-xs text-slate-500">{phase.description}</p>
                          {/if}
                        </div>
                        <div class="flex flex-wrap gap-2">
                          <button
                            type="button"
                            class="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-300 hover:border-slate-500"
                            on:click={() => resetPhaseProgress(project.id, phase)}
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/20"
                            on:click={() => markPhaseComplete(project.id, phase)}
                          >
                            Mark complete
                          </button>
                        </div>
                      </div>
                      <ul class="space-y-2 text-sm text-slate-300">
                        {#each phase.requirements as requirement}
                          {#if !hideCompleted || deliveredAmount($projectProgress, project.id, phase.id, requirement.itemId) < requirement.qty}
                            <li class="flex flex-wrap items-center gap-3">
                              <div class="flex-1">
                                <p class="font-semibold text-white">{itemName(requirement.itemId)}</p>
                                <p class="text-xs text-slate-500">
                                  {deliveredAmount($projectProgress, project.id, phase.id, requirement.itemId)} / {requirement.qty}
                                </p>
                              </div>
                              <input
                                class="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white focus:border-sky-500 focus:outline-none"
                                type="number"
                                min="0"
                                max={requirement.qty}
                                value={deliveredAmount($projectProgress, project.id, phase.id, requirement.itemId)}
                                on:input={(event) =>
                                  handleContributionInput(event, project.id, phase.id, requirement.itemId, requirement.qty)}
                              />
                            </li>
                          {/if}
                        {/each}
                      </ul>
                    </div>
                  {/if}
                {/each}
              </div>
            </article>
          {/if}
        {/each}
      </div>
      <div class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300">
        <p class="font-semibold text-white">Expedition progress</p>
        <p class="mt-2">
          {projectSummary.completedPhases} of {projectSummary.totalPhases} phases marked as complete.
        </p>
      </div>
    {/if}
  </section>

  <section class="section-card space-y-6">
    <header>
      <h2 class="text-2xl font-semibold text-white">Blueprint catalog</h2>
      <p class="text-sm text-slate-400">
        Ownership toggles mirror the workbench section above, but you can use this list to quickly
        flip individual schematics across every bench.
      </p>
    </header>
    <SearchBar
      label="Find blueprint"
      placeholder="Search by name, rarity, or slug"
      value={blueprintQuery}
      on:input={({ detail }) => (blueprintQuery = detail.value)}
    />
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#if filteredBlueprints.length === 0}
        <div class="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-400">
          No blueprints match “{blueprintQuery}”.
        </div>
      {:else}
        {#each filteredBlueprints as blueprint}
          <button
            type="button"
            class={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
              blueprint.owned
                ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-600'
            }`}
            on:click={() => setBlueprintOwnership(blueprint.entry, !blueprint.owned)}
          >
            <p class="text-base font-semibold">{blueprint.name}</p>
            <p class="text-xs uppercase tracking-widest text-slate-400">
              {(blueprint.rarity ?? 'Unknown rarity')} · {(blueprint.category ?? 'Blueprint')}
            </p>
            <p class="mt-1 text-xs text-slate-400">
              {blueprint.slug}
              {#if typeof blueprint.sell === 'number'}
                · Sell {blueprint.sell.toLocaleString()} coins
              {/if}
            </p>
            {#if blueprint.notes}
              <p class="mt-2 text-xs text-slate-400">{blueprint.notes}</p>
            {/if}
            <p class="mt-3 text-[11px] uppercase tracking-widest">
              {blueprint.owned ? 'Owned' : 'Not owned'}
            </p>
          </button>
        {/each}
      {/if}
    </div>
    <TipsPanel heading="Blueprint notes" tips={$blueprintSummary.tips} />
  </section>
</section>
