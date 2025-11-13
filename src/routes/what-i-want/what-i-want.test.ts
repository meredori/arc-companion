import { beforeEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import { base } from '$app/paths';
import Page from './+page.svelte';
import { wantList } from '$lib/stores/app';
import type { ItemRecord, UpgradePack } from '$lib/types';

const BASE_ITEM: ItemRecord = {
  id: 'wishlist-item',
  name: 'Wishlist Item',
  slug: 'wishlist-item',
  category: 'Quick Use',
  sell: 100,
  recycle: []
};

const BLUEPRINT_ITEM: ItemRecord = {
  id: 'wishlist-item-blueprint',
  name: 'Wishlist Item Blueprint',
  slug: 'wishlist-item-blueprint',
  category: 'Blueprint',
  sell: 0,
  recycle: []
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

    const addButton = target.querySelector('[data-testid="add-to-wishlist"]');
    expect(addButton?.textContent).toContain('Add');

    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();

    expect(addButton?.textContent).toContain('Added');
    expect(target.textContent).toContain('Wishlist entries');

    component.$destroy();
  });

  it('links craftable items to their blueprint recipes', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = new Page({
      target,
      props: {
        data: {
          items: [BASE_ITEM, BLUEPRINT_ITEM],
          blueprints: [BLUEPRINT_ITEM],
          workbenchUpgrades: [UPGRADE]
        },
        form: undefined,
        params: {}
      }
    });

    await tick();

    const link = target.querySelector('a[href*="/blueprints#"]');
    expect(link?.textContent).toContain('View recipe');
    const expectedHref = `${base}/blueprints#blueprint-wishlist-item-blueprint`
      .replace(/\/{2,}/g, '/')
      .replace(':/', '://');
    expect(link?.getAttribute('href')).toBe(expectedHref);

    component.$destroy();
  });
});
