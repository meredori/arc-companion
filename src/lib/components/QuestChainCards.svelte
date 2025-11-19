<script lang="ts" context="module">
  export type QuestCard = {
    id: string;
    name: string;
    completed: boolean;
    requirements: string[];
    objectives?: string[];
    rewards?: string[];
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

  type KeyboardEvent = {
    key: string;
    preventDefault: () => void;
  };

  export let chains: QuestChainCardType[] = [];
  export let collapseCompleted = false;

  const dispatch = createEventDispatcher<{ toggle: { id: string } }>();

  const toggleQuest = (id: string) => dispatch('toggle', { id });

  let detailView: { chain: QuestChainCardType; quest: QuestCard } | null = null;

  const showDetails = (chain: QuestChainCardType, quest: QuestCard) => {
    detailView = { chain, quest };
  };

  const closeDetails = () => {
    detailView = null;
  };

  const handleOverlayKeydown = (event: KeyboardEvent) => {
    if (!detailView) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDetails();
    }
  };
</script>

<svelte:window on:keydown={handleOverlayKeydown} />

<div class="space-y-4">
  {#if chains.length === 0}
    <div class="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-400">
      No quests are ready to track yet. Finish earlier steps in each chain to unlock them here.
    </div>
  {:else}
    {#each chains as chain (chain.id)}
      {@const chainLabel = chain.trader ?? chain.name}
      {@const completedCount = chain.quests.filter((quest) => quest.completed).length}
      {@const totalQuests = chain.totalQuests ?? chain.quests.length}
      {@const completedTotal = chain.completedQuests ?? completedCount}
      {@const questOrder = new Map(chain.quests.map((quest, index) => [quest.id, index]))}
      {@const visibleQuests = chain.quests.filter((quest) => !(collapseCompleted && quest.completed))}
      {@const orderedQuests =
        collapseCompleted
          ? visibleQuests
          : [...visibleQuests].sort((a, b) => {
              if (a.completed === b.completed) {
                return (questOrder.get(a.id) ?? 0) - (questOrder.get(b.id) ?? 0);
              }
              return a.completed ? 1 : -1;
            })}
      <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <h3 class="text-xl font-semibold text-white">{chainLabel}</h3>
          </div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200"
          >
            <span class="h-2 w-2 rounded-full bg-emerald-400/80"></span>
            {completedTotal}/{totalQuests} done
          </span>
        </header>

        {#if visibleQuests.length === 0}
          <p class="mt-3 text-sm text-slate-400">No quests to show in this chain.</p>
        {:else}
          <div class="mt-4 space-y-3">
            <div class="flex gap-3 overflow-x-auto pb-2">
              {#each orderedQuests as quest (quest.id)}
                {@const tooltipId = `${chain.id}-${quest.id}-tooltip`}
                {@const hasTooltip = quest.requirements.length > 0 || (quest.objectives && quest.objectives.length > 0)}
                <div
                  class={`group relative flex min-h-[140px] min-w-[240px] flex-shrink-0 rounded-2xl border px-4 py-3 shadow-sm transition ${
                    quest.completed
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-white hover:border-emerald-500'
                      : 'border-slate-800/80 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div class="flex w-full flex-col gap-3">
                    <button
                      type="button"
                      class="flex flex-1 flex-col justify-between gap-3 text-left"
                      on:click={() => toggleQuest(quest.id)}
                      aria-pressed={quest.completed}
                      aria-label={`Toggle ${quest.name}`}
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
                      <div class="flex justify-end">
                        <button
                          type="button"
                          class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500"
                          on:click={() => showDetails(chain, quest)}
                          aria-haspopup="dialog"
                          aria-controls={tooltipId}
                        >
                          Details
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </article>
    {/each}
  {/if}

  {#if detailView}
    {@const detailsId = `${detailView.chain.id}-${detailView.quest.id}-tooltip`}
    <div class="fixed inset-0 z-50 flex items-start justify-center px-4 py-12" role="presentation" aria-hidden="true">
      <button
        type="button"
        class="absolute inset-0 z-0 h-full w-full bg-black/50 backdrop-blur"
        aria-label="Close quest details"
        on:click={closeDetails}
        on:keydown={handleOverlayKeydown}
      />
      <div
        class="relative z-10 max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-slate-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${detailsId}-title`}
        tabindex="-1"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-[11px] uppercase tracking-[0.3em] text-slate-400">{detailView.chain.trader ?? 'Quest'}</p>
            <h4 id={`${detailsId}-title`} class="text-xl font-semibold text-white">{detailView.quest.name}</h4>
          </div>
          <button
            type="button"
            class="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500"
            on:click={closeDetails}
          >
            Close
          </button>
        </div>

        {#if detailView.quest.rewards && detailView.quest.rewards.length > 0}
          <div class="mt-4 flex flex-wrap gap-2 text-xs text-amber-200">
            <span class="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
              Rewards
            </span>
            {#each detailView.quest.rewards as reward}
              <span class="rounded-full bg-slate-800/70 px-2 py-1 text-[11px] text-amber-100">{reward}</span>
            {/each}
          </div>
        {/if}

        {#if detailView.quest.requirements.length > 0}
          <div class="mt-4 space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Required items</p>
            <ul class="space-y-1 text-sm text-slate-200">
              {#each detailView.quest.requirements as requirement}
                <li class="rounded-lg border border-slate-800/70 bg-slate-900/70 px-3 py-2">{requirement}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if detailView.quest.objectives && detailView.quest.objectives.length > 0}
          <div class="mt-4 space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Objectives</p>
            <ul class="space-y-1 text-sm text-slate-200">
              {#each detailView.quest.objectives as objective}
                <li class="rounded-lg border border-slate-800/70 bg-slate-900/70 px-3 py-2">{objective}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
