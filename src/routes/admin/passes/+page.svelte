<svelte:head>
  <title>Import Passes | ARC Companion</title>
</svelte:head>

<script lang="ts">
  /* eslint-env browser */
  import { itemOverrides, settings } from '$lib/stores/app';
  import type { ItemOverride, ItemRecord } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;
  export let form:
    | { success?: boolean; output?: string; entry?: unknown; message?: string }
    | null = null;
  export let params: Record<string, string>;
  const __adminPassProps = params;
  void __adminPassProps;

  const passEntries = Object.entries(data.meta.passes);
  const stageInspectorEntries = Object.entries(data.stageRecords ?? {});
  const stageLabelMap: Record<string, string> = {
    'pass-a': 'Pass A — Wiki Loot Seed',
    'pass-b': 'Pass B — Wiki Enrichment',
    'pass-c': 'Pass C — MetaForge Merge',
    'pass-d': 'Pass D — Quests & Chains'
  };

  type StageRecord = {
    name?: string;
    data?: { name?: string };
    id?: string;
  };

  function labelRecord(record: StageRecord, index: number) {
    return record?.name ?? record?.data?.name ?? record?.id ?? `Record ${index + 1}`;
  }

  function batchCount(records: { count: number }[]) {
    return records.reduce((total, batch) => total + batch.count, 0);
  }

  const availableCategories = data.categories ?? [];
  const availableItems = (data.items ?? []) as ItemRecord[];
  let alwaysKeepCategories: string[] = [];
  let itemQuery = '';
  let selectedItemId: string | null = null;
  let itemMessage = '';

  type OverrideForm = {
    category: string;
    rarity: string;
    imageUrl: string;
    notes: string;
  };

  const createOverrideForm = (values?: Partial<OverrideForm>): OverrideForm => ({
    category: values?.category ?? '',
    rarity: values?.rarity ?? '',
    imageUrl: values?.imageUrl ?? '',
    notes: values?.notes ?? ''
  });

  let overrideForm: OverrideForm = createOverrideForm();

  $: alwaysKeepCategories = $settings.alwaysKeepCategories ?? [];
  $: overrideMap = $itemOverrides;
  $: filteredItems =
    itemQuery.trim().length === 0
      ? availableItems.slice(0, 8)
      : availableItems
          .filter((item) => {
            const normalized = itemQuery.toLowerCase();
            return (
              item.name.toLowerCase().includes(normalized) ||
              item.slug.toLowerCase().includes(normalized) ||
              item.id.toLowerCase().includes(normalized)
            );
          })
          .slice(0, 12);
  $: selectedItem =
    selectedItemId !== null
      ? availableItems.find((item) => item.id === selectedItemId) ?? null
      : null;
  $: appliedOverride =
    selectedItemId !== null ? overrideMap[selectedItemId] ?? null : null;

  const toggleCategory = (category: string) => {
    settings.update((current) => {
      const existing = current.alwaysKeepCategories ?? [];
      const next = existing.includes(category)
        ? existing.filter((entry) => entry !== category)
        : [...existing, category];
      return { ...current, alwaysKeepCategories: next };
    });
  };

  const selectItem = (itemId: string) => {
    const base = availableItems.find((item) => item.id === itemId) ?? null;
    const override = overrideMap[itemId] ?? null;
    selectedItemId = itemId;
    itemMessage = '';
    hydrateOverrideForm(base, override);
  };

  function hydrateOverrideForm(base?: ItemRecord | null, override?: ItemOverride | null) {
    const item =
      base ??
      (selectedItemId ? availableItems.find((entry) => entry.id === selectedItemId) ?? null : null);
    const activeOverride =
      override ??
      (selectedItemId ? overrideMap[selectedItemId] ?? null : null);
    if (!item) {
      overrideForm = createOverrideForm();
      return;
    }
    overrideForm = createOverrideForm({
      category: activeOverride?.category ?? item.category ?? '',
      rarity: activeOverride?.rarity ?? item.rarity ?? '',
      imageUrl: activeOverride?.imageUrl ?? item.imageUrl ?? '',
      notes: activeOverride?.notes ?? item.notes ?? ''
    });
  }

  const buildOverridePayload = (
    base: ItemRecord,
    currentOverride: ItemOverride | null,
    form: OverrideForm
  ): ItemOverride => {
    const payload: ItemOverride = {};

    const normalizedCategory = form.category.trim();
    const currentCategory = currentOverride?.category ?? base.category ?? '';
    if (normalizedCategory && normalizedCategory !== currentCategory) {
      payload.category = normalizedCategory;
    } else if (!normalizedCategory && currentOverride?.category) {
      payload.category = undefined;
    }

    const normalizedRarity = form.rarity.trim();
    const currentRarity = currentOverride?.rarity ?? base.rarity ?? '';
    if (normalizedRarity && normalizedRarity !== currentRarity) {
      payload.rarity = normalizedRarity;
    } else if (!normalizedRarity && currentOverride?.rarity) {
      payload.rarity = undefined;
    }

    const normalizedImage = form.imageUrl.trim();
    const currentImage = currentOverride?.imageUrl ?? base.imageUrl ?? '';
    if (normalizedImage && normalizedImage !== currentImage) {
      payload.imageUrl = normalizedImage;
    } else if (!normalizedImage && currentOverride?.imageUrl) {
      payload.imageUrl = undefined;
    }

    const normalizedNotes = form.notes.trim();
    const currentNotes = currentOverride?.notes ?? base.notes ?? '';
    if (normalizedNotes && normalizedNotes !== currentNotes) {
      payload.notes = normalizedNotes;
    } else if (!normalizedNotes && currentOverride?.notes) {
      payload.notes = undefined;
    }

    return payload;
  };

  const saveOverrides = () => {
    if (!selectedItem) return;
    const payload = buildOverridePayload(selectedItem, appliedOverride, overrideForm);
    itemOverrides.upsert(selectedItem.id, payload);
    itemMessage = 'Overrides saved locally.';
  };

  const clearOverrides = () => {
    if (!selectedItemId) return;
    if (overrideMap[selectedItemId]) {
      itemOverrides.remove(selectedItemId);
      itemMessage = 'Overrides cleared.';
    }
    hydrateOverrideForm();
  };
</script>

<article class="space-y-6">
  <header class="space-y-2">
    <h2 class="text-xl font-semibold text-white">Import pipeline status</h2>
    <p class="text-sm text-slate-400">
      Review staged batches, trigger reruns, and gate promotions. Approval actions require the shared
      admin token configured in deployment.
    </p>
  </header>

  {#if form?.output}
    <div class="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      <p class="font-semibold">Command response</p>
      <pre class="mt-2 whitespace-pre-wrap text-xs text-emerald-100">{form.output}</pre>
    </div>
  {/if}

  {#if form?.message}
    <div class="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {form.message}
    </div>
  {/if}

  <table class="w-full table-fixed border-separate border-spacing-y-2 text-sm text-slate-200">
    <thead>
      <tr class="text-xs uppercase tracking-widest text-slate-500">
        <th class="rounded-l-xl bg-slate-900/70 px-3 py-2 text-left">Pass</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Batches</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Records</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Last run</th>
        <th class="bg-slate-900/70 px-3 py-2 text-left">Approved</th>
        <th class="rounded-r-xl bg-slate-900/70 px-3 py-2 text-left">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each passEntries as [key, pass]}
        <tr class="rounded-xl bg-slate-900/50">
          <td class="rounded-l-xl px-3 py-2 font-semibold text-white">{pass.label}</td>
          <td class="px-3 py-2">{pass.batches}</td>
          <td class="px-3 py-2">{pass.records}</td>
          <td class="px-3 py-2 text-slate-400">{pass.lastRunAt ?? '—'}</td>
          <td class="px-3 py-2">
            <span class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${pass.approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
              {pass.approved ? 'Approved' : 'Pending'}
            </span>
          </td>
          <td class="rounded-r-xl px-3 py-2">
            <div class="flex flex-wrap gap-2">
              <form method="POST" action="?/rerun">
                <input name="pass" type="hidden" value={key} />
                <button
                  type="submit"
                  class="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 hover:bg-slate-700"
                >
                  Rerun
                </button>
              </form>
              <form method="POST" action="?/rerun">
                <input name="pass" type="hidden" value={key} />
                <input name="approve" type="hidden" value="true" />
                <button
                  type="submit"
                  class="rounded-full bg-sky-500/20 px-3 py-1 text-xs uppercase tracking-wide text-sky-300 hover:bg-sky-500/30"
                >
                  Rerun &amp; approve
                </button>
              </form>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <section class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-200">
    <div class="flex flex-col gap-2">
      <h3 class="text-base font-semibold text-white">Always keep categories</h3>
      <p class="text-slate-400">
        Choose which loot categories should always be marked as <span class="font-semibold text-sky-200">keep</span> in the What To Do tool.
        Your selections stay local in browser storage and update the recommendations instantly.
      </p>
    </div>
    {#if availableCategories.length === 0}
      <p class="mt-4 text-xs text-slate-500">No categories detected in the current dataset.</p>
    {:else}
      <div class="mt-4 flex flex-wrap gap-2">
        {#each availableCategories as category}
          <button
            type="button"
            class={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition ${alwaysKeepCategories.includes(category) ? 'border-sky-400/80 bg-sky-500/20 text-sky-100' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'}`}
            on:click={() => toggleCategory(category)}
          >
            {category}
          </button>
        {/each}
      </div>
      <p class="mt-3 text-xs text-slate-400">
        Selected: {alwaysKeepCategories.length > 0 ? alwaysKeepCategories.join(', ') : 'none'}
      </p>
    {/if}
  </section>

  <section class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-200">
    <div class="flex flex-col gap-1">
      <h3 class="text-base font-semibold text-white">Item override editor</h3>
      <p class="text-slate-400">
        Look up a specific loot record to override its category, rarity, notes, or image locally. These
        adjustments stay in your browser storage and immediately influence recommendation sorting.
      </p>
      <p class="text-xs uppercase tracking-widest text-slate-500">Data never leaves this device.</p>
    </div>
    <div class="mt-4 grid gap-6 lg:grid-cols-[280px,1fr]">
      <div class="space-y-3">
        <label class="text-xs uppercase tracking-widest text-slate-400">
          Search
          <input
            class="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-slate-500 focus:outline-none"
            type="search"
            placeholder="Name, slug, or id"
            bind:value={itemQuery}
          />
        </label>
        <div class="max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-900/80 bg-slate-950/40 p-2">
          {#if filteredItems.length === 0}
            <p class="px-2 py-1 text-xs text-slate-500">No items match “{itemQuery}”.</p>
          {:else}
            {#each filteredItems as item}
              <button
                type="button"
                on:click={() => selectItem(item.id)}
                class={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedItemId === item.id
                    ? 'border-sky-500/60 bg-sky-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                }`}
              >
                <p class="font-semibold">{item.name}</p>
                <p class="text-xs text-slate-400">{item.category ?? 'Uncategorized'}</p>
              </button>
            {/each}
          {/if}
        </div>
      </div>
      <div class="space-y-4 rounded-2xl border border-slate-900/80 bg-slate-950/50 p-4">
        {#if !selectedItem}
          <p class="text-sm text-slate-400">Select an item to edit its local overrides.</p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2">
            <label class="space-y-1">
              <span class="text-xs uppercase tracking-widest text-slate-400">Category</span>
              <input
                class="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-slate-500 focus:outline-none"
                type="text"
                bind:value={overrideForm.category}
                placeholder={selectedItem.category ?? 'Category'}
              />
              <p class="text-[11px] text-slate-500">Original: {selectedItem.category ?? '—'}</p>
            </label>
            <label class="space-y-1">
              <span class="text-xs uppercase tracking-widest text-slate-400">Rarity</span>
              <input
                class="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-slate-500 focus:outline-none"
                type="text"
                bind:value={overrideForm.rarity}
                placeholder={selectedItem.rarity ?? 'Rarity'}
              />
              <p class="text-[11px] text-slate-500">Original: {selectedItem.rarity ?? '—'}</p>
            </label>
          </div>
          <label class="space-y-1">
            <span class="text-xs uppercase tracking-widest text-slate-400">Image URL</span>
            <input
              class="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-slate-500 focus:outline-none"
              type="url"
              bind:value={overrideForm.imageUrl}
              placeholder={selectedItem.imageUrl ?? 'https://...'}
            />
            <p class="text-[11px] text-slate-500 truncate">Original: {selectedItem.imageUrl ?? '—'}</p>
          </label>
          <label class="space-y-1">
            <span class="text-xs uppercase tracking-widest text-slate-400">Notes</span>
            <textarea
              class="h-28 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-slate-500 focus:outline-none"
              bind:value={overrideForm.notes}
              placeholder={selectedItem.notes ?? 'Local note override'}
            ></textarea>
            <p class="text-[11px] text-slate-500">Original: {selectedItem.notes ?? '—'}</p>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-full bg-sky-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-200 hover:bg-sky-500/30"
              on:click={saveOverrides}
            >
              Save overrides
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 hover:border-slate-500"
              on:click={clearOverrides}
            >
              Revert overrides
            </button>
            {#if appliedOverride}
              <span class="rounded-full border border-emerald-500/40 px-3 py-1 text-[11px] uppercase tracking-widest text-emerald-200">
                Override active
              </span>
            {/if}
          </div>
          {#if itemMessage}
            <p class="text-xs text-emerald-300">{itemMessage}</p>
          {/if}
        {/if}
      </div>
    </div>
  </section>

  <details class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-300">
    <summary class="cursor-pointer text-sm font-semibold text-white">Batch breakdown</summary>
    <div class="mt-3 grid gap-4 sm:grid-cols-2">
      {#each Object.entries(data.stages) as [stage, batches]}
        <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 class="text-xs uppercase tracking-widest text-slate-400">{stage}</h3>
          <ul class="mt-2 space-y-2 text-xs text-slate-300">
            {#if batches.length === 0}
              <li>No batches staged.</li>
            {:else}
              {#each batches as batch}
                <li>{batch.file} — {batch.count} records</li>
              {/each}
            {/if}
          </ul>
        </div>
      {/each}
    </div>
  </details>

  <section class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-200">
    <div class="flex flex-col gap-2">
      <h3 class="text-base font-semibold text-white">Stage record inspector</h3>
      <p class="text-slate-400">
        Peek inside each staged batch to confirm the wiki loot rows, enrichment metadata, and quest payloads
        before promoting them downstream.
      </p>
    </div>
    <div class="mt-4 space-y-4">
      {#each stageInspectorEntries as [stage, batches], index}
        <details class="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4" open={index === 0}>
          <summary class="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-white">
            <span>{stageLabelMap[stage] ?? stage}</span>
            <span class="text-xs font-normal uppercase tracking-wide text-slate-400">
              {batchCount(batches)} record{batchCount(batches) === 1 ? '' : 's'}
            </span>
          </summary>
          {#if batches.length === 0}
            <p class="mt-3 text-xs text-slate-400">No batches staged yet.</p>
          {:else}
            <div class="mt-3 space-y-3">
              {#each batches as batch}
                <details class="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                  <summary class="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                    <span>{batch.file}</span>
                    <span>{batch.count} record{batch.count === 1 ? '' : 's'}</span>
                  </summary>
                  <div class="mt-3 space-y-3">
                    {#each batch.records as record, recordIndex (record.id ?? record?.data?.id ?? `${batch.file}-${recordIndex}`)}
                      <div class="space-y-2 rounded-lg border border-slate-800/70 bg-slate-950/50 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <span class="font-semibold text-white">{labelRecord(record, recordIndex)}</span>
                          {#if record?.id}
                            <span class="rounded-full border border-slate-700/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                              {record.id}
                            </span>
                          {/if}
                        </div>
                        <pre class="max-h-64 overflow-auto rounded-lg bg-slate-900/80 p-3 text-[11px] leading-5 text-slate-200">{JSON.stringify(record, null, 2)}</pre>
                      </div>
                    {/each}
                  </div>
                </details>
              {/each}
            </div>
          {/if}
        </details>
      {/each}
    </div>
  </section>

  <section class="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-200">
    <h3 class="text-base font-semibold text-white">Approval gate</h3>
    <p class="mt-2 text-slate-400">
      Require the shared admin token before toggling approval flags. This prevents accidental
      promotion of partial data.
    </p>
    <form class="mt-4 grid gap-3 sm:grid-cols-[200px,1fr,auto]" method="POST" action="?/approve">
      <select name="pass" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
        {#each passEntries as [key, pass]}
          <option value={key}>{pass.label}</option>
        {/each}
      </select>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="token"
          type="password"
          placeholder="Approval token"
          required
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <select
          name="approved"
          class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="true">Approve</option>
          <option value="false">Revoke approval</option>
        </select>
      </div>
      <button
        type="submit"
        class="rounded-full bg-emerald-500/20 px-4 py-2 text-xs uppercase tracking-wide text-emerald-300 hover:bg-emerald-500/30"
      >
        Update
      </button>
    </form>
  </section>

  <form method="POST" action="?/finalize" class="flex justify-end">
    <button
      type="submit"
      class="rounded-full bg-emerald-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/30"
    >
      Run Finalize (Pass F)
    </button>
  </form>
</article>
