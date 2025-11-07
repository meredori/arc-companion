import { derived, writable } from 'svelte/store';
import type { BlueprintState, ItemRecommendation, QuestProgress, RunLogEntry } from '$lib/types';
import { loadFromStorage, saveToStorage } from '$lib/persist';

const RECOMMENDATION_KEY = 'recommendations';
const QUEST_KEY = 'quests';
const BLUEPRINT_KEY = 'blueprints';
const RUNS_KEY = 'runs';

function createPersistentStore<T>(key: string, initial: T) {
  const storedValue = loadFromStorage<T>(key, initial);
  const store = writable<T>(storedValue);

  store.subscribe((value) => saveToStorage(key, value));

  return store;
}

export const recommendations = createPersistentStore<ItemRecommendation[]>(RECOMMENDATION_KEY, []);
export const quests = createPersistentStore<QuestProgress[]>(QUEST_KEY, []);
export const blueprints = createPersistentStore<BlueprintState[]>(BLUEPRINT_KEY, []);
export const runs = createPersistentStore<RunLogEntry[]>(RUNS_KEY, []);

export const recentRuns = derived(runs, ($runs) => $runs.slice(-5));
