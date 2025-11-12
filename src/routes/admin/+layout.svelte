<svelte:head>
  <title>Admin | ARC Companion</title>
</svelte:head>

<section class="page-stack">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold">Admin Workspace</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      Data import approvals, override tooling, and audit history live here. Access control and guarded
      routes will be wired up alongside the pipeline scripts.
    </p>
  </header>
  <div class="section-card space-y-6">
    <slot />
  </div>
</section>
