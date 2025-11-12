import { beforeEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import Page from './+page.svelte';
import { wantList } from '$lib/stores/app';
import type { ItemRecord, UpgradePack } from '$lib/types';

const BASE_ITEM: ItemRecord = {
  id: 'wishlist-item',
  name: 'Wishlist Item',
  slug: 'wishlist-item',
  category: 'Quick Use',
  sell: 100,
  recycle: [],
  needsTotals: { quests: 0, workshop: 0 },
  provenance: { wiki: true, api: true }
};

const UPGRADE: UpgradePack = {
  id: 'upgrade-1',
  name: 'Workbench Mk I',
  bench: 'Workbench',
  level: 1,
  items: []
};

describe('what-i-want page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    wantList.clear();
  });

  it('renders items and allows adding them to the wishlist', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = new Page({
      target,
      props: {
        data: {
          items: [BASE_ITEM],
          blueprints: [],
          workbenchUpgrades: [UPGRADE]
        },
        form: undefined,
        params: {}
      }
    });

    await tick();

    const addButton = target.querySelector('button');
    expect(addButton?.textContent).toContain('Add');

    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();

    expect(addButton?.textContent).toContain('Added');
    expect(target.textContent).toContain('Wishlist entries');

    component.$destroy();
  });
});
