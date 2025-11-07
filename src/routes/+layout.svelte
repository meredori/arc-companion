<script lang="ts">
  import '../app.postcss';
</script>

<main class="min-h-screen bg-slate-950 text-slate-100">
  <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <a class="text-lg font-semibold tracking-tight" href="/">ARC Companion</a>
      <nav class="flex gap-4 text-sm uppercase text-slate-300">
        <a class="hover:text-sky-400" href="/what-to-do">What To Do</a>
        <a class="hover:text-sky-400" href="/track">Track</a>
        <a class="hover:text-sky-400" href="/blueprints">Blueprints</a>
        <a class="hover:text-sky-400" href="/run">Run</a>
        <a class="hover:text-sky-400" href="/runs">Runs</a>
      </nav>
    </div>
  </header>
  <section class="mx-auto max-w-6xl px-6 py-8">
    <slot />
  </section>
</main>
