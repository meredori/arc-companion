<script lang="ts">
  export interface ChecklistItem {
    id: string;
    label: string;
    completed?: boolean;
  }

  export let title = 'Quest Checklist';
  export let items: ChecklistItem[] = [];
</script>

<section class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-card">
  <header class="mb-4 flex items-center justify-between gap-2">
    <h3 class="text-lg font-semibold text-white">{title}</h3>
    <span class="text-xs uppercase tracking-widest text-slate-500">
      {items.filter((item) => item.completed).length}/{items.length} complete
    </span>
  </header>
  <ul class="space-y-3">
    {#each items as item}
      <li class="flex items-start gap-3 text-sm text-slate-200">
        <span
          class={`mt-1 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[0.6rem] font-bold uppercase ${
            item.completed ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-500'
          }`}
          aria-hidden="true"
        >
          {item.completed ? '✓' : ''}
        </span>
        <span class={item.completed ? 'line-through text-slate-500' : ''}>{item.label}</span>
      </li>
    {/each}
  </ul>
</section>
