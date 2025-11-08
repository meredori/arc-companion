import { base } from '$app/paths';
import type { ItemRecord, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [upgradesRes, itemsRes] = await Promise.all([
    fetch(`${base}/data/upgrades.json`),
    fetch(`${base}/data/items.json`)
  ]);

  const [upgrades, items] = await Promise.all([
    upgradesRes.json() as Promise<UpgradePack[]>,
    itemsRes.json() as Promise<ItemRecord[]>
  ]);

  return { upgrades, items } satisfies { upgrades: UpgradePack[]; items: ItemRecord[] };
};
