<svelte:head>
  <title>Admin | ARC Companion</title>
</svelte:head>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Admin Workspace</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Review raw dataset quality, curate manual overrides, and experiment with upcoming tooling in a
      sandbox that stays separate from the player-facing routes.
    </p>
  </header>
  <div class="section-card space-y-6">
    <slot />
  </div>
</section>
