import type { ItemRecord, Quest, UpgradePack, Vendor } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [itemsRes, questsRes, upgradesRes, vendorsRes] = await Promise.all([
    fetch('/data/items.json'),
    fetch('/data/quests.json'),
    fetch('/data/upgrades.json'),
    fetch('/data/vendors.json')
  ]);

  const [items, quests, upgrades, vendors] = await Promise.all([
    itemsRes.json() as Promise<ItemRecord[]>,
    questsRes.json() as Promise<Quest[]>,
    upgradesRes.json() as Promise<UpgradePack[]>,
    vendorsRes.json() as Promise<Vendor[]>
  ]);

  return {
    items,
    quests,
    upgrades,
    vendors
  } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    upgrades: UpgradePack[];
    vendors: Vendor[];
  };
};
