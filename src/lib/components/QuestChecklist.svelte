<script lang="ts" context="module">
  export type { ChecklistItem } from './types';
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChecklistItem } from './types';

  export let title = 'Quest Checklist';
  export let items: ChecklistItem[] = [];

  const dispatch = createEventDispatcher<{ toggle: { id: string } }>();

  const toggle = (id: string) => dispatch('toggle', { id });
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
        <button
          type="button"
          class={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[0.6rem] font-bold uppercase transition ${
            item.completed
              ? 'border-emerald-400 text-emerald-300 hover:border-emerald-300'
              : 'border-slate-700 text-slate-500 hover:border-slate-400'
          }`}
          on:click={() => toggle(item.id)}
          aria-pressed={item.completed}
          aria-label={`Toggle ${item.label}`}
        >
          {item.completed ? '✓' : ''}
        </button>
        <span class={`flex-1 ${item.completed ? 'line-through text-slate-500' : ''}`}>{item.label}</span>
      </li>
    {/each}
  </ul>
</section>
