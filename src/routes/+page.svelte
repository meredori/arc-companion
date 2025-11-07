<svelte:head>
  <title>ARC Raiders Companion</title>
  <meta
    name="description"
    content="Planning workspace for the ARC Raiders Companion tool built with SvelteKit."
  />
</svelte:head>

<div class="space-y-6">
  <h1 class="text-3xl font-bold tracking-tight text-white">ARC Raiders Companion</h1>
  <p class="max-w-2xl text-slate-300">
    This SvelteKit workspace establishes the baseline project structure, tooling, and routes described
    in the design document. Each section of the application will evolve from these placeholders as the
    data pipeline, recommendation engine, and offline-ready experiences are implemented.
  </p>
  <div class="grid gap-4 md:grid-cols-2">
    <a class="rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500" href="/what-to-do">
      <h2 class="text-xl font-semibold text-white">What To Do</h2>
      <p class="text-sm text-slate-400">Item recommendations driven by synced data and player goals.</p>
    </a>
    <a class="rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500" href="/track">
      <h2 class="text-xl font-semibold text-white">Track</h2>
      <p class="text-sm text-slate-400">Quest, upgrade, and goal tracking that informs item priorities.</p>
    </a>
    <a class="rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500" href="/blueprints">
      <h2 class="text-xl font-semibold text-white">Blueprints</h2>
      <p class="text-sm text-slate-400">Manage owned schematics to unlock crafting suggestions.</p>
    </a>
    <a class="rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500" href="/run">
      <h2 class="text-xl font-semibold text-white">Run Analyzer</h2>
      <p class="text-sm text-slate-400">Live run logging with contextual tips for active sessions.</p>
    </a>
  </div>
</div>
