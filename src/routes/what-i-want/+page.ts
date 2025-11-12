import { base } from '$app/paths';
import type { ItemRecord, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [itemsRes, upgradesRes] = await Promise.all([
    fetch(`${base}/data/items.json`),
    fetch(`${base}/data/workbench-upgrades.json`)
  ]);

  const [items, workbenchUpgrades] = await Promise.all([
    itemsRes.json() as Promise<ItemRecord[]>,
    upgradesRes.json() as Promise<UpgradePack[]>
  ]);

  const blueprints = items.filter((item) => item.category?.toLowerCase() === 'blueprint');

  return {
    items,
    blueprints,
    workbenchUpgrades
  } satisfies {
    items: ItemRecord[];
    blueprints: ItemRecord[];
    workbenchUpgrades: UpgradePack[];
  };
};
