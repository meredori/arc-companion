import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const staticRoot = path.resolve('static');

export const readJsonFileIfExists = <T>(relativePath: string): T | null => {
  const absolute = path.join(staticRoot, relativePath);
  try {
    return JSON.parse(readFileSync(absolute, 'utf-8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const readJsonDirectory = <T>(relativeDir: string): T[] => {
  const directory = path.join(staticRoot, relativeDir);
  try {
    return readdirSync(directory)
      .filter((file) => file.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => JSON.parse(readFileSync(path.join(directory, file), 'utf-8')) as T);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

export const loadRawCollection = <T>(directory: string, legacyPaths: string[] = []) => {
  const fromDirectory = readJsonDirectory<T>(directory);
  if (fromDirectory.length > 0) {
    return fromDirectory;
  }

  for (const legacyPath of legacyPaths) {
    const legacy = readJsonFileIfExists<T[]>(legacyPath);
    if (legacy && legacy.length > 0) {
      return legacy;
    }
  }

  return [];
};
