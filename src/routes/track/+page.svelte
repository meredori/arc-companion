<svelte:head>
  <title>Track | ARC Companion</title>
</svelte:head>

<script lang="ts">
  import { QuestChecklist, TipsPanel, type ChecklistItem } from '$lib/components';

  const questItems: ChecklistItem[] = [
    { id: 'quest-1', label: 'Complete “Signal Recovery” quest chain', completed: true },
    { id: 'quest-2', label: 'Unlock Tier 2 Workshop Bench', completed: false },
    { id: 'quest-3', label: 'Collect 3 Advanced ARC Powercells', completed: false }
  ];

  const trackingTips = [
    'Quest and blueprint completion will update the recommendation engine priorities.',
    'Offline persistence keeps progress in sync between sessions without a login.',
    'Upcoming milestone widgets will surface the next best objective automatically.'
  ];
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
      <QuestChecklist title="Immediate objectives" items={questItems} />
      <TipsPanel heading="Tracking insights" tips={trackingTips} />
    </div>
  </section>
</section>
