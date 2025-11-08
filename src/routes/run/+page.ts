import type { ItemRecord, Quest, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [itemsRes, questsRes, upgradesRes] = await Promise.all([
    fetch('/data/items.json'),
    fetch('/data/quests.json'),
    fetch('/data/upgrades.json')
  ]);

  const [items, quests, upgrades] = await Promise.all([
    itemsRes.json() as Promise<ItemRecord[]>,
    questsRes.json() as Promise<Quest[]>,
    upgradesRes.json() as Promise<UpgradePack[]>
  ]);

  return { items, quests, upgrades } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    upgrades: UpgradePack[];
  };
};
