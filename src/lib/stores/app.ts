import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import type {
  AppSettings,
  BlueprintState,
  ItemOverride,
  ProjectProgressState,
  QuestProgress,
  RunHistoryState,
  RunLogEntry
} from '$lib/types';
import { loadFromStorage, removeFromStorage, saveToStorage } from '$lib/persist';

const STORAGE_VERSION = 'v1';
const STORAGE_KEYS = {
  quests: `quests:${STORAGE_VERSION}`,
  blueprints: `blueprints:${STORAGE_VERSION}`,
  runs: `runs:${STORAGE_VERSION}`,
  settings: `settings:${STORAGE_VERSION}`,
  itemOverrides: `item-overrides:${STORAGE_VERSION}`,
  projects: `projects:${STORAGE_VERSION}`
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
  runs.clear();
  settings.reset();
  itemOverrides.reset();
  projectProgress.reset();
}

export function hydrateFromCanonical(questsData: QuestProgress[], blueprintData: BlueprintState[]) {
  const existingQuests = get(questStore);
  if (existingQuests.length === 0 && questsData.length > 0) {
    questStore.set(questsData);
  }

  const existingBlueprints = get(blueprintStore);
  if (existingBlueprints.length === 0 && blueprintData.length > 0) {
    blueprintStore.set(blueprintData);
  }
}
