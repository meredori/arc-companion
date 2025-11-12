import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { expandWantList, lastRemovedRun, runs, settings } from './app';
import type { ItemRecord, WantListEntry } from '$lib/types';

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

describe('settings store', () => {
  it('toggles ignored want categories case-insensitively', () => {
    settings.reset();
    settings.toggleIgnoredWantCategory('Ammo');
    expect(get(settings).ignoredWantCategories).toEqual(['Ammo']);
    settings.toggleIgnoredWantCategory('ammo');
    expect(get(settings).ignoredWantCategories).toHaveLength(0);
    settings.reset();
  });

  it('sets ignored categories uniquely', () => {
    settings.reset();
    settings.setIgnoredWantCategories(['Ammo', 'ammo', 'Tools']);
    expect(get(settings).ignoredWantCategories).toEqual(['Ammo', 'Tools']);
    settings.reset();
  });
});

describe('expandWantList', () => {
  const baseItems: ItemRecord[] = [
    {
      id: 'widget',
      name: 'Widget',
      slug: 'widget',
      category: 'Craftable',
      sell: 0,
      recycle: [],
      provenance: {
        wiki: false,
        api: false
      },
      craftsFrom: [
        {
          itemId: 'screw',
          name: 'Screw',
          qty: 2
        }
      ],
      needsTotals: { quests: 0, workshop: 0 }
    },
    {
      id: 'screw',
      name: 'Screw',
      slug: 'screw',
      category: 'Hardware',
      sell: 0,
      recycle: [],
      provenance: {
        wiki: false,
        api: false
      },
      needsTotals: { quests: 0, workshop: 0 }
    },
    {
      id: 'junk',
      name: 'Discarded Junk',
      slug: 'junk',
      category: 'Hardware',
      sell: 0,
      recycle: [
        {
          itemId: 'screw',
          name: 'Screw',
          qty: 1
        }
      ],
      provenance: {
        wiki: false,
        api: false
      },
      needsTotals: { quests: 0, workshop: 0 }
    }
  ];

  const wantEntries: WantListEntry[] = [
    {
      itemId: 'widget',
      qty: 1,
      createdAt: iso()
    }
  ];

  it('includes dependencies when no categories are ignored', () => {
    const expanded = expandWantList(wantEntries, baseItems);
    expect(expanded[0].requirements.some((req) => req.itemId === 'screw')).toBe(true);
    expect(expanded[0].materials.some((material) => material.sourceItemId === 'junk')).toBe(true);
  });

  it('omits ignored categories from dependencies and materials', () => {
    const expanded = expandWantList(wantEntries, baseItems, {
      ignoredCategories: ['Hardware']
    });
    expect(expanded[0].requirements).toHaveLength(0);
    expect(expanded[0].materials).toHaveLength(0);
  });
});
