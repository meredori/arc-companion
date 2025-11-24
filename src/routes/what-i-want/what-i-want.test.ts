import { beforeEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import Page from './+page.svelte';
import { blueprints, hydrateFromCanonical, wantList } from '$lib/stores/app';
import type { ItemRecord, UpgradePack } from '$lib/types';

const BASE_ITEM: ItemRecord = {
  id: 'wishlist-item',
  name: 'Wishlist Item',
  slug: 'wishlist-item',
  category: 'Quick Use',
  sell: 100,
  salvagesInto: []
};

const BLUEPRINT_ITEM: ItemRecord = {
  id: 'wishlist-item-blueprint',
  name: 'Wishlist Item Blueprint',
  slug: 'wishlist-item-blueprint',
  category: 'Blueprint',
  sell: 0,
  salvagesInto: []
};

const UPGRADE: UpgradePack = {
  id: 'upgrade-1',
  name: 'Workbench Mk I',
  bench: 'Workbench',
  level: 1,
  items: []
};

const OWNED_ITEM: ItemRecord = {
  id: 'owned-item',
  name: 'Owned Item',
  slug: 'owned-item',
  category: 'Quick Use',
  sell: 100,
  salvagesInto: []
};

const OWNED_BLUEPRINT: ItemRecord = {
  id: 'owned-item-blueprint',
  name: 'Owned Item Blueprint',
  slug: 'owned-item-blueprint',
  category: 'Blueprint',
  sell: 0,
  salvagesInto: []
};

const MISSING_ITEM: ItemRecord = {
  id: 'missing-item',
  name: 'Missing Item',
  slug: 'missing-item',
  category: 'Quick Use',
  sell: 50,
  salvagesInto: []
};

const MISSING_BLUEPRINT: ItemRecord = {
  id: 'missing-item-blueprint',
  name: 'Missing Item Blueprint',
  slug: 'missing-item-blueprint',
  category: 'Blueprint',
  sell: 0,
  salvagesInto: []
};

const UNKNOWN_ITEM: ItemRecord = {
  id: 'unknown-item',
  name: 'Unknown Item',
  slug: 'unknown-item',
  category: 'Quick Use',
  sell: 25,
  salvagesInto: []
};

describe('what-i-want page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    wantList.clear();
    blueprints.reset();
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
          workbenchUpgrades: [UPGRADE],
          quests: [],
          projects: []
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

  it('does not render blueprint recipe links for craftable items', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = new Page({
      target,
      props: {
        data: {
          items: [BASE_ITEM, BLUEPRINT_ITEM],
          blueprints: [BLUEPRINT_ITEM],
          workbenchUpgrades: [UPGRADE],
          quests: [],
          projects: []
        },
        form: undefined,
        params: {}
      }
    });

    await tick();

    const link = target.querySelector('a[href*="/what-i-have#"]');
    expect(link).toBeNull();

    component.$destroy();
  });

  it('treats unknown blueprints as owned while missing filters still exclude them', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    hydrateFromCanonical({
      blueprints: [
        { id: OWNED_BLUEPRINT.id, name: OWNED_BLUEPRINT.name, slug: OWNED_BLUEPRINT.slug, owned: false },
        { id: MISSING_BLUEPRINT.id, name: MISSING_BLUEPRINT.name, slug: MISSING_BLUEPRINT.slug, owned: false }
      ]
    });

    const component = new Page({
      target,
      props: {
        data: {
          items: [OWNED_ITEM, MISSING_ITEM, UNKNOWN_ITEM, OWNED_BLUEPRINT, MISSING_BLUEPRINT],
          blueprints: [OWNED_BLUEPRINT, MISSING_BLUEPRINT],
          workbenchUpgrades: [UPGRADE],
          quests: [],
          projects: []
        },
        form: undefined,
        params: {}
      }
    });

    await tick();

    blueprints.toggle(OWNED_BLUEPRINT.id);
    await tick();

    const blueprintSelect = Array.from(target.querySelectorAll('label'))
      .find((label) => label.textContent?.includes('Blueprint'))
      ?.querySelector('select') as HTMLSelectElement;
    expect(blueprintSelect).toBeTruthy();
    blueprintSelect.value = 'owned';
    blueprintSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    const getItemNames = () =>
      Array.from(target.querySelectorAll('li .text-base'))
        .map((node) => node.textContent?.trim() ?? '')
        .filter(Boolean);

    const ownedView = getItemNames();
    expect(ownedView.some((text) => text.includes('Owned Item'))).toBe(true);
    expect(ownedView.some((text) => text.includes('Unknown Item'))).toBe(true);
    expect(ownedView.some((text) => text.includes('Missing Item'))).toBe(false);

    blueprintSelect.value = 'missing';
    blueprintSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    const missingView = getItemNames();
    expect(missingView.some((text) => text.includes('Missing Item'))).toBe(true);
    expect(missingView.some((text) => text.includes('Owned Item'))).toBe(false);
    expect(missingView.some((text) => text.includes('Unknown Item'))).toBe(false);

    component.$destroy();
  });
});
