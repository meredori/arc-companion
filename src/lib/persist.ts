import { browser } from '$app/environment';

const STORAGE_PREFIX = 'arc-companion:';

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!browser) {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage`, error);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (!browser) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage`, error);
  }
}

export function removeFromStorage(key: string): void {
  if (!browser) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage`, error);
  }
}
