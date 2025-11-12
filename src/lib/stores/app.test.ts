import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { lastRemovedRun, runs } from './app';

const iso = () => new Date().toISOString();

describe('run history store', () => {
  it('adds, edits, deletes, and restores runs', () => {
    runs.clear();
    runs.add({ id: 'test-run', startedAt: iso(), endedAt: iso(), totalXp: 120, totalValue: 300 });

    let entries = get(runs);
    expect(entries).toHaveLength(1);
    expect(entries[0].totalXp).toBe(120);

    runs.updateEntry('test-run', { totalXp: 200, notes: 'updated' });
    entries = get(runs);
    expect(entries[0].totalXp).toBe(200);
    expect(entries[0].notes).toBe('updated');

    runs.remove('test-run');
    expect(get(runs)).toHaveLength(0);
    expect(get(lastRemovedRun)?.id).toBe('test-run');

    runs.restoreLast();
    entries = get(runs);
    expect(entries).toHaveLength(1);
    expect(entries[0].notes).toBe('updated');
  });
});
