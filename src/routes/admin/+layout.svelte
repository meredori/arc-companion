<svelte:head>
  <title>Admin | ARC Companion</title>
</svelte:head>

<section class="space-y-4">
  <h1 class="text-2xl font-semibold text-white">Admin Workspace</h1>
  <p class="text-slate-300">
    Admin tooling for data import passes will live under this protected layout. Guard logic and access
    controls will be implemented alongside the import scripts.
  </p>
  <slot />
</section>
