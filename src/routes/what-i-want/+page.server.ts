import { base } from '$app/paths';
import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async ({ fetch }) => {
  const { items = [], workbenchUpgrades = [] } = await loadCanonicalData(
    fetch,
    { items: true, upgrades: true },
    base
  );

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
