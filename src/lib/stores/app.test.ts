import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { expandWantList, hydrateFromCanonical, lastRemovedRun, quests, runs, settings } from './app';
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

  it('updates recommendation sort preference', () => {
    settings.reset();
    expect(get(settings).recommendationSort).toBe('category');
    settings.setRecommendationSort('alphabetical');
    expect(get(settings).recommendationSort).toBe('alphabetical');
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
      salvagesInto: [],
      craftsFrom: [
        {
          itemId: 'screw',
          name: 'Screw',
          qty: 2
        }
      ]
    },
    {
      id: 'screw',
      name: 'Screw',
      slug: 'screw',
      category: 'Hardware',
      sell: 0,
      salvagesInto: []
    },
    {
      id: 'junk',
      name: 'Discarded Junk',
      slug: 'junk',
      category: 'Hardware',
      sell: 0,
      salvagesInto: [
        {
          itemId: 'screw',
          name: 'Screw',
          qty: 1
        }
      ]
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

describe('quest hydration', () => {
  it('merges canonical quests and allows toggling newly added IDs', () => {
    quests.reset();
    quests.upsert({ id: 'existing-quest', completed: false });

    hydrateFromCanonical({
      quests: [
        { id: 'existing-quest', completed: false },
        { id: 'new-quest', completed: false }
      ]
    });

    quests.toggle('new-quest');
    const questState = get(quests);
    const existing = questState.find((quest) => quest.id === 'existing-quest');
    const added = questState.find((quest) => quest.id === 'new-quest');

    expect(existing?.completed).toBe(false);
    expect(added?.completed).toBe(true);

    quests.reset();
  });

  it('merges canonical properties into existing quests', () => {
    quests.reset();
    quests.upsert({ id: 'quest-1', completed: true, pinned: false, notes: 'old note' });

    hydrateFromCanonical({
      quests: [{ id: 'quest-1', completed: false, pinned: true, notes: 'new note' }]
    });

    const questState = get(quests);
    const quest = questState.find((entry) => entry.id === 'quest-1');

    expect(quest?.completed).toBe(true);
    expect(quest?.pinned).toBe(false);
    expect(quest?.notes).toBe('old note');

    quests.reset();
  });
});
