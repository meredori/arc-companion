<svelte:head>
  <title>Track | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { QuestChecklist, TipsPanel } from '$lib/components';
  import { blueprints, hydrateFromCanonical, quests } from '$lib/stores/app';
  import { tipsForBlueprints } from '$lib/tips';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form: unknown;
  export let params: Record<string, string>;
  const __trackPageProps = { form, params };
  void __trackPageProps;

  const { quests: questDefs, upgrades } = data;

  onMount(() => {
    hydrateFromCanonical(
      questDefs.map((quest) => ({ id: quest.id, completed: false })),
      upgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        bench: upgrade.bench,
        level: upgrade.level,
        owned: false
      }))
    );
  });

  const checklistItems = derived(quests, ($quests) =>
    questDefs.map((quest) => {
      const progress = $quests.find((entry) => entry.id === quest.id);
      return {
        id: quest.id,
        label: `${quest.name} — ${quest.items
          .map((item) => `${item.qty}x ${item.itemId}`)
          .join(', ')}`,
        completed: progress?.completed ?? false
      };
    })
  );

  const blueprintSummary = derived(blueprints, ($blueprints) => {
    const owned = $blueprints.filter((bp) => bp.owned).length;
    return {
      owned,
      total: upgrades.length,
      tips: tipsForBlueprints(owned, upgrades.length)
    };
  });

  const toggleQuest = (event: CustomEvent<{ id: string }>) => {
    quests.toggle(event.detail.id);
  };
</script>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Quest &amp; Upgrade Tracker</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Monitor questlines, workshop milestones, and personal goals. Completion data will power the
      recommendation flows across the app.
    </p>
  </header>

  <section class="section-card">
    <div class="content-grid">
      <QuestChecklist title="Immediate objectives" items={$checklistItems} on:toggle={toggleQuest} />
      <TipsPanel heading="Tracking insights" tips={$blueprintSummary.tips} />
    </div>
    <div class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300">
      <p class="font-semibold text-white">Blueprint progress</p>
      <p class="mt-2">
        {$blueprintSummary.owned} of {$blueprintSummary.total} schematics owned.
        Toggle ownership to influence upgrade recommendations and salvage priorities.
      </p>
    </div>
  </section>
</section>
