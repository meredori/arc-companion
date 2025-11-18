<svelte:head>
  <title>What I Have | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  import { derived } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { InnerTabs, QuestChainCards, SearchBar, TipsPanel, type QuestChainCard } from '$lib/components';
  import { hydrateFromCanonical, projectProgress, quests, workbenchUpgrades } from '$lib/stores/app';
  import { tipsForWorkshop } from '$lib/tips';
  import { createQuestOrderComparator } from '$lib/utils/quest-order';
  import type {
    ItemRecord,
    Project,
    ProjectPhase,
    ProjectProgressState,
    QuestChain,
    QuestReward,
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

  let showReturnToTop = false;

  const updateReturnToTopVisibility = () => {
    if (typeof window === 'undefined') return;
    showReturnToTop = window.scrollY > 320;
  };

  onMount(() => {
    hydrateFromCanonical({
      quests: questDefs.map((quest) => ({ id: quest.id, completed: false })),
      workbenchUpgrades: benchUpgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      }))
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', updateReturnToTopVisibility, { passive: true });
      updateReturnToTopVisibility();
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', updateReturnToTopVisibility);
    }
  });

  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? id;
  const questById = new Map(questDefs.map((quest) => [quest.id, quest]));
  const chainById = new Map(chains.map((chain) => [chain.id, chain]));
  const chainOrder = new Map<string, number>();
  chains.forEach((chain, index) => {
    chainOrder.set(chain.id, index);
  });
  const questChainLookup = new Map<string, { chainId: string; chainName: string; index: number | null }>();
  questDefs.forEach((quest) => {
    if (!quest.chainId) return;
    const chain = chainById.get(quest.chainId);
    const chainName = chain?.name ?? quest.chainId;
    const stage = quest.chainStage ?? (chain?.stages?.indexOf(quest.id) ?? -1);
    const index = stage >= 0 ? stage : null;
    questChainLookup.set(quest.id, {
      chainId: quest.chainId,
      chainName,
      index
    });
  });

  let showCompleted = false;

  type SectionKey = 'quests' | 'workbench-upgrades' | 'expedition-projects';

  const sectionControls: { id: SectionKey; label: string }[] = [
    { id: 'quests', label: 'Quest checklist' },
    { id: 'workbench-upgrades', label: 'Workbench upgrades' },
    { id: 'expedition-projects', label: 'Expedition projects' }
  ];

  type QuestChainDisplay = QuestChainCard;

  let activeTab: SectionKey = sectionControls[0].id;
  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  let workshopFilter = '';

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
    (group) => matchesWorkshopFilter(group, workshopFilter) && (showCompleted || !group.owned)
  );

  $: questCompletionSet = new Set($quests.filter((entry) => entry.completed).map((entry) => entry.id));

  const isQuestUnlocked = (questId: string) => {
    const info = questChainLookup.get(questId);
    if (!info) return true;
    const chain = chainById.get(info.chainId);
    const stages = chain?.stages ?? [];
    return stages.slice(0, info.index).every((id) => questCompletionSet.has(id));
  };

  const compareQuestOrder = createQuestOrderComparator(chainOrder, questChainLookup, questById);

  const rewardLabel = (reward: QuestReward) => {
    if (!reward) return null;
    if (reward.coins) return `${reward.coins} coins`;
    const name = reward.name ?? (reward.itemId ? itemName(reward.itemId) : null);
    if (!name) return null;
    const qty = reward.qty ?? (reward.itemId ? 1 : null);
    return qty ? `${qty}x ${name}` : name;
  };

  const questRewards = (questId: string) => {
    const quest = questById.get(questId);
    if (!quest) return [] as string[];
    return (quest.rewards ?? [])
      .map((reward) => rewardLabel(reward))
      .filter((label): label is string => Boolean(label));
  };

  $: questSummary = (() => {
    const total = questDefs.length;
    const completed = questDefs.filter((quest) => questCompletionSet.has(quest.id)).length;
    return { total, completed };
  })();

  $: questChainsForDisplay = (() => {
    const groups = new Map<string, QuestChainDisplay>();
    const vendorWeights = new Map<string, number>();

    const vendorLabel = (quest: typeof questDefs[number]) => quest.giver ?? 'Unknown vendor';
    const vendorTotals = new Map<string, { totalQuests: number; completedQuests: number }>();

    questDefs.forEach((quest) => {
      const vendor = vendorLabel(quest);
      const totals = vendorTotals.get(vendor) ?? { totalQuests: 0, completedQuests: 0 };
      totals.totalQuests += 1;
      if (questCompletionSet.has(quest.id)) totals.completedQuests += 1;
      vendorTotals.set(vendor, totals);
    });

    const orderedQuests = [...questDefs].sort((a, b) => compareQuestOrder(a.id, b.id));
    const availableQuests: (typeof questDefs[number])[] = [];

    orderedQuests.forEach((quest, index) => {
      const completed = questCompletionSet.has(quest.id);
      const unlocked = isQuestUnlocked(quest.id) || completed;
      if (!unlocked) return;
      if (!showCompleted && completed) return;

      const vendor = vendorLabel(quest);

      if (!vendorWeights.has(vendor)) {
        vendorWeights.set(vendor, index);
      }

      availableQuests.push(quest);
    });

    availableQuests.forEach((quest) => {
      const vendor = vendorLabel(quest);
      const group = groups.get(vendor) ?? {
        id: vendor,
        name: vendor,
        quests: [],
        trader: vendor
      };

      if (!groups.has(vendor)) {
        const totals = vendorTotals.get(vendor);
        group.totalQuests = totals?.totalQuests;
        group.completedQuests = totals?.completedQuests;
        groups.set(vendor, group);
      }

      const completed = questCompletionSet.has(quest.id);
      const requirements = quest.items.map((requirement) => `${requirement.qty}x ${itemName(requirement.itemId)}`);
      const objectives = quest.mapHints ?? [];
      const rewards = questRewards(quest.id);

      group.quests.push({
        id: quest.id,
        name: quest.name,
        completed,
        requirements,
        objectives,
        rewards
      });
    });

    return [...groups.entries()]
      .filter(([, group]) => group.quests.length > 0)
      .sort(([aId], [bId]) => (vendorWeights.get(aId) ?? 0) - (vendorWeights.get(bId) ?? 0))
      .map(([, group]) => group);
  })();

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

  <div class="mb-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
    <label class="inline-flex items-center gap-2">
      <input
        type="checkbox"
        bind:checked={showCompleted}
        class="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-500"
      />
      Show completed entries
    </label>
  </div>

  <InnerTabs tabs={sectionControls} bind:selected={activeTab} persistKey="what-i-have-tabs">
    <svelte:fragment slot="panels" let:activeId>
      <div
        id="quests"
        role="tabpanel"
        aria-labelledby="quests-tab"
        aria-hidden={activeId !== 'quests'}
        hidden={activeId !== 'quests'}
        class="section-card space-y-6"
      >
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <h2 class="text-2xl font-semibold text-white">Quest checklist</h2>
            <p class="text-sm text-slate-400">
              Toggle quests as you finish them to keep tabs on outstanding objectives and required loot.
            </p>
          </div>
        </header>
        <div id="quests-content" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
            <div class="flex flex-wrap items-center gap-3 text-sm text-slate-200">
              <span
                class="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
              >
                <span class="h-2 w-2 rounded-full bg-emerald-400/80"></span>
                {questSummary.completed}/{questSummary.total} completed
              </span>
              <span class="text-[11px] uppercase tracking-[0.3em] text-slate-400">Quest progress overview</span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <p class="text-left text-slate-400">
                Summary counts every quest in the database. Completed entries are hidden by default below but still counted
                here.
              </p>
            </div>
          </div>
          <div class="space-y-4">
            <QuestChainCards chains={questChainsForDisplay} collapseCompleted={!showCompleted} on:toggle={toggleQuest} />
          </div>
        </div>
      </div>

      <div
        id="workbench-upgrades"
        role="tabpanel"
        aria-labelledby="workbench-upgrades-tab"
        aria-hidden={activeId !== 'workbench-upgrades'}
        hidden={activeId !== 'workbench-upgrades'}
        class="section-card space-y-6"
      >
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-2">
            <h2 class="text-2xl font-semibold text-white">Workbench upgrades</h2>
            <p class="text-sm text-slate-400">
              Mark each workbench and level as soon as it finishes upgrading. Completed levels remove their
              materials from keep or save recommendations.
            </p>
          </div>
        </header>
        <div id="workbench-upgrades-content" class="space-y-6">
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
                  {#if bench.levels.filter((level) => showCompleted || !level.owned).length > 0}
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
                        {#each bench.levels.filter((level) => showCompleted || !level.owned) as level}
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
                                  <div>
                                    <p class="text-sm font-semibold text-white">{entry.upgrade.name}</p>
                                    <p class="text-[11px] uppercase tracking-widest text-slate-500">
                                      Level {entry.upgrade.level}
                                    </p>
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
          </div>
      </div>

      <div
        id="expedition-projects"
        role="tabpanel"
        aria-labelledby="expedition-projects-tab"
        aria-hidden={activeId !== 'expedition-projects'}
        hidden={activeId !== 'expedition-projects'}
        class="section-card space-y-6"
      >
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-2">
            <h2 class="text-2xl font-semibold text-white">Expedition projects</h2>
            <p class="text-sm text-slate-400">
              Track partial hand-ins for expedition phases. Items remain on the keep list until their phase
              reaches full contribution.
            </p>
          </div>
        </header>
        <div id="expedition-projects-content" class="space-y-6">
            {#if projects.length === 0}
              <div class="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-400">
                No expedition project data available yet. Paste the latest feed via the import scripts to see
                contribution tracking.
              </div>
            {:else}
              <div class="space-y-4">
                {#each projects as project}
                  {#if showCompleted || !projectCompleted($projectProgress, project)}
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
                          {#if showCompleted || !phaseCompleted($projectProgress, project.id, phase)}
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
                                  {#if showCompleted || deliveredAmount($projectProgress, project.id, phase.id, requirement.itemId) < requirement.qty}
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
            </div>
      </div>

    </svelte:fragment>
  </InnerTabs>

</section>
{#if showReturnToTop}
  <button
    type="button"
    class="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 shadow-lg backdrop-blur transition hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    on:click={scrollToTop}
    aria-label="Return to page top"
  >
    ↑ Top
  </button>
{/if}
