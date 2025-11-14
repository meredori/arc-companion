<svelte:head>
  <title>ARC Raiders Companion</title>
  <meta
    name="description"
    content="Planning workspace for the ARC Raiders Companion tool built with SvelteKit."
  />
</svelte:head>

<script lang="ts">
  import { base } from '$app/paths';

  export let data;
  export let form;
  export let params;
  const __rootPageProps = { data, form, params };
  void __rootPageProps;

  const withBase = (href: string) => (base ? `${base}${href}` : href);
</script>

<div class="page-stack">
  <header class="space-y-4">
    <h1 class="text-4xl font-semibold">ARC Raiders Companion</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      This workspace establishes the shared layout, theming tokens, and component scaffolding that power
      each feature vertical. As data pipelines and persistence arrive, these sections will evolve into the
      fully interactive companion experience.
    </p>
  </header>

  <div class="grid gap-5 md:grid-cols-2">
    <a class="section-card transition-transform duration-200 hover:-translate-y-1" href={withBase('/what-to-do')}>
      <h2 class="text-xl font-semibold">What To Do</h2>
      <p class="mt-2 text-sm text-slate-400">
        Item recommendations driven by synced data and personalized player goals.
      </p>
    </a>
    <a class="section-card transition-transform duration-200 hover:-translate-y-1" href={withBase('/what-i-have')}>
      <h2 class="text-xl font-semibold">What I Have</h2>
      <p class="mt-2 text-sm text-slate-400">
        Central dashboard to mark quest completions, bench upgrades, and owned schematics.
      </p>
    </a>
    <a class="section-card transition-transform duration-200 hover:-translate-y-1" href={withBase('/what-i-want')}>
      <h2 class="text-xl font-semibold">What I Want</h2>
      <p class="mt-2 text-sm text-slate-400">
        Build a wishlist of future crafts and inspect the materials needed to complete them.
      </p>
    </a>
    <a class="section-card transition-transform duration-200 hover:-translate-y-1" href={withBase('/blueprints')}>
      <h2 class="text-xl font-semibold">Blueprints</h2>
      <p class="mt-2 text-sm text-slate-400">
        Manage owned schematics to unlock crafting suggestions and salvage guidance.
      </p>
    </a>
    <a class="section-card transition-transform duration-200 hover:-translate-y-1" href={withBase('/run')}>
      <h2 class="text-xl font-semibold">Run Analyzer</h2>
      <p class="mt-2 text-sm text-slate-400">
        Live run logging with contextual tips and telemetry overlays.
      </p>
    </a>
  </div>
</div>
