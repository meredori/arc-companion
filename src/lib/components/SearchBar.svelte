<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { HTMLInputElement } from 'svelte/elements';

  export interface SearchBarInputDetail {
    value: string;
  }

  const dispatch = createEventDispatcher<{ input: SearchBarInputDetail }>();

  export let value = '';
  export let placeholder = 'Search items';
  export let label = 'Search';

  type SearchInputEvent = {
    currentTarget: HTMLInputElement;
  };

  function handleInput(event: SearchInputEvent) {
    dispatch('input', { value: event.currentTarget.value });
  }
</script>

<label class="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-300">
  <span>{label}</span>
  <div class="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm shadow-inner shadow-slate-950 focus-within:border-sky-500 focus-within:text-white">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      class="h-4 w-4 flex-none text-slate-500"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M11 4a7 7 0 1 1 3.758 12.87l3.686 3.686a1 1 0 0 1-1.415 1.414l-3.685-3.685A7 7 0 0 1 11 4Zm-5 7a5 5 0 1 0 10 0a5 5 0 0 0-10 0Z"
        clip-rule="evenodd"
      />
    </svg>
    <input
      class="flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
      type="search"
      {placeholder}
      value={value}
      on:input={handleInput}
    />
  </div>
</label>
