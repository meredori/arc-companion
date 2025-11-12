import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import type {
  AppSettings,
  BlueprintState,
  ItemRecord,
  ItemOverride,
  ProjectProgressState,
  QuestProgress,
  RunHistoryState,
  RunLogEntry,
  WantListEntry,
  WantListMaterialLink,
  WantListProductLink,
  WantListResolvedEntry,
  WantListRequirement,
  WorkbenchUpgradeState
} from '$lib/types';
import { loadFromStorage, removeFromStorage, saveToStorage } from '$lib/persist';

const STORAGE_VERSION = 'v1';
const STORAGE_KEYS = {
  quests: `quests:${STORAGE_VERSION}`,
  blueprints: `blueprints:${STORAGE_VERSION}`,
  runs: `runs:${STORAGE_VERSION}`,
  settings: `settings:${STORAGE_VERSION}`,
  itemOverrides: `item-overrides:${STORAGE_VERSION}`,
  projects: `projects:${STORAGE_VERSION}`,
  workbenchUpgrades: `workbench-upgrades:${STORAGE_VERSION}`,
  wantList: `want-list:${STORAGE_VERSION}`
} as const;

const DEBOUNCE_MS = 3000;

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createPersistentStore<T>(key: string, initialValue: T) {
  const store = writable<T>(initialValue);
  let hydrated = !browser;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  const schedulePersist = (value: T) => {
    if (!browser) return;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      saveToStorage(key, value);
    }, DEBOUNCE_MS);
  };

  if (browser) {
    const stored = loadFromStorage<T>(key, initialValue);
    hydrated = true;
    store.set(stored);
    store.subscribe((value) => {
      if (!hydrated) return;
      schedulePersist(value);
    });
  }

  return {
    subscribe: store.subscribe,
    set(value: T) {
      hydrated = true;
      store.set(value);
      schedulePersist(value);
    },
    update(updater: (value: T) => T) {
      hydrated = true;
      store.update((current) => {
        const next = updater(current);
        schedulePersist(next);
        return next;
      });
    },
    reset() {
      hydrated = true;
      store.set(initialValue);
      removeFromStorage(key);
    }
  };
}

const defaultSettings: AppSettings = {
  freeLoadoutDefault: false,
  showExperimental: false,
  approvalsEnabled: false,
  approvalToken: undefined,
  alwaysKeepCategories: []
};

const questStore = createPersistentStore<QuestProgress[]>(STORAGE_KEYS.quests, []);
const blueprintStore = createPersistentStore<BlueprintState[]>(STORAGE_KEYS.blueprints, []);
const runStore = createPersistentStore<RunHistoryState>(STORAGE_KEYS.runs, {
  entries: [],
  lastRemoved: null
});
const settingsStore = createPersistentStore<AppSettings>(STORAGE_KEYS.settings, defaultSettings);
const itemOverrideStore = createPersistentStore<Record<string, ItemOverride>>(
  STORAGE_KEYS.itemOverrides,
  {}
);
const projectProgressStore = createPersistentStore<ProjectProgressState>(STORAGE_KEYS.projects, {});
const workbenchUpgradeStore = createPersistentStore<WorkbenchUpgradeState[]>(
  STORAGE_KEYS.workbenchUpgrades,
  []
);
const wantListStore = createPersistentStore<WantListEntry[]>(STORAGE_KEYS.wantList, []);

type MaterialAccumulator = {
  materialId: string;
  materialName: string;
  requiredQty: number;
  producedPerSource: number;
  sourceItemId: string;
  sourceName: string;
  kind: WantListMaterialLink['kind'];
  sourcesNeededOverride?: number;
};

function sanitizeReason(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function collectRequirements(
  item: ItemRecord | undefined,
  multiplier: number,
  depth: number,
  itemLookup: Map<string, ItemRecord>,
  visited: Set<string>,
  acc: Map<string, WantListRequirement>
) {
  if (!item || !item.craftsFrom || item.craftsFrom.length === 0) {
    return;
  }

  for (const requirement of item.craftsFrom) {
    const totalQty = requirement.qty * multiplier;
    const existing = acc.get(requirement.itemId);
    if (existing) {
      existing.qty += totalQty;
      existing.depth = Math.min(existing.depth, depth);
    } else {
      acc.set(requirement.itemId, {
        itemId: requirement.itemId,
        name: requirement.name ?? requirement.itemId,
        qty: totalQty,
        depth
      });
    }

    if (visited.has(requirement.itemId)) {
      continue;
    }

    const next = itemLookup.get(requirement.itemId);
    if (!next) {
      continue;
    }
    visited.add(requirement.itemId);
    collectRequirements(next, totalQty, depth + 1, itemLookup, visited, acc);
    visited.delete(requirement.itemId);
  }
}

export function expandWantList(
  entries: WantListEntry[],
  items: ItemRecord[]
): WantListResolvedEntry[] {
  const itemLookup = new Map(items.map((item) => [item.id, item] as const));
  const producersByProduct = new Map<string, { item: ItemRecord; product: WantListProductLink }[]>();
  const recyclersByMaterial = new Map<string, { item: ItemRecord; qty: number; name: string }[]>();

  for (const item of items) {
    for (const product of item.craftsInto ?? []) {
      const entry = {
        itemId: product.productId,
        name: product.productName ?? product.productId,
        qty: product.qty ?? 1
      } satisfies WantListProductLink;
      const bucket = producersByProduct.get(product.productId) ?? [];
      bucket.push({ item, product: entry });
      producersByProduct.set(product.productId, bucket);
    }

    for (const recycle of item.recycle ?? []) {
      if (!recycle || recycle.qty <= 0) continue;
      const bucket = recyclersByMaterial.get(recycle.itemId) ?? [];
      bucket.push({ item, qty: recycle.qty, name: recycle.name ?? recycle.itemId });
      recyclersByMaterial.set(recycle.itemId, bucket);
    }
  }

  return entries.map<WantListResolvedEntry>((entry) => {
    const item = itemLookup.get(entry.itemId);
    const requirementMap = new Map<string, WantListRequirement>();
    if (item) {
      collectRequirements(item, entry.qty, 1, itemLookup, new Set([item.id]), requirementMap);
    }
    const requirements = [...requirementMap.values()].sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const products = item
      ? (producersByProduct.get(item.id) ?? []).map(({ item: producer, product }) => ({
          itemId: producer.id,
          name: producer.name,
          qty: product.qty * entry.qty
        }))
      : [];

    const materialMap = new Map<string, MaterialAccumulator>();

    if (item) {
      for (const recycle of item.recycle ?? []) {
        if (!recycle || recycle.qty <= 0) continue;
        const key = `${item.id}::${recycle.itemId}::yield`;
        materialMap.set(key, {
          materialId: recycle.itemId,
          materialName: recycle.name ?? recycle.itemId,
          requiredQty: recycle.qty * entry.qty,
          producedPerSource: recycle.qty,
          sourceItemId: item.id,
          sourceName: item.name,
          kind: 'yield',
          sourcesNeededOverride: entry.qty
        });
      }
    }

    for (const requirement of requirements) {
      const recyclers = recyclersByMaterial.get(requirement.itemId) ?? [];
      for (const recycler of recyclers) {
        if (recycler.qty <= 0) continue;
        const key = `${recycler.item.id}::${requirement.itemId}::satisfies`;
        const existing = materialMap.get(key);
        const requiredQty = (existing?.requiredQty ?? 0) + requirement.qty;
        materialMap.set(key, {
          materialId: requirement.itemId,
          materialName: requirement.name,
          requiredQty,
          producedPerSource: recycler.qty,
          sourceItemId: recycler.item.id,
          sourceName: recycler.item.name,
          kind: 'satisfies'
        });
      }
    }

    const materials: WantListMaterialLink[] = [...materialMap.values()].map((value) => {
      const { producedPerSource } = value;
      const sourcesNeeded = value.sourcesNeededOverride
        ? value.sourcesNeededOverride
        : producedPerSource > 0
          ? Math.max(1, Math.ceil(value.requiredQty / producedPerSource))
          : 0;
      const producedQty = producedPerSource * sourcesNeeded;
      return {
        materialId: value.materialId,
        materialName: value.materialName,
        requiredQty: value.requiredQty,
        producedQty,
        sourcesNeeded,
        sourceItemId: value.sourceItemId,
        sourceName: value.sourceName,
        kind: value.kind
      } satisfies WantListMaterialLink;
    });

    materials.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'satisfies' ? -1 : 1;
      }
      if (a.materialName !== b.materialName) {
        return a.materialName.localeCompare(b.materialName, undefined, { sensitivity: 'base' });
      }
      return a.sourceName.localeCompare(b.sourceName, undefined, { sensitivity: 'base' });
    });

    products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return {
      entry,
      item,
      requirements,
      products,
      materials
    } satisfies WantListResolvedEntry;
  });
}

function pruneOverride(override: ItemOverride | undefined): ItemOverride | null {
  if (!override) return null;
  const next: ItemOverride = {};
  if (typeof override.category === 'string' && override.category.trim()) {
    next.category = override.category.trim();
  }
  if (typeof override.rarity === 'string' && override.rarity.trim()) {
    next.rarity = override.rarity.trim();
  }
  if (typeof override.imageUrl === 'string' && override.imageUrl.trim()) {
    next.imageUrl = override.imageUrl.trim();
  }
  if (typeof override.notes === 'string' && override.notes.trim()) {
    next.notes = override.notes.trim();
  }
  return Object.keys(next).length > 0 ? next : null;
}

export const quests = {
  subscribe: questStore.subscribe,
  toggle(id: string) {
    questStore.update((records) =>
      records.map((quest) => (quest.id === id ? { ...quest, completed: !quest.completed } : quest))
    );
  },
  upsert(progress: QuestProgress) {
    questStore.update((records) => {
      const exists = records.some((item) => item.id === progress.id);
      if (exists) {
        return records.map((item) => (item.id === progress.id ? { ...item, ...progress } : item));
      }
      return [...records, progress];
    });
  },
  remove(id: string) {
    questStore.update((records) => records.filter((item) => item.id !== id));
  },
  reset: questStore.reset
};

export const blueprints = {
  subscribe: blueprintStore.subscribe,
  toggle(id: string) {
    blueprintStore.update((records) =>
      records.map((bp) => (bp.id === id ? { ...bp, owned: !bp.owned } : bp))
    );
  },
  upsert(blueprint: BlueprintState) {
    blueprintStore.update((records) => {
      const exists = records.some((item) => item.id === blueprint.id);
      if (exists) {
        return records.map((item) => (item.id === blueprint.id ? { ...item, ...blueprint } : item));
      }
      return [...records, blueprint];
    });
  },
  reset: blueprintStore.reset
};

export const workbenchUpgrades = {
  subscribe: workbenchUpgradeStore.subscribe,
  toggle(id: string) {
    workbenchUpgradeStore.update((records) =>
      records.map((upgrade) => (upgrade.id === id ? { ...upgrade, owned: !upgrade.owned } : upgrade))
    );
  },
  upsert(upgrade: WorkbenchUpgradeState) {
    workbenchUpgradeStore.update((records) => {
      const exists = records.some((item) => item.id === upgrade.id);
      if (exists) {
        return records.map((item) => (item.id === upgrade.id ? { ...item, ...upgrade } : item));
      }
      return [...records, upgrade];
    });
  },
  reset: workbenchUpgradeStore.reset
};

function sortRuns(entries: RunLogEntry[]) {
  return [...entries].sort((a, b) => {
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
}

export const runs = {
  subscribe: derived(runStore, (state) => sortRuns(state.entries)).subscribe,
  add(entry: Partial<RunLogEntry>) {
    const payload: RunLogEntry = {
      id: entry.id ?? randomId('run'),
      startedAt: entry.startedAt ?? nowIso(),
      endedAt: entry.endedAt,
      totalXp: entry.totalXp,
      totalValue: entry.totalValue,
      extractedValue: entry.extractedValue,
      deaths: entry.deaths,
      notes: entry.notes,
      freeLoadout: entry.freeLoadout,
      crew: entry.crew
    };

    runStore.update((state) => ({
      entries: sortRuns([...state.entries, payload]),
      lastRemoved: null
    }));
  },
  updateEntry(id: string, updates: Partial<RunLogEntry>) {
    runStore.update((state) => ({
      ...state,
      entries: sortRuns(
        state.entries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
      )
    }));
  },
  remove(id: string) {
    runStore.update((state) => {
      const target = state.entries.find((entry) => entry.id === id);
      if (!target) {
        return state;
      }
      return {
        entries: state.entries.filter((entry) => entry.id !== id),
        lastRemoved: { ...target, removedAt: nowIso() }
      };
    });
  },
  restoreLast() {
    runStore.update((state) => {
      if (!state.lastRemoved) {
        return state;
      }
      const { removedAt: _removedAt, ...entry } = state.lastRemoved;
      void _removedAt;
      return {
        entries: sortRuns([...state.entries, entry]),
        lastRemoved: null
      };
    });
  },
  clear() {
    runStore.reset();
  }
};

export const runHistory = runStore;
export const recentRuns = derived(runStore, (state) => sortRuns(state.entries).slice(0, 5));
export const lastRemovedRun = derived(runStore, (state) => state.lastRemoved ?? null);
export const settings = settingsStore;
export const itemOverrides = {
  subscribe: itemOverrideStore.subscribe,
  upsert(id: string, override: ItemOverride) {
    itemOverrideStore.update((map) => {
      const current = map[id] ?? {};
      const merged = { ...current, ...override };
      const cleaned = pruneOverride(merged);
      if (!cleaned) {
        if (!map[id]) return map;
        const next = { ...map };
        delete next[id];
        return next;
      }
      return { ...map, [id]: cleaned };
    });
  },
  remove(id: string) {
    itemOverrideStore.update((map) => {
      if (!map[id]) return map;
      const next = { ...map };
      delete next[id];
      return next;
    });
  },
  reset: itemOverrideStore.reset
};

export const wantList = {
  subscribe: wantListStore.subscribe,
  add(payload: { itemId: string; qty?: number; reason?: string }) {
    const qty = Math.max(1, payload.qty ?? 1);
    const reason = sanitizeReason(payload.reason);
    wantListStore.update((entries) => {
      const existing = entries.find((entry) => entry.itemId === payload.itemId);
      if (existing) {
        return entries.map((entry) =>
          entry.itemId === payload.itemId
            ? {
                ...entry,
                qty: entry.qty + qty,
                reason: reason ?? entry.reason
              }
            : entry
        );
      }
      const createdAt = new Date().toISOString();
      const next: WantListEntry = {
        itemId: payload.itemId,
        qty,
        reason,
        createdAt
      };
      return [...entries, next];
    });
  },
  update(itemId: string, updates: Partial<Omit<WantListEntry, 'itemId'>>) {
    wantListStore.update((entries) =>
      entries
        .map((entry) => {
          if (entry.itemId !== itemId) return entry;
          const next: WantListEntry = {
            ...entry,
            ...updates,
            qty:
              updates.qty !== undefined
                ? Math.max(0, Math.floor(updates.qty))
                : entry.qty,
            reason: updates.reason !== undefined ? sanitizeReason(updates.reason) : entry.reason,
            createdAt: updates.createdAt ?? entry.createdAt
          };
          return next;
        })
        .filter((entry) => entry.qty > 0)
    );
  },
  remove(itemId: string) {
    wantListStore.update((entries) => entries.filter((entry) => entry.itemId !== itemId));
  },
  clear() {
    wantListStore.reset();
  },
  expand(items: ItemRecord[]) {
    return expandWantList(get(wantListStore), items);
  }
};

export const projectProgress = {
  subscribe: projectProgressStore.subscribe,
  setContribution(projectId: string, phaseId: string, itemId: string, qty: number) {
    const normalizedQty = Math.max(0, qty);
    projectProgressStore.update((state) => {
      const next: ProjectProgressState = { ...state };
      const projectEntry = { ...(next[projectId] ?? {}) };
      const phaseEntry = { ...(projectEntry[phaseId] ?? {}) };
      if (normalizedQty === 0) {
        delete phaseEntry[itemId];
      } else {
        phaseEntry[itemId] = normalizedQty;
      }
      if (Object.keys(phaseEntry).length === 0) {
        delete projectEntry[phaseId];
      } else {
        projectEntry[phaseId] = phaseEntry;
      }
      if (Object.keys(projectEntry).length === 0) {
        delete next[projectId];
      } else {
        next[projectId] = projectEntry;
      }
      return next;
    });
  },
  clearPhase(projectId: string, phaseId: string) {
    projectProgressStore.update((state) => {
      const next: ProjectProgressState = { ...state };
      if (!next[projectId]) return next;
      const projectEntry = { ...next[projectId] };
      if (projectEntry[phaseId]) {
        delete projectEntry[phaseId];
      }
      if (Object.keys(projectEntry).length === 0) {
        delete next[projectId];
      } else {
        next[projectId] = projectEntry;
      }
      return next;
    });
  },
  reset: projectProgressStore.reset
};

export function resetAllStores() {
  quests.reset();
  blueprints.reset();
  workbenchUpgrades.reset();
  runs.clear();
  settings.reset();
  itemOverrides.reset();
  projectProgress.reset();
  wantList.clear();
}

export function hydrateFromCanonical(params: {
  quests?: QuestProgress[];
  workbenchUpgrades?: WorkbenchUpgradeState[];
  blueprints?: BlueprintState[];
}) {
  const { quests: questsData = [], workbenchUpgrades: workbenchData = [], blueprints: blueprintData = [] } =
    params;

  const existingQuests = get(questStore);
  if (existingQuests.length === 0 && questsData.length > 0) {
    questStore.set(questsData);
  }

  const existingWorkbench = get(workbenchUpgradeStore);
  if (existingWorkbench.length === 0 && workbenchData.length > 0) {
    workbenchUpgradeStore.set(workbenchData);
  }

  const existingBlueprints = get(blueprintStore);
  if (existingBlueprints.length === 0 && blueprintData.length > 0) {
    blueprintStore.set(blueprintData);
  }
}
