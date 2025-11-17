<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { tick } from 'svelte';

  export type InnerTab = { id: string; label: string };

  export let tabs: InnerTab[] = [];
  export let selected: string | null = null;
  export let useHash = true;

  const dispatch = createEventDispatcher<{ change: { id: string } }>();
  let activeId: string | null = null;
  let tabButtons: HTMLButtonElement[] = [];

  $: if (!activeId && tabs.length > 0) {
    activeId = selected ?? tabs[0].id;
  }

  const validId = (id: string | null) => (id ? tabs.some((tab) => tab.id === id) : false);

  const updateHash = (id: string) => {
    if (!useHash || typeof window === 'undefined') return;
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, '', nextHash);
    }
  };

  const activate = async (id: string, options: { notify?: boolean; updateHash?: boolean } = {}) => {
    if (!validId(id)) return;
    activeId = id;
    selected = id;
    if (options.updateHash !== false) {
      updateHash(id);
    }
    if (options.notify !== false) {
      dispatch('change', { id });
      await tick();
    }
  };

  const setInitialFromHash = () => {
    if (typeof window === 'undefined' || !useHash) return null;
    const hashId = window.location.hash?.replace('#', '') ?? null;
    return hashId && validId(hashId) ? hashId : null;
  };

  onMount(() => {
    const initial = setInitialFromHash() ?? selected ?? tabs[0]?.id ?? null;
    if (initial) {
      activate(initial, { notify: false });
    }

    const handleHashChange = () => {
      if (!useHash) return;
      const nextId = setInitialFromHash();
      if (nextId && nextId !== activeId) {
        activate(nextId, { notify: false, updateHash: false });
      }
    };

    window.addEventListener('hashchange', handleHashChange, { passive: true });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  });

  $: if (selected && selected !== activeId && validId(selected)) {
    activate(selected, { notify: false });
  }

  const focusTab = (index: number) => tabButtons[index]?.focus();

  const moveFocus = (currentIndex: number, direction: 1 | -1) => {
    if (tabs.length === 0) return;
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    activate(tabs[nextIndex].id);
    focusTab(nextIndex);
  };

  const handleKeydown = (event: KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        activate(tabs[0]?.id);
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        activate(tabs[tabs.length - 1]?.id);
        focusTab(tabs.length - 1);
        break;
    }
  };
</script>

<div class="space-y-4">
  <div class="-mx-2 overflow-x-auto pb-1">
    <div class="mx-2 flex gap-2" role="tablist" aria-orientation="horizontal">
      {#each tabs as tab, index}
        {@const isActive = tab.id === activeId}
        <button
          id={`${tab.id}-tab`}
          bind:this={tabButtons[index]}
          type="button"
          role="tab"
          class={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-widest transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
            isActive
              ? 'border-sky-400/70 bg-sky-500/20 text-sky-100 shadow-sm'
              : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500'
          }`}
          aria-selected={isActive}
          aria-controls={tab.id}
          tabindex={isActive ? 0 : -1}
          on:click={() => activate(tab.id)}
          on:keydown={(event) => handleKeydown(event, index)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="space-y-6">
    <slot name="panels" activeId={activeId}></slot>
  </div>
</div>
