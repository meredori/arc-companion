<script lang="ts" context="module">
  export type QuestCard = {
    id: string;
    name: string;
    completed: boolean;
    requirements: string[];
    objectives?: string[];
    rewards?: string[];
    stepLabel?: string | null;
  };

  export type QuestChainCard = {
    id: string;
    name: string;
    quests: QuestCard[];
    totalQuests?: number;
    completedQuests?: number;
    trader?: string | null;
  };
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { QuestChainCard as QuestChainCardType } from './QuestChainCards.svelte';

  export let chains: QuestChainCardType[] = [];

  const dispatch = createEventDispatcher<{ toggle: { id: string } }>();

  const toggleQuest = (id: string) => dispatch('toggle', { id });

  let collapsedCompleted: Record<string, boolean> = {};

  $: {
    const defaults: Record<string, boolean> = {};
    for (const chain of chains) {
      defaults[chain.id] = collapsedCompleted[chain.id] ?? false;
    }
    collapsedCompleted = defaults;
  }
</script>

<div class="space-y-4">
  {#if chains.length === 0}
    <div class="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-400">
      No quests are ready to track yet. Finish earlier steps in each chain to unlock them here.
    </div>
  {:else}
    {#each chains as chain (chain.id)}
      {@const completedCount = chain.quests.filter((quest) => quest.completed).length}
      {@const totalQuests = chain.totalQuests ?? chain.quests.length}
      {@const completedTotal = chain.completedQuests ?? completedCount}
      {@const visibleQuests = chain.quests.filter(
        (quest) => !(collapsedCompleted[chain.id] && quest.completed)
      )}
      <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Quest chain</p>
            <h3 class="text-xl font-semibold text-white">{chain.name}</h3>
            {#if chain.trader}
              <p class="text-sm text-slate-400">Trader: {chain.trader}</p>
            {/if}
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-400/80"></span>
              {completedTotal}/{totalQuests} done
            </span>
            <button
              type="button"
              class={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                collapsedCompleted[chain.id]
                  ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
              }`}
              on:click={() =>
                (collapsedCompleted = {
                  ...collapsedCompleted,
                  [chain.id]: !collapsedCompleted[chain.id]
                })}
              aria-pressed={collapsedCompleted[chain.id]}
              aria-label={
                collapsedCompleted[chain.id]
                  ? `Show completed quests in ${chain.name}`
                  : `Hide completed quests in ${chain.name}`
              }
            >
              {collapsedCompleted[chain.id] ? 'Show completed' : 'Collapse completed'}
            </button>
          </div>
        </header>

        {#if visibleQuests.length === 0}
          <p class="mt-3 text-sm text-slate-400">No quests to show in this chain.</p>
        {:else}
          <div class="mt-4 space-y-3">
            <div class="flex gap-3 overflow-x-auto pb-2">
              {#each visibleQuests as quest (quest.id)}
                {@const tooltipId = `${chain.id}-${quest.id}-tooltip`}
                {@const hasTooltip = quest.requirements.length > 0 || (quest.objectives && quest.objectives.length > 0)}
                <div class="group relative flex min-h-[140px] min-w-[240px] flex-shrink-0">
                  <button
                    type="button"
                    class={`flex w-full flex-col justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                      quest.completed
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white hover:border-emerald-500'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                    }`}
                    on:click={() => toggleQuest(quest.id)}
                    aria-pressed={quest.completed}
                    aria-label={`Toggle ${quest.name}`}
                    aria-describedby={hasTooltip ? tooltipId : undefined}
                  >
                    <div class="flex items-start gap-3">
                      <span
                        class={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[0.65rem] font-bold uppercase transition ${
                          quest.completed
                            ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                            : 'border-slate-700 bg-slate-950/60 text-slate-500'
                        }`}
                      >
                        {quest.completed ? '✓' : ''}
                      </span>
                      <div class="min-w-0 space-y-1">
                        <p class="truncate text-sm font-semibold">{quest.name}</p>
                        {#if quest.stepLabel}
                          <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">{quest.stepLabel}</p>
                        {/if}
                      </div>
                    </div>
                    <div class="min-h-[28px] space-y-1">
                      {#if quest.rewards && quest.rewards.length > 0}
                        <div class="flex flex-wrap gap-2 text-xs text-amber-200">
                          <span class="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
                            Rewards
                          </span>
                          {#each quest.rewards as reward}
                            <span class="rounded-full bg-slate-800/70 px-2 py-1 text-[11px] text-amber-100">{reward}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </button>
                  {#if hasTooltip}
                    <div
                      id={tooltipId}
                      role="tooltip"
                      class="pointer-events-none absolute left-0 top-full z-10 hidden w-72 translate-y-2 rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-lg group-focus-within:block group-hover:block"
                    >
                      {#if quest.requirements.length > 0}
                        <div class="space-y-1">
                          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Requirements</p>
                          <ul class="list-disc space-y-1 pl-4 text-slate-200">
                            {#each quest.requirements as requirement}
                              <li>{requirement}</li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                      {#if quest.objectives && quest.objectives.length > 0}
                        <div class={`space-y-1 ${quest.requirements.length > 0 ? 'mt-3 border-t border-slate-800 pt-3' : ''}`}>
                          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Objectives</p>
                          <ul class="list-disc space-y-1 pl-4 text-slate-200">
                            {#each quest.objectives as objective}
                              <li>{objective}</li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </article>
    {/each}
  {/if}
</div>
