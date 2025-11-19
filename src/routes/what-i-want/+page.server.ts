import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async () => {
  const { items = [], workbenchUpgrades = [] } = await loadCanonicalData({ items: true, upgrades: true });

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
